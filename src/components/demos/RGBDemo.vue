<template>
  <div class="rgb-demo">
    <div class="plot-wrapper">
      <div class="channel-labels">
        <div class="channel-tag red">RED CHANNEL</div>
        <div class="channel-tag green">GREEN CHANNEL</div>
        <div class="channel-tag blue">BLUE CHANNEL</div>
      </div>
      <PlotView :options="plotOptions" @ready="onPlotReady" />
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
      <div class="stat-pill">Auto-Labeling MSDF API</div>
      <div class="stat-pill">Total GPU Points: <b>{{ (pointCount * 3).toLocaleString() }}</b></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import PlotView from '../PlotView.vue';
import { type PlotContainer, type LinePlot, type AxisPlot, type TextPlot } from '../../plot';

const pointCount = 1000;
const speed = ref(1.0);
const spread = ref(80);

const plotOptions = {
    font: {
        json: '/fonts/font.json',
        texture: '/fonts/font.png'
    }
};

let containerInstance: PlotContainer | null = null;
let redPlot: LinePlot, greenPlot: LinePlot, bluePlot: LinePlot;
let redAxis: AxisPlot, greenAxis: AxisPlot, blueAxis: AxisPlot;
let textLayer: TextPlot;

const onPlotReady = (container: PlotContainer) => {
  containerInstance = container;
  
  // 1. Setup Text Layer FIRST
  textLayer = container.text(2000);

  // 2. Setup Axes with Auto-Labels
  redAxis = container.axis('#ff4466').ticks(50, 10).labels(textLayer, 0.07, '#ff4466');
  greenAxis = container.axis('#44ff88').ticks(50, 10).labels(textLayer, 0.07, '#44ff88');
  blueAxis = container.axis('#44aaff').ticks(50, 10).labels(textLayer, 0.07, '#44aaff');

  // 3. Setup Plots
  redPlot = container.line(pointCount, '#ff4466').amplitude(50).frequency(0.05).preset(4);
  greenPlot = container.line(pointCount, '#44ff88').amplitude(50).frequency(0.05).preset(0);
  bluePlot = container.line(pointCount, '#44aaff').amplitude(50).frequency(0.05).preset(5);
  
  container.onUpdate = () => {
      if (textLayer) {
          textLayer.clear();
          const s = spread.value;
          // Add custom permanent titles each frame since we clear
          textLayer.add("SIGNAL: HARMONIC", -200, s + 65, 0.08, "#ff4466");
          textLayer.add("SIGNAL: SINE", -200, 65, 0.08, "#44ff88");
          textLayer.add("SIGNAL: CHAOS", -200, -s + 65, 0.08, "#44aaff");
      }
  };

  updatePlots();
};

const updatePlots = () => {
  if (!containerInstance) return;

  const s = spread.value;
  const baseAmp = 50;
  
  redPlot.amplitude(baseAmp).offset(0, s);
  redAxis.rangeY(-baseAmp * 1.5, baseAmp * 1.5).offset(0, s);

  greenPlot.amplitude(baseAmp).offset(0, 0);
  greenAxis.rangeY(-baseAmp, baseAmp).offset(0, 0);

  bluePlot.amplitude(baseAmp).offset(0, -s);
  blueAxis.rangeY(-baseAmp * 2.0, baseAmp * 2.0).offset(0, -s);
};

watch(spread, updatePlots);

watch(speed, (newSpeed) => {
    const active = newSpeed > 0;
    [redPlot, greenPlot, bluePlot].forEach(p => p?.setParams({ autoUpdate: active }));
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
.red { color: #ff4466; }
.green { color: #44ff88; }
.blue { color: #44aaff; }

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
