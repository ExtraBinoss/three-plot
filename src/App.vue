<template>
  <div class="app">
    <PlotView @ready="onPlotReady" />
    <div class="stats" v-if="stats">
      <div>Points: {{ params.count.toLocaleString() }}</div>
      <div>FPS: {{ fps }}</div>
      <div v-if="profiling" class="profiling">
        <div>Update: {{ profiling.updateMs }}ms</div>
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
  count: 1000000, // Now we can easily handle 1M
  preset: 'sine',
  presetIndex: 0,
  frequency: 0.1,
  amplitude: 20,
  pointSize: 2.0,
  color: '#00ff88',
  autoUpdate: true
});

let plotContainer: PlotContainer | null = null;
let fastPlot: FastPlot | null = null;
const stats = ref(true);
const fps = ref(0);
const profiling = ref<any>(null);
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
  
  fastPlot = new FastPlot(1000000, new THREE.Color(params.color)); // Max capacity
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
  gui.add(params, 'pointSize', 0.1, 10, 0.1).name('Point Size');
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
  
  frames++;
  const time = performance.now();
  if (time >= lastTime + 1000) {
    fps.value = Math.round((frames * 1000) / (time - lastTime));
    lastTime = time;
    frames = 0;
  }

  if (fastPlot) {
      const elapsed = params.autoUpdate ? time / 1000 : 0;
      fastPlot.update(elapsed, params);
      
      // Update profiling only once per second to reduce reactivity overhead
      if (time >= lastTime + 1000) {
        profiling.value = fastPlot.profiling;
      }
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
  background: rgba(0, 0, 0, 0.7);
  padding: 12px;
  border-radius: 8px;
  font-family: monospace;
  pointer-events: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.profiling {
  margin: 5px 0;
  padding-top: 5px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: #00ff88;
  font-size: 12px;
}

.hint {
    font-size: 10px;
    color: #666;
    margin-top: 5px;
    text-transform: uppercase;
    letter-spacing: 1px;
}
</style>
