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
      <div class="stat-pill">Managed API / Single Canvas</div>
      <div class="stat-pill">Total GPU Points: <b>{{ (pointCount * 3).toLocaleString() }}</b></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import PlotView from '../PlotView.vue';
import { PlotContainer } from '../../plot';

const pointCount = 20000;
const speed = ref(1.0);
const spread = ref(80);

let containerInstance: PlotContainer | null = null;
let redPlot: any, greenPlot: any, bluePlot: any;

const onPlotReady = (container: PlotContainer) => {
  containerInstance = container;
  
  // Chainable / Sugar API
  redPlot = container.line(pointCount, '#ff4466');
  greenPlot = container.line(pointCount, '#44ff88');
  bluePlot = container.line(pointCount, '#44aaff');
  
  updatePlots();
};

const updatePlots = () => {
  if (!containerInstance) return;

  const s = spread.value;
  const common = { count: pointCount, amplitude: 50, frequency: 0.05, pointSize: 2.5 };

  redPlot.setParams({ ...common, presetIndex: 4, offset: { x: 0, y: s } });
  greenPlot.setParams({ ...common, presetIndex: 0, offset: { x: 0, y: 0 } });
  bluePlot.setParams({ ...common, presetIndex: 5, offset: { x: 0, y: -s } });
};

// Sync spread changes
watch(spread, updatePlots);

// Animation speed is handled by each plot's internal time update
// but we can scale the time passed to container if we want global speed control
// For now, we'll let individual plots handle it or use onUpdate for global time scaling
watch(speed, (newSpeed) => {
    // In this API, we'll just update the plots
    [redPlot, greenPlot, bluePlot].forEach(p => p.setParams({ autoUpdate: newSpeed > 0 }));
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
