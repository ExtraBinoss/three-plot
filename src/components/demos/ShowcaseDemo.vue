<template>
  <div class="demo-container">
    <PlotView @ready="onPlotReady" />
    <div class="stats" v-if="stats">
      <div class="stat-group">
        <div class="stat-main">{{ fps }} <span class="unit">FPS</span> <span class="ms">({{ frameTime.toFixed(1) }}ms)</span></div>
        <div class="stat-sub">{{ params.count.toLocaleString() }} elements in scene</div>
      </div>
      <div class="stat-group profiling" v-if="gpuStats">
        <div class="stat-row"><span>Device Load:</span> <b>{{ (frameTime / 16.6 * 100).toFixed(0) }}%</b></div>
        <div class="stat-row" v-if="params.mode === 'Points'"><span>GPU Vertices:</span> <b>{{ gpuStats.points.toLocaleString() }}</b></div>
        <div class="stat-row" v-else><span>GPU Triangles:</span> <b>{{ gpuStats.triangles.toLocaleString() }}</b></div>
        <div class="stat-row"><span>Draw Calls:</span> <b>{{ gpuStats.calls }}</b></div>
      </div>
      <div class="hint">{{ params.mode }} Engine Active</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import GUI from 'lil-gui';
import PlotView from '../PlotView.vue';
import { PlotContainer, PointPlot, LinePlot, type PlotUpdateParams } from '../../plot';
import * as THREE from 'three';

const presets = ['sine', 'saw', 'zigzag', 'ramp', 'harmonic', 'chaos'];

const params = reactive<PlotUpdateParams & { preset: string, actualPoints: number, mode: 'Points' | 'Lines' }>({
  count: 1000, 
  preset: 'harmonic',
  presetIndex: 4,
  frequency: 0.05,
  amplitude: 40,
  pointSize: 1.5,
  adaptive: true,
  lodFactor: 1.0,
  color: '#00ccff',
  autoUpdate: true,
  autoSubsampling: true,
  autoCulling: true,
  pointsPerPixel: 2.0,
  actualPoints: 0,
  mode: 'Lines',
  borderColor: '#0088ff',
  borderWidth: 0.1,
  dashScale: 0.0
});

const smoothedParams = reactive({ ...params });

const lerp = (current: number, target: number, speed: number) => {
  return current + (target - current) * speed;
};

let plotContainer: PlotContainer | null = null;
let currentPlot: PointPlot | LinePlot | null = null;
let gui: GUI | null = null;
const stats = ref(true);
const fps = ref(0);
const frameTime = ref(0);
const gpuStats = ref<any>(null);
let lastTime = performance.now();
let frames = 0;

const onPlotReady = (container: PlotContainer) => {
  plotContainer = container;
  initPlot();
  
  // Set the update callback to sync with the renderer's loop
  plotContainer.onUpdate = (time) => {
    const start = performance.now();
    frames++;
    if (time >= lastTime + 1000) {
      fps.value = Math.round((frames * 1000) / (time - lastTime));
      lastTime = time;
      frames = 0;
    }

    if (currentPlot && plotContainer) {
      // Smooth out visual parameters
      const speed = 0.15; // Adjustment speed (0-1)
      smoothedParams.frequency = lerp(smoothedParams.frequency, params.frequency, speed);
      smoothedParams.amplitude = lerp(smoothedParams.amplitude, params.amplitude, speed);
      smoothedParams.pointSize = lerp(smoothedParams.pointSize!, params.pointSize!, speed);
      smoothedParams.lodFactor = lerp(smoothedParams.lodFactor!, params.lodFactor!, speed);
      smoothedParams.borderWidth = lerp(smoothedParams.borderWidth!, params.borderWidth!, speed);
      smoothedParams.dashScale = lerp(smoothedParams.dashScale!, params.dashScale!, speed);
      smoothedParams.pointsPerPixel = lerp(smoothedParams.pointsPerPixel!, params.pointsPerPixel!, speed);
      smoothedParams.presetIndex = lerp(smoothedParams.presetIndex, params.presetIndex, speed);
      
      // Sync non-smoothed/boolean parameters
      smoothedParams.count = params.count;
      smoothedParams.adaptive = params.adaptive;
      smoothedParams.autoSubsampling = params.autoSubsampling;
      smoothedParams.autoCulling = params.autoCulling;
      smoothedParams.color = params.color;
      smoothedParams.borderColor = params.borderColor;
      smoothedParams.mode = params.mode;

      const viewport = plotContainer.getViewportStats();
      const elapsed = params.autoUpdate ? time / 1000 : 0;
      currentPlot.update(elapsed, smoothedParams as any, viewport);
      
      // Update actual points drawn info
      const mesh = currentPlot.mesh;
      if (mesh instanceof THREE.Points) {
        params.actualPoints = (mesh.geometry as THREE.BufferGeometry).drawRange.count;
      } else if (mesh instanceof THREE.InstancedMesh) {
        params.actualPoints = mesh.count;
      }
      
      // Update real GPU info from renderer
      gpuStats.value = plotContainer.getRendererInfo();
    }
    frameTime.value = performance.now() - start;
  };
};

const initPlot = () => {
  if (!plotContainer) return;
  
  if (currentPlot) {
    plotContainer.scene.remove(currentPlot.mesh);
    // Dispose resources to prevent GPU memory leaks
    if (currentPlot.mesh.geometry) currentPlot.mesh.geometry.dispose();
    if (currentPlot.mesh.material) {
      if (Array.isArray(currentPlot.mesh.material)) {
        currentPlot.mesh.material.forEach(m => m.dispose());
      } else {
        currentPlot.mesh.material.dispose();
      }
    }
  }
  
  const color = new THREE.Color(params.color);
  const capacity = params.count;
  
  if (params.mode === 'Points') {
    currentPlot = new PointPlot(capacity, color);
  } else if (params.mode === 'Lines') {
    currentPlot = new LinePlot(capacity, color);
  }
  
  if (currentPlot) {
    plotContainer.scene.add(currentPlot.mesh);
  }
};

const setupGui = () => {
  gui = new GUI();
  
  const updateVisibility = () => {
    const isPoints = params.mode === 'Points';
    cullingController.show(isPoints);
    subsamplingFolder.show(isPoints);
    
    const isLines = params.mode === 'Lines';
    folderDecorative.show(isLines);
  };

  gui.add(params, 'mode', ['Points', 'Lines']).name('Rendering Mode').onChange((mode: string) => {
    if (mode === 'Lines') {
      params.autoSubsampling = false;
    }
    initPlot();
    updateVisibility();
  });

  const folderDecorative = gui.addFolder('Decorative Lines');
  folderDecorative.addColor(params, 'borderColor').name('Outline Color').onChange((val: string) => {
    const material = currentPlot?.mesh?.material as THREE.ShaderMaterial | undefined;
    if (material && material.uniforms?.uOutlineColor) {
      material.uniforms.uOutlineColor.value.set(val);
    }
  });
  folderDecorative.add(params, 'borderWidth', 0, 1, 0.01).name('Outline Width');
  folderDecorative.add(params, 'dashScale', 0, 10, 0.1).name('Dash Scale');

  const folderData = gui.addFolder('Data & Performance');
  folderData.add(params, 'count', 100, 50000000, 100).name('Total Data Points').onFinishChange(() => {
    initPlot();
  });
  
  // Folder for optimizations (Subsampling)
  const subsamplingFolder = folderData.addFolder('Data Optimizations');
  subsamplingFolder.add(params, 'autoSubsampling').name('Smart Subsampling').listen();
  subsamplingFolder.add(params, 'pointsPerPixel', 0.5, 10, 0.5).name('Density (pts/px)');
  
  const cullingController = folderData.add(params, 'autoCulling').name('Frustum Culling');
  folderData.add(params, 'actualPoints').name('Visible Elements').disable();

  const folderPlot = gui.addFolder('Plot Settings');
  folderPlot.add(params, 'preset', presets).name('Preset').onChange((val: string) => {
    params.presetIndex = presets.indexOf(val);
  });
  folderPlot.add(params, 'frequency', 0.01, 2, 0.01).name('Frequency');
  folderPlot.add(params, 'amplitude', 1, 100, 1).name('Amplitude');
  folderPlot.add(params, 'pointSize', 0.1, 10, 0.1).name('Base Point Size');
  folderPlot.add(params, 'adaptive').name('Adaptive Size');
  folderPlot.add(params, 'lodFactor', 0.01, 1.0, 0.01).name('GPU LOD Factor (Tail Clipping)');
  
  gui.addColor(params, 'color').name('Color').onChange((val: string) => {
    const material = currentPlot?.mesh?.material as THREE.ShaderMaterial | undefined;
    if (material && material.uniforms?.uColor) {
      material.uniforms.uColor.value.set(val);
    }
  });
  gui.add(params, 'autoUpdate').name('Auto Update');

  updateVisibility();
};

onMounted(() => {
  setupGui();
});

onUnmounted(() => {
  if (gui) gui.destroy();
});
</script>

<style scoped>
.demo-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.stats {
  position: absolute;
  bottom: 30px;
  left: 30px;
  background: rgba(15, 15, 15, 0.7);
  padding: 20px;
  border-radius: 16px;
  font-family: 'Outfit', sans-serif;
  pointer-events: none;
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  min-width: 240px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.stat-group {
    margin-bottom: 16px;
}

.stat-group:last-child {
  margin-bottom: 0;
}

.stat-main {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    display: flex;
    align-items: baseline;
    gap: 6px;
}

.stat-main .unit {
    font-size: 12px;
    color: #666;
    font-weight: 400;
}

.stat-main .ms {
    font-size: 12px;
    font-weight: 400;
    color: #444;
    font-family: 'JetBrains Mono', monospace;
}

.stat-sub {
    font-size: 12px;
    color: #888;
    margin-top: 4px;
}

.profiling {
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #ccc;
  font-size: 12px;
}

.stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.stat-row b {
    color: #00ccff;
    font-family: 'JetBrains Mono', monospace;
}

.hint {
    font-size: 9px;
    color: #444;
    margin-top: 16px;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-weight: 700;
}
</style>
