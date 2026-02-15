<template>
  <div class="app">
    <PlotView @ready="onPlotReady" />
    <div class="stats" v-if="stats">
      <div class="stat-group">
        <div class="stat-main">FPS: {{ fps }}</div>
        <div class="stat-sub">Points: {{ params.count.toLocaleString() }}</div>
      </div>
      <div class="hint">GPU-Powered 2D Plotter</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import GUI from 'lil-gui';
import PlotView from './components/PlotView.vue';
import { PlotContainer, FastPlot } from './plot';
import * as THREE from 'three';

const presets = ['sine', 'saw', 'zigzag', 'ramp'];

const params = reactive({
  count: 1000000, 
  preset: 'sine',
  presetIndex: 0,
  frequency: 0.1,
  amplitude: 20,
  pointSize: 2.0,
  adaptive: true,
  lodFactor: 1.0,
  color: '#00ff88',
  autoUpdate: true
});

let plotContainer: PlotContainer | null = null;
let fastPlot: FastPlot | null = null;
const stats = ref(true);
const fps = ref(0);
let lastTime = performance.now();
let frames = 0;

const onPlotReady = (container: PlotContainer) => {
  plotContainer = container;
  initPlot();
};

const initPlot = () => {
  if (!plotContainer) return;
  
  if (fastPlot) {
    plotContainer.scene.remove(fastPlot.mesh);
  }
  
  fastPlot = new FastPlot(1000000, new THREE.Color(params.color));
  plotContainer.scene.add(fastPlot.mesh);
};

const setupGui = () => {
  const gui = new GUI();
  gui.add(params, 'count', 100, 1000000, 100).name('Point Count');
  gui.add(params, 'preset', presets).name('Preset').onChange((val: string) => {
    params.presetIndex = presets.indexOf(val);
  });
  gui.add(params, 'frequency', 0.01, 2, 0.01).name('Frequency');
  gui.add(params, 'amplitude', 1, 100, 1).name('Amplitude');
  gui.add(params, 'pointSize', 0.1, 10, 0.1).name('Base Point Size');
  gui.add(params, 'adaptive').name('Adaptive Size');
  gui.add(params, 'lodFactor', 0.01, 1.0, 0.01).name('GPU LOD Factor');
  gui.addColor(params, 'color').name('Color').onChange((val: string) => {
    const material = fastPlot?.mesh?.material as THREE.ShaderMaterial | undefined;
    if (material && material.uniforms?.uColor) {
      material.uniforms.uColor.value.set(val);
    }
  });
  gui.add(params, 'autoUpdate').name('Auto Update');
};

const animate = () => {
  requestAnimationFrame(animate);
  
  const time = performance.now();
  frames++;

  if (time >= lastTime + 1000) {
    fps.value = Math.round((frames * 1000) / (time - lastTime));
    lastTime = time;
    frames = 0;
  }

  if (fastPlot) {
      const elapsed = params.autoUpdate ? time / 1000 : 0;
      fastPlot.update(elapsed, params);
  }
};

onMounted(() => {
  setupGui();
  animate();
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

.hint {
    font-size: 9px;
    color: #555;
    margin-top: 10px;
    text-transform: uppercase;
    letter-spacing: 2px;
}
</style>
