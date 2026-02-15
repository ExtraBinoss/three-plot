<template>
  <div class="rgb-demo">
    <div class="plot-wrapper">
      <div class="channel-labels">
        <div class="channel-tag red">RED CHANNEL</div>
        <div class="channel-tag green">GREEN CHANNEL</div>
        <div class="channel-tag blue">BLUE CHANNEL</div>
      </div>
      <PlotView @ready="onPlotReady" />
    </div>
    
    <div class="controls-overlay">
      <div class="control-group">
        <label>Animation Speed</label>
        <input type="range" v-model.number="speed" min="0" max="2" step="0.1" />
      </div>
      <div class="control-group">
        <label>Vertical Spread</label>
        <input type="range" v-model.number="spread" min="20" max="150" step="1" />
      </div>
    </div>

    <div class="global-stats">
      <div class="stat-pill">Bounded GPU Axes</div>
      <div class="stat-pill">Total GPU Points: <b>{{ (pointCount * 3).toLocaleString() }}</b></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import PlotView from '../PlotView.vue';
import { type PlotContainer, type LinePlot, type AxisPlot } from '../../plot';

const pointCount = 20000;
const speed = ref(1.0);
const spread = ref(80);

let containerInstance: PlotContainer | null = null;
let redPlot: LinePlot, greenPlot: LinePlot, bluePlot: LinePlot;
let redAxis: AxisPlot, greenAxis: AxisPlot, blueAxis: AxisPlot;

const onPlotReady = (container: PlotContainer) => {
  containerInstance = container;
  
  // Create Axes
  redAxis = container.axis('#ff4466').ticks(50, 10);
  greenAxis = container.axis('#44ff88').ticks(50, 10);
  blueAxis = container.axis('#44aaff').ticks(50, 10);

  // Create Plots
  redPlot = container.line(pointCount, '#ff4466').amplitude(50).frequency(0.05).preset(4);
  greenPlot = container.line(pointCount, '#44ff88').amplitude(50).frequency(0.05).preset(0);
  bluePlot = container.line(pointCount, '#44aaff').amplitude(50).frequency(0.05).preset(5);
  
  updatePlots();
};

const updatePlots = () => {
  if (!containerInstance) return;

  const s = spread.value;
  const baseAmp = 50;
  
  // Red (Harmonic preset exceeds base amplitude, so we set a larger axis range)
  redPlot.amplitude(baseAmp).offset(0, s);
  redAxis.rangeY(-baseAmp * 1.5, baseAmp * 1.5).offset(0, s);

  // Green (Sine is exactly baseAmp)
  greenPlot.amplitude(baseAmp).offset(0, 0);
  greenAxis.rangeY(-baseAmp, baseAmp).offset(0, 0);

  // Blue (Chaos also exceeds base amplitude)
  bluePlot.amplitude(baseAmp).offset(0, -s);
  blueAxis.rangeY(-baseAmp * 2.0, baseAmp * 2.0).offset(0, -s);
};

watch(spread, updatePlots);

watch(speed, (newSpeed) => {
    const active = newSpeed > 0;
    [redPlot, greenPlot, bluePlot].forEach(p => p.setParams({ autoUpdate: active }));
});

onUnmounted(() => {
    containerInstance?.destroy();
});
</script>

<style scoped>
.rgb-demo { display: flex; flex-direction: column; width: 100%; height: 100%; background: #000; }
.plot-wrapper { flex: 1; position: relative; }
.channel-labels {
  position: absolute; top: 0; left: 30px; height: 100%;
  display: flex; flex-direction: column; justify-content: center; gap: 80px;
  pointer-events: none; z-index: 5;
}
.channel-tag { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2px; font-weight: 700; }
.red { color: #ff4466; text-shadow: 0 0 10px rgba(255, 68, 102, 0.5); }
.green { color: #44ff88; text-shadow: 0 0 10px rgba(68, 255, 136, 0.5); }
.blue { color: #44aaff; text-shadow: 0 0 10px rgba(68, 170, 255, 0.5); }

.controls-overlay {
  position: absolute; top: 24px; right: 30px;
  background: rgba(15, 15, 15, 0.8); backdrop-filter: blur(10px);
  padding: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 100; display: flex; flex-direction: column; gap: 15px;
}
.control-group { display: flex; flex-direction: column; gap: 8px; }
.control-group label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; }
.global-stats { position: absolute; bottom: 20px; right: 20px; display: flex; gap: 10px; pointer-events: none; }
.stat-pill {
  background: rgba(0, 0, 0, 0.5); padding: 4px 10px; border-radius: 20px;
  font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #555;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.stat-pill b { color: #aaa; }
</style>
