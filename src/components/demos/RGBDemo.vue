<template>
  <div class="rgb-demo">
    <div class="channel red">
      <div class="channel-info">
        <div class="label">RED CHANNEL</div>
        <div class="val">{{ redFreq.toFixed(2) }}Hz</div>
      </div>
      <PlotView @ready="(c) => onPlotReady(c, 'red')" />
    </div>
    <div class="channel green">
      <div class="channel-info">
        <div class="label">GREEN CHANNEL</div>
        <div class="val">{{ greenFreq.toFixed(2) }}Hz</div>
      </div>
      <PlotView @ready="(c) => onPlotReady(c, 'green')" />
    </div>
    <div class="channel blue">
      <div class="channel-info">
        <div class="label">BLUE CHANNEL</div>
        <div class="val">{{ blueFreq.toFixed(2) }}Hz</div>
      </div>
      <PlotView @ready="(c) => onPlotReady(c, 'blue')" />
    </div>
    
    <div class="controls-overlay">
      <div class="control-group">
        <label>Animation Speed</label>
        <input type="range" v-model.number="speed" min="0" max="2" step="0.1" />
      </div>
    </div>

    <div class="global-stats">
      <div class="stat-pill">Total GPU Points: <b>{{ (pointCount * 3).toLocaleString() }}</b></div>
      <div class="stat-pill">Sync: <b>Active</b></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import PlotView from '../PlotView.vue';
import { PlotContainer, LinePlot } from '../../plot';
import * as THREE from 'three';

const pointCount = 10000;
const speed = ref(1.0);
const redFreq = ref(0.05);
const greenFreq = ref(0.08);
const blueFreq = ref(0.12);

const channels = {
  red: { container: null as PlotContainer | null, plot: null as LinePlot | null, color: '#ff4466' },
  green: { container: null as PlotContainer | null, plot: null as LinePlot | null, color: '#44ff88' },
  blue: { container: null as PlotContainer | null, plot: null as LinePlot | null, color: '#44aaff' }
};

const onPlotReady = (container: PlotContainer, key: 'red' | 'green' | 'blue') => {
  const channel = channels[key];
  channel.container = container;
  
  // Custom camera setup for this demo
  container.camera.zoom = 1.2;
  container.camera.updateProjectionMatrix();
  
  const color = new THREE.Color(channel.color);
  channel.plot = new LinePlot(pointCount, color);
  container.scene.add(channel.plot.mesh);
  
  container.onUpdate = (time) => {
    if (channel.plot && channel.container) {
      const viewport = channel.container.getViewportStats();
      const freq = key === 'red' ? redFreq.value : (key === 'green' ? greenFreq.value : blueFreq.value);
      
      const params = {
        count: pointCount,
        presetIndex: key === 'red' ? 4 : (key === 'green' ? 0 : 5),
        frequency: freq,
        amplitude: 70,
        pointSize: 1.5,
        adaptive: true,
        lodFactor: 1.0,
        color: channel.color,
        autoUpdate: true,
        autoSubsampling: false,
        autoCulling: true,
        pointsPerPixel: 2.0,
        borderColor: channel.color,
        borderWidth: 0.1,
        dashScale: 0.0
      };
      
      channel.plot.update((time * speed.value) / 1000, params as any, viewport);
    }
  };
};

onUnmounted(() => {
  // Cleanup resources
  Object.values(channels).forEach(channel => {
    if (channel.plot) {
      channel.plot.mesh.geometry.dispose();
      if (Array.isArray(channel.plot.mesh.material)) {
        channel.plot.mesh.material.forEach(m => m.dispose());
      } else {
        channel.plot.mesh.material.dispose();
      }
    }
  });
});
</script>

<style scoped>
.rgb-demo {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  gap: 4px;
  background: #000;
  padding: 4px;
  box-sizing: border-box;
}

.channel {
  flex: 1;
  position: relative;
  background: #050505;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.channel-info {
  position: absolute;
  top: 15px;
  left: 20px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 2px;
  pointer-events: none;
}

.label {
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.2em;
  opacity: 0.8;
}

.val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: #666;
}

.red .label { color: #ff4466; text-shadow: 0 0 10px rgba(255, 68, 102, 0.3); }
.green .label { color: #44ff88; text-shadow: 0 0 10px rgba(68, 255, 136, 0.3); }
.blue .label { color: #44aaff; text-shadow: 0 0 10px rgba(68, 170, 255, 0.3); }

.controls-overlay {
  position: absolute;
  top: 24px;
  right: 30px;
  background: rgba(15, 15, 15, 0.8);
  backdrop-filter: blur(10px);
  padding: 15px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 100;
  pointer-events: auto;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-group label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #888;
}

.global-stats {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
  pointer-events: none;
}

.stat-pill {
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 10px;
  border-radius: 20px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: #555;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-pill b {
  color: #aaa;
}
</style>
