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
      <div class="stat-pill">Single Canvas / Triple Plot</div>
      <div class="stat-pill">Total GPU Points: <b>{{ (pointCount * 3).toLocaleString() }}</b></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import PlotView from '../PlotView.vue';
import { PlotContainer, LinePlot } from '../../plot';
import * as THREE from 'three';

const pointCount = 1000;
const speed = ref(1.0);
const spread = ref(80);

// Plain variables to avoid Vue Proxy interference with Three.js
let containerInstance: PlotContainer | null = null;
const plots: { red?: LinePlot, green?: LinePlot, blue?: LinePlot } = {};

const onPlotReady = (container: PlotContainer) => {
  containerInstance = container;
  
  container.camera.zoom = 1.0;
  container.camera.updateProjectionMatrix();
  
  // Initialize multiple plots in the SAME scene
  plots.red = new LinePlot(pointCount, new THREE.Color('#ff4466'));
  plots.green = new LinePlot(pointCount, new THREE.Color('#44ff88'));
  plots.blue = new LinePlot(pointCount, new THREE.Color('#44aaff'));
  
  container.scene.add(plots.red.mesh);
  container.scene.add(plots.green.mesh);
  container.scene.add(plots.blue.mesh);
  
  container.onUpdate = (time) => {
    if (!containerInstance) return;
    
    const viewport = containerInstance.getViewportStats();
    const t = (time * speed.value) / 1000;
    const s = spread.value;

    const baseParams = {
      count: pointCount,
      frequency: 0.05,
      amplitude: 50,
      pointSize: 2.0,
      adaptive: true,
      lodFactor: 1.0,
      autoUpdate: true,
      autoSubsampling: false,
      autoCulling: true,
      pointsPerPixel: 2.0,
      borderWidth: 0.1,
      dashScale: 0.0
    };

    if (plots.red) {
      plots.red.update(t, { ...baseParams, presetIndex: 4, color: '#ff4466', borderColor: '#ff4466', offset: { x: 0, y: s } } as any, viewport);
    }
    if (plots.green) {
      plots.green.update(t, { ...baseParams, presetIndex: 0, color: '#44ff88', borderColor: '#44ff88', offset: { x: 0, y: 0 } } as any, viewport);
    }
    if (plots.blue) {
      plots.blue.update(t, { ...baseParams, presetIndex: 5, color: '#44aaff', borderColor: '#44aaff', offset: { x: 0, y: -s } } as any, viewport);
    }
  };
};

onUnmounted(() => {
  // Manual cleanup of GPU resources
  Object.values(plots).forEach(plot => {
    if (plot) {
      plot.mesh.geometry.dispose();
      if (Array.isArray(plot.mesh.material)) {
        plot.mesh.material.forEach(m => m.dispose());
      } else {
        plot.mesh.material.dispose();
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
  background: #000;
  box-sizing: border-box;
}

.plot-wrapper {
  flex: 1;
  position: relative;
}

.channel-labels {
  position: absolute;
  top: 0;
  left: 30px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 60px;
  pointer-events: none;
  z-index: 5;
}

.channel-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 2px;
  font-weight: 700;
}

.red { color: #ff4466; text-shadow: 0 0 10px rgba(255, 68, 102, 0.5); }
.green { color: #44ff88; text-shadow: 0 0 10px rgba(68, 255, 136, 0.5); }
.blue { color: #44aaff; text-shadow: 0 0 10px rgba(68, 170, 255, 0.5); }

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
  display: flex;
  flex-direction: column;
  gap: 15px;
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
