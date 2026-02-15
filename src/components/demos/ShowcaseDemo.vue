<template>
  <div class="demo-container">
    <PlotView :options="plotOptions" @ready="onPlotReady" />
    <div class="stats" v-if="stats">
      <div class="stat-group">
        <div class="stat-main">{{ fps }} <span class="unit">FPS</span> <span class="ms">({{ frameTime.toFixed(1) }}ms)</span></div>
        <div class="stat-sub">{{ drawStats.total.toLocaleString() }} total points</div>
      </div>
      
      <div class="stat-group profiling">
        <div class="stat-row"><span>GPU Visible:</span> <b>{{ drawStats.visible.toLocaleString() }}</b></div>
        <div class="stat-row"><span>Efficiency:</span> <b>{{ ((drawStats.visible / Math.max(drawStats.total, 1)) * 100).toFixed(1) }}%</b></div>
        <div class="stat-row"><span>Device Load:</span> <b>{{ (frameTime / 16.6 * 100).toFixed(0) }}%</b></div>
      </div>
      <div class="hint">{{ params.mode }} Engine Active</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import GUI from 'lil-gui';
import PlotView from '../PlotView.vue';
import { ThreePlot, type PlotContainer, type LinePlot, type PointPlot, type AxisPlot, type TextPlot } from '../../plot';

const presets = ['sine', 'saw', 'zigzag', 'ramp', 'harmonic', 'chaos'];

const plotOptions = {
    font: { json: '/fonts/font.json', texture: '/fonts/font.png' }
};

const params = reactive({
  count: 100000, 
  preset: 'harmonic',
  presetIndex: 4,
  frequency: 0.05,
  amplitude: 40,
  width: 400,
  pointSize: 2.0,
  mode: 'Lines' as 'Points' | 'Lines',
  color: '#00ccff',
  autoUpdate: true,
  autoSubsampling: true,
  autoCulling: true,
  showAxis: true,
  showLabels: true,
  axisThickness: 1.5,
  adaptive: false
});

let containerInstance: PlotContainer | null = null;
let activePlot: LinePlot | PointPlot | null = null;
let activeAxis: AxisPlot | null = null;
let textLayer: TextPlot | null = null;
let gui: GUI | null = null;

const stats = ref(true);
const fps = ref(0);
const frameTime = ref(0);
const drawStats = reactive({ total: 0, visible: 0 });
let lastTime = performance.now();
let frames = 0;

const onPlotReady = (container: PlotContainer) => {
  containerInstance = container;
  rebuildScene();
  
  container.onUpdate = (time) => {
    const start = performance.now();
    frames++;
    if (time >= lastTime + 1000) {
      fps.value = Math.round((frames * 1000) / (time - lastTime));
      lastTime = time;
      frames = 0;
    }
    
    if (textLayer) textLayer.clear();
    
    if (activePlot) {
      const s = activePlot.getDrawStats();
      drawStats.total = s.total;
      drawStats.visible = s.visible;
    }
    
    frameTime.value = performance.now() - start;
  };
};

const rebuildScene = async () => {
  if (!containerInstance) return;
  
  containerInstance.clear();
  textLayer = containerInstance.text(2000);

  // 1. Setup Axis
  if (params.showAxis) {
      activeAxis = containerInstance.axis('#ffffff').ticks(50, 8);
      if (params.showLabels) {
          activeAxis.labels(textLayer, 0.07, '#888');
      }
  } else {
      activeAxis = null;
  }

  // 2. Setup Plot
  if (params.mode === 'Lines') {
    activePlot = containerInstance.line(params.count, params.color);
  } else {
    activePlot = containerInstance.point(params.count, params.color);
  }
  
  syncParams();
};

const syncParams = () => {
  if (activePlot) {
    activePlot.setParams({
        frequency: params.frequency,
        amplitude: params.amplitude,
        width: params.width,
        presetIndex: params.presetIndex,
        pointSize: params.pointSize,
        color: params.color,
        autoUpdate: params.autoUpdate,
        autoSubsampling: params.autoSubsampling,
        autoCulling: params.autoCulling,
        adaptive: params.adaptive
    });
  }
  
  if (activeAxis) {
      const halfW = params.width * 0.5;
      activeAxis.rangeX(-halfW, halfW)
                .rangeY(-params.amplitude * 1.2, params.amplitude * 1.2)
                .thickness(params.axisThickness);
  }
};

watch(params, (newVal, oldVal) => {
    // If structural params change, rebuild
    if (newVal.mode !== oldVal.mode || newVal.count !== oldVal.count || newVal.showAxis !== oldVal.showAxis || newVal.showLabels !== oldVal.showLabels) {
        rebuildScene();
    } else {
        syncParams();
    }
}, { deep: true });

const setupGui = () => {
  gui = new GUI();
  
  gui.add(params, 'mode', ['Points', 'Lines']).name('Engine');

  const folderData = gui.addFolder('Data & Geometry');
  folderData.add(params, 'count', 100, 1000000, 100).name('Point Count');
  folderData.add(params, 'width', 100, 2000, 10).name('Plot Width (X)');
  folderData.add(params, 'amplitude', 1, 200, 1).name('Amplitude (Y)');
  folderData.add(params, 'frequency', 0.01, 0.5, 0.01);
  
  const folderVisuals = gui.addFolder('Visuals');
  folderVisuals.add(params, 'showAxis').name('Show Axis');
  folderVisuals.add(params, 'showLabels').name('Show Labels');
  folderVisuals.add(params, 'axisThickness', 0.1, 10, 0.1).name('Axis Thickness');
  folderVisuals.add(params, 'pointSize', 0.1, 10, 0.1).name('Size');
  folderVisuals.add(params, 'adaptive').name('Adaptive Size');
  folderVisuals.addColor(params, 'color').name('Color');
  
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
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
.stat-main { font-size: 24px; font-weight: 700; display: flex; align-items: baseline; gap: 8px; }
.unit { font-size: 12px; color: #666; }
.ms { font-size: 11px; color: #444; font-family: monospace; }
.stat-sub { font-size: 11px; color: #888; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
.profiling { margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.05); }
.stat-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; color: #aaa; }
.stat-row b { color: #00ccff; font-family: 'JetBrains Mono', monospace; }
.hint { font-size: 9px; color: #444; margin-top: 15px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; }
</style>
