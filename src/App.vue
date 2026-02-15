<template>
  <div class="app">
    <PlotView @ready="onPlotReady" />
    <div class="stats" v-if="stats">
      <div class="stat-group">
        <div class="stat-main">FPS: {{ fps }} <span class="ms">({{ frameTime.toFixed(1) }}ms)</span></div>
        <div class="stat-sub">Total: {{ params.count.toLocaleString() }} pts</div>
      </div>
      <div class="stat-group profiling" v-if="gpuStats">
        <div class="stat-row" v-if="params.mode === 'Points'"><span>GPU Points:</span> <b>{{ gpuStats.points.toLocaleString() }}</b></div>
        <div class="stat-row" v-else><span>GPU Triangles:</span> <b>{{ gpuStats.triangles.toLocaleString() }}</b></div>
        <div class="stat-row"><span>Visible Pts:</span> <b>{{ params.actualPoints.toLocaleString() }}</b></div>
        <div class="stat-row"><span>Draw Calls:</span> <b>{{ gpuStats.calls }}</b></div>
        <div class="stat-row"><span>Memory:</span> <b>{{ gpuStats.memory.geometries }} geom</b></div>
      </div>
      <div class="hint">{{ params.mode }} Mode Active</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import GUI from 'lil-gui';
import PlotView from './components/PlotView.vue';
import { PlotContainer, FastPlot, InstancedPlot, LinePlot } from './plot';
import * as THREE from 'three';

const presets = ['sine', 'saw', 'zigzag', 'ramp'];

const params = reactive({
  count: 300000, 
  preset: 'sine',
  presetIndex: 0,
  frequency: 0.1,
  amplitude: 20,
  pointSize: 2.0,
  adaptive: true,
  lodFactor: 1.0,
  color: '#00ff88',
  autoUpdate: true,
  autoSubsampling: true,
  autoCulling: true,
  pointsPerPixel: 2.0,
  actualPoints: 0,
  mode: 'Points',
  borderColor: '#000000',
  borderWidth: 0.3,
  rainbow: false,
  dashScale: 0.0
});

let plotContainer: PlotContainer | null = null;
let currentPlot: FastPlot | InstancedPlot | LinePlot | null = null;
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
      const viewport = plotContainer.getViewportStats();
      const elapsed = params.autoUpdate ? time / 1000 : 0;
      currentPlot.update(elapsed, params, viewport);
      
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
  }
  
  const color = new THREE.Color(params.color);
  
  if (params.mode === 'Points') {
    currentPlot = new FastPlot(3000, color);
  } else if (params.mode === 'Instanced') {
    currentPlot = new InstancedPlot(2000000, color);
  } else if (params.mode === 'Lines') {
    // For Lines (Line2), the CPU->GPU transfer is more expensive.
    // We cap it to a reasonable count if it's too high for stable 60fps.
    const safeCount = Math.min(params.count, 100000);
    currentPlot = new LinePlot(safeCount, color);
  }
  
  if (currentPlot) {
    plotContainer.scene.add(currentPlot.mesh);
  }
};

const setupGui = () => {
  const gui = new GUI();
  
  const updateVisibility = () => {
    const isPoints = params.mode === 'Points';
    cullingController.show(isPoints);
    subsamplingFolder.show(isPoints);
    
    const isLines = params.mode === 'Lines';
    folderDecorative.show(isLines);
  };

  gui.add(params, 'mode', ['Points', 'Instanced', 'Lines']).name('Rendering Mode').onChange((mode: string) => {
    if (mode === 'Instanced' || mode === 'Lines') {
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
  folderDecorative.add(params, 'rainbow').name('Rainbow Mode');
  folderDecorative.add(params, 'dashScale', 0, 10, 0.1).name('Dash Scale');

  const folderData = gui.addFolder('Data & Performance');
  folderData.add(params, 'count', 100, 2000000, 100).name('Total Data Points');
  
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
</script>

<style>
body, html, #app, .app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #0a0a0a;
  color: white;
  font-family: 'Inter', sans-serif;
}

.stats {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(10, 10, 10, 0.85);
  padding: 16px;
  border-radius: 12px;
  font-family: 'JetBrains Mono', monospace;
  pointer-events: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  min-width: 200px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.stat-group {
    margin-bottom: 12px;
}

.stat-main {
    font-size: 20px;
    font-weight: 700;
    color: #00ff88;
}

.stat-main .ms {
    font-size: 14px;
    font-weight: 400;
    color: #666;
    margin-left: 4px;
}

.stat-sub {
    font-size: 12px;
    color: #888;
}

.profiling {
  margin: 10px 0;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #ddd;
  font-size: 11px;
}

.divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.05);
    margin: 4px 0;
}

.stat-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2px;
}

.stat-row b {
    color: #fff;
}

.hint {
    font-size: 9px;
    color: #555;
    margin-top: 10px;
    text-transform: uppercase;
    letter-spacing: 2px;
}
</style>
