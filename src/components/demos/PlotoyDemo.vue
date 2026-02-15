<template>
  <div class="plotoy-container">
    <div class="canvas-side">
      <PlotView :options="plotOptions" @ready="onPlotReady" />
    </div>
    
    <div class="sidebar">
      <div class="header">
        <h1>Plotoy</h1>
        <p>High-Performance GPU Plotter</p>
      </div>
      
      <div class="formula-list">
        <div v-for="(formula, index) in formulas" :key="index" class="formula-item" :style="{ borderColor: formula.color }">
          <div class="formula-meta">
            <span class="formula-name" :style="{ color: formula.color }">f{{ index + 1 }}(x,t) =</span>
            <input 
              v-model="formula.text" 
              @input="updatePlots"
              class="formula-input"
              placeholder="Enter formula..."
            />
            <button @click="toggleFormula(index)" class="toggle-btn" :class="{ active: formula.enabled }">
              {{ formula.enabled ? 'ON' : 'OFF' }}
            </button>
          </div>
          <div v-if="formula.error" class="error-msg">{{ formula.error }}</div>
        </div>
      </div>

      <div class="controls">
        <div class="control-row">
          <label>Zoom X (Range)</label>
          <input type="range" v-model.number="params.width" min="2" max="50" step="0.5" @input="syncParams" />
          <span>{{ params.width }}</span>
        </div>
        <div class="control-row">
          <label>Zoom Y (Range)</label>
          <input type="range" v-model.number="params.amplitude" min="2" max="50" step="0.5" @input="syncParams" />
          <span>{{ params.amplitude }}</span>
        </div>
        <div class="control-row">
            <label>Points</label>
            <input type="range" v-model.number="params.count" min="5000" max="100000" step="5000" @change="rebuildScene" />
            <span>{{ (params.count / 1000).toFixed(0) }}k</span>
        </div>
      </div>

      <div class="footer">
        <p>Built-in: x, t, sin, cos, tan, floor, ceil, abs, min, max, sqrt, pow, noise, smoothstep</p>
        <p class="hint">Scroll to zoom • Right-click to pan</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue';
import PlotView from '../PlotView.vue';
import { type PlotContainer, type LinePlot, type AxisPlot, type TextPlot } from '../../plot';

interface Formula {
    text: string;
    color: string;
    enabled: boolean;
    error: string;
}

const formulas = ref<Formula[]>([
  { text: '4 + 4*smoothstep(0,0.7,sin(x+t))', color: '#ff3e3e', enabled: true, error: '' },
  { text: 'sqrt(9^2-x^2)', color: '#3eff3e', enabled: true, error: '' },
  { text: '3*sin(x)/x', color: '#3e3eff', enabled: true, error: '' },
  { text: '2*noise(3*x+t)+f3(x,t)', color: '#ffff3e', enabled: true, error: '' },
  { text: '(t + floor(x-t))/2 - 5', color: '#3effff', enabled: true, error: '' },
  { text: 'sin(f5(x,t)) - 5', color: '#ff3eff', enabled: true, error: '' },
]);

const plotOptions = {
    font: { json: 'fonts/font.json', texture: 'fonts/font.png' }
};

const params = reactive({
  count: 50000,
  width: 20, // More zoomed in by default
  amplitude: 12,
  axisColor: '#444444',
  labelColor: '#888888',
});

let containerInstance: PlotContainer | null = null;
let activePlots: LinePlot[] = [];
let activeAxis: AxisPlot | null = null;
let textLayer: TextPlot | null = null;

const onPlotReady = (container: PlotContainer) => {
  containerInstance = container;
  
  // Custom styling for Plotoy
  container.scene.background = null; // Let CSS handle it
  if (container.controls) {
      container.controls.enableRotate = false;
      // Make zoom/pan more sensitive for the new scale
  }
  
  rebuildScene();
  
  container.onUpdate = () => {
    if (textLayer) textLayer.clear();
  };
};

const toggleFormula = (index: number) => {
  if (formulas.value[index]) {
    formulas.value[index].enabled = !formulas.value[index].enabled;
    updatePlots();
  }
};

const floatify = (str: string) => {
    // 1. Replace ^ with pow FIRST to avoid complexity
    let res = str.replace(/([a-zA-Z0-9._]+)\^([a-zA-Z0-9._]+)/g, 'pow($1, $2)');

    // 2. Improved integer to float conversion
    res = res.replace(/(?<![a-zA-Z._\d])(\d+)(?![.\d])/g, '$1.0');
    
    return res;
};

const updatePlots = () => {
  if (!containerInstance) return;

  const injectionMap = new Map<string, string>();
  
  formulas.value.forEach((f, i) => {
    if (f.text.trim()) {
        try {
            let glsl = f.text;
            for(let j=0; j<6; j++) {
                const reg = new RegExp(`\\bf${j+1}\\b(?!\\()`, 'g');
                glsl = glsl.replace(reg, `f${j+1}(x,t)`);
            }
            
            glsl = floatify(glsl);
            injectionMap.set(`f${i+1}`, glsl);
            f.error = '';
        } catch (e) {
            f.error = 'Syntax error';
        }
    } else {
        injectionMap.set(`f${i+1}`, '0.0');
    }
  });

  if (activePlots.length > 0 && activePlots[0]) {
      activePlots[0].injectPresets(injectionMap);
      activePlots.forEach(p => {
          p.injectPresets(injectionMap);
      });
  }

  activePlots.forEach((plot, i) => {
      const f = formulas.value[i];
      if (f) {
          if (f.enabled) {
              plot.preset(i + 8);
              plot.mesh.visible = true;
          } else {
              plot.mesh.visible = false;
          }
      }
  });
};

const rebuildScene = () => {
  if (!containerInstance) return;
  
  containerInstance.clear();
  textLayer = containerInstance.text(2000);
  activePlots = [];

  // Setup Axis with smaller scale grid
  activeAxis = containerInstance.axis(params.axisColor)
                .ticks(1.0, 5) // Grid every 1.0 unit, sub-ticks every 0.2
                .thickness(1.0);
                
  activeAxis.labels(textLayer, 0.05, params.labelColor)
            .precision(1);

  formulas.value.forEach((f) => {
    const p = containerInstance!.line(params.count, f.color);
    p.setParams({ pointSize: 2.5 }); // Thicker lines for better visibility
    activePlots.push(p);
  });

  updatePlots();
  syncParams();
};

const syncParams = () => {
  activePlots.forEach(plot => {
    plot.setParams({
        width: params.width,
        amplitude: params.amplitude,
        autoUpdate: true,
    });
  });
  
  if (activeAxis) {
      const halfW = params.width * 0.5;
      activeAxis.rangeX(-halfW, halfW)
                .rangeY(-params.amplitude, params.amplitude);
  }
};

onUnmounted(() => {
    // Clean up
});
</script>

<style scoped>
.plotoy-container {
  display: flex;
  width: 100%;
  height: 100vh;
  background: #080808;
  color: #eee;
  font-family: 'Outfit', sans-serif;
}

.canvas-side {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at center, #111 0%, #050505 100%);
}

.sidebar {
  width: 380px;
  background: #121212;
  border-left: 1px solid #222;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow-y: auto;
  box-shadow: -10px 0 30px rgba(0,0,0,0.5);
}

.header h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.05em;
  background: linear-gradient(135deg, #fff 0%, #888 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header p {
  margin: 4px 0 24px 0;
  font-size: 0.8rem;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.formula-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.formula-item {
  background: #1a1a1a;
  border-left: 4px solid transparent;
  padding: 12px;
  border-radius: 8px;
  transition: transform 0.2s;
  border: 1px solid #222;
}

.formula-item:hover {
  transform: translateX(4px);
  background: #202020;
}

.formula-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.formula-name {
  font-family: 'JetBrains Mono', monospace;
  font-weight: bold;
  font-size: 0.9rem;
  white-space: nowrap;
}

.formula-input {
  flex: 1;
  background: transparent;
  border: none;
  border-bottom: 1px solid #333;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.95rem;
  padding: 6px 0;
}

.formula-input:focus {
  outline: none;
  border-bottom-color: #00ccff;
}

.toggle-btn {
  background: #222;
  border: 1px solid #333;
  color: #666;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: #333;
  color: #fff;
  border-color: #444;
}

.error-msg {
  color: #ff4444;
  font-size: 0.75rem;
  margin-top: 6px;
  font-family: 'JetBrains Mono', monospace;
}

.controls {
  margin-top: auto;
  background: #1a1a1a;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1px solid #222;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 0.8rem;
}

.control-row label {
  flex: 1.5;
  color: #888;
  font-weight: 600;
}

.control-row input[type="range"] {
  flex: 2;
  accent-color: #00ccff;
}

.control-row span {
  width: 40px;
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
  color: #00ccff;
}

.footer {
  margin-top: 24px;
  font-size: 0.75rem;
  color: #444;
  line-height: 1.6;
}

.hint {
  color: #666;
  font-style: italic;
  margin-top: 8px;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #121212;
}

::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}
</style>
