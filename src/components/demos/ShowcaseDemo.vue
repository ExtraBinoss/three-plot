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
        <div class="stat-row"><span>Draw Calls:</span> <b>{{ gpuStats.calls }}</b></div>
      </div>
      <div class="hint">{{ params.mode }} Engine Active</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import GUI from 'lil-gui';
import PlotView from '../PlotView.vue';
import { PlotContainer, type PlotUpdateParams } from '../../plot';

const presets = ['sine', 'saw', 'zigzag', 'ramp', 'harmonic', 'chaos'];

const params = reactive<PlotUpdateParams & { preset: string, mode: 'Points' | 'Lines' }>({
  count: 100000, 
  preset: 'harmonic',
  presetIndex: 4,
  frequency: 0.05,
  amplitude: 40,
  pointSize: 2.0,
  adaptive: false,
  lodFactor: 1.0,
  color: '#00ccff',
  autoUpdate: true,
  autoSubsampling: true,
  autoCulling: true,
  pointsPerPixel: 2.0,
  mode: 'Lines',
  borderColor: '#0088ff',
  borderWidth: 0.1,
  dashScale: 0.0
});

let containerInstance: PlotContainer | null = null;
let activePlot: any = null;
let gui: GUI | null = null;

const stats = ref(true);
const fps = ref(0);
const frameTime = ref(0);
const gpuStats = ref<any>(null);
let lastTime = performance.now();
let frames = 0;

const onPlotReady = (container: PlotContainer) => {
  containerInstance = container;
  rebuildPlot();
  
  container.onUpdate = (time) => {
    frames++;
    if (time >= lastTime + 1000) {
      fps.value = Math.round((frames * 1000) / (time - lastTime));
      lastTime = time;
      frames = 0;
    }
    gpuStats.value = container.getRendererInfo();
  };
};

const rebuildPlot = () => {
  if (!containerInstance) return;
  
  containerInstance.clear();
  
  if (params.mode === 'Lines') {
    activePlot = containerInstance.addLinePlot(params.count, params.color as string);
  } else {
    activePlot = containerInstance.addPointPlot(params.count, params.color as string);
  }
  
  syncParams();
};

const syncParams = () => {
  if (activePlot) {
    activePlot.setParams(params);
  }
};

// Reactively sync params to the plot
watch(params, syncParams, { deep: true });

const setupGui = () => {
  gui = new GUI();
  
  gui.add(params, 'mode', ['Points', 'Lines']).name('Engine').onChange(rebuildPlot);

  const folderData = gui.addFolder('Data');
  folderData.add(params, 'count', 100, 1000000, 100).name('Point Count').onFinishChange(rebuildPlot);
  folderData.add(params, 'autoSubsampling').name('Subsampling');
  folderData.add(params, 'autoCulling').name('Culling');

  const folderPlot = gui.addFolder('Plot Settings');
  folderPlot.add(params, 'preset', presets).name('Shape').onChange((v: string) => params.presetIndex = presets.indexOf(v));
  folderPlot.add(params, 'frequency', 0.01, 0.5, 0.01);
  folderPlot.add(params, 'amplitude', 1, 150, 1);
  folderPlot.add(params, 'pointSize', 0.1, 10, 0.1).name('Size');
  folderPlot.add(params, 'adaptive').name('Adaptive Size');
  
  gui.addColor(params, 'color').name('Main Color');
  gui.add(params, 'autoUpdate').name('Animate');
};

onMounted(setupGui);
onUnmounted(() => gui?.destroy());
</script>

<style scoped>
.demo-container { width: 100%; height: 100%; position: relative; }
.stats {
  position: absolute; bottom: 30px; left: 30px;
  background: rgba(15, 15, 15, 0.75); padding: 20px; border-radius: 16px;
  backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: none; min-width: 220px;
}
.stat-main { font-size: 24px; font-weight: 700; display: flex; align-items: baseline; gap: 8px; }
.unit { font-size: 12px; color: #666; }
.ms { font-size: 11px; color: #444; font-family: monospace; }
.stat-sub { font-size: 11px; color: #888; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
.profiling { margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.05); }
.stat-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; color: #aaa; }
.stat-row b { color: #00ccff; }
.hint { font-size: 9px; color: #444; margin-top: 15px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; }
</style>
