<template>
  <div class="plotoy-container">
    <div class="canvas-side" ref="canvasSide">
      <!-- Pure CSS Grid -->
      <div class="grid-background">
        <div class="grid-minor"></div>
        <div class="grid-major"></div>
        <!-- Origin Axes -->
        <div class="axis-x"></div>
        <div class="axis-y"></div>
      </div>

      <!-- HTML Labels -->
      <div class="html-labels">
        <span class="label-y top">{{ params.amplitude.toFixed(1) }}</span>
        <span class="label-y bottom">{{ (-params.amplitude).toFixed(1) }}</span>
        <span class="label-x left">{{ (-params.width/2).toFixed(1) }}</span>
        <span class="label-x right">{{ (params.width/2).toFixed(1) }}</span>
        <span class="label-origin">0</span>
      </div>

      <PlotView :options="plotOptions" @ready="onPlotReady" />
    </div>
    
    <div class="sidebar">
      <div class="header">
        <h1>Plotoy</h1>
        <p>GPU Function Plotter</p>
      </div>
      
      <div class="formula-list">
        <div v-for="(formula, index) in formulas" :key="index" class="formula-item" :style="{ borderColor: formula.color }">
          <div class="formula-meta">
            <span class="formula-name" :style="{ color: formula.color }">f{{ index + 1 }}(x,t) =</span>
            <input 
              v-model="formula.text" 
              @input="updatePlots"
              class="formula-input"
              spellcheck="false"
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
          <label>Range X</label>
          <input type="range" v-model.number="params.width" min="2" max="200" step="0.5" @input="syncParams" />
          <span>{{ params.width }}</span>
        </div>
        <div class="control-row">
          <label>Range Y</label>
          <input type="range" v-model.number="params.amplitude" min="2" max="200" step="0.5" @input="syncParams" />
          <span>{{ params.amplitude }}</span>
        </div>
        <div class="control-row">
          <label>Thickness</label>
          <input type="range" v-model.number="params.thickness" min="0.5" max="15" step="0.5" @input="syncParams" />
          <span>{{ params.thickness.toFixed(1) }}</span>
        </div>
        <div class="control-row">
          <label>Fill Area</label>
          <input type="checkbox" v-model="params.fillEnabled" @change="syncParams" />
        </div>
        <div class="control-row" v-if="params.fillEnabled">
          <label>Fill Opacity</label>
          <input type="range" v-model.number="params.fillOpacity" min="0.0" max="1.0" step="0.05" @input="syncParams" />
          <span>{{ params.fillOpacity.toFixed(2) }}</span>
        </div>
      </div>

      <div class="footer">
        <p>Built-in: x, t, sin, cos, tan, floor, ceil, abs, min, max, sqrt, pow, noise, smoothstep</p>
        <div class="project-links">
          <a href="https://github.com/ExtraBinoss/three-plot" target="_blank">GitHub</a>
          <a href="https://www.npmjs.com/package/@extrabinoss/three-plot" target="_blank">NPM</a>
          <a href="https://extrabinoss.github.io/three-plot/" target="_blank">Docs</a>
        </div>
        <p class="hint">Middle-click to pan • Scroll to zoom</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue';
import PlotView from '../PlotView.vue';
import { type PlotContainer, type LinePlot } from '../../plot';
import { OrthographicCamera } from 'three';

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
    font: { json: 'fonts/font.json', texture: 'fonts/font.png' },
    alpha: true,
    antialias: true
};

const params = reactive({
  count: 200000, // Higher default count for smoothness
  width: 20, 
  amplitude: 12,
  thickness: 1.5,
  fillEnabled: true,
  fillOpacity: 0.1,
});

let containerInstance: PlotContainer | null = null;
let activePlots: LinePlot[] = [];

const onPlotReady = (container: PlotContainer) => {
  containerInstance = container;
  
  // Force high-quality transparency
  container.renderer.setClearColor(0x000000, 0);
  container.scene.background = null;

  if (container.camera instanceof OrthographicCamera) {
      container.camera.zoom = 25.0; 
      container.camera.updateProjectionMatrix();
  }
  
  if (container.controls) {
      container.controls.enableRotate = false;
      container.controls.enableDamping = false; // Direct response is better for math
  }
  
  rebuildScene();
};

const toggleFormula = (index: number) => {
  if (formulas.value[index]) {
    formulas.value[index].enabled = !formulas.value[index].enabled;
    updatePlots();
  }
};

const floatify = (str: string) => {
    let res = str.replace(/([a-zA-Z0-9._]+)\^([a-zA-Z0-9._]+)/g, 'pow($1, $2)');
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
      activePlots.forEach(p => p.injectPresets(injectionMap));
  }

  activePlots.forEach((plot, i) => {
      const f = formulas.value[i];
      if (f) {
          plot.preset(i + 8);
          plot.mesh.visible = f.enabled;
      }
  });
};

const rebuildScene = () => {
  if (!containerInstance) return;
  containerInstance.clear();
  activePlots = [];

  formulas.value.forEach((f, i) => {
    const p = containerInstance!.line(params.count, f.color);
    
    // Set renderOrder to ensure stable drawing order
    p.mesh.renderOrder = i;
    p.mesh.position.z = 0;
    
    // DISABLE autoSubsampling to prevent shimmering/flickering during movement
    p.setParams({ 
        autoCulling: true,       
        autoSubsampling: false, // STABLE
        lodFactor: 1.0          
    });

    p.thickness(params.thickness);

    // Initial fill state
    p.fill(f.color, params.fillEnabled ? params.fillOpacity : 0.0);
    
    activePlots.push(p);
  });

  updatePlots();
  syncParams();
};

const syncParams = () => {
  activePlots.forEach((plot, i) => {
    const f = formulas.value[i];
    plot.setParams({
        width: params.width,
        amplitude: params.amplitude,
        pointSize: params.thickness,
        autoUpdate: true,
    });
    if (f) {
      plot.fill(f.color, params.fillEnabled ? params.fillOpacity : 0.0);
    }
  });
};

onUnmounted(() => {});
</script>

<style scoped>
.plotoy-container {
  display: flex;
  width: 100%;
  height: 100vh;
  background: #000;
  color: #eee;
  font-family: 'Outfit', sans-serif;
}

.canvas-side {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #000;
}

/* --- CSS GRID SYSTEM --- */
.grid-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.grid-minor {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 10px 10px;
}

.grid-major {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 50px 50px;
}

.axis-x {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
}

.axis-y {
  position: absolute;
  left: 50%;
  top: 0;
  width: 1px;
  height: 100%;
  background: rgba(255, 255, 255, 0.2);
}

/* --- HTML LABELS --- */
.html-labels {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #444;
}

.label-y { position: absolute; left: calc(50% + 5px); }
.label-y.top { top: 10px; }
.label-y.bottom { bottom: 10px; }

.label-x { position: absolute; top: calc(50% + 5px); }
.label-x.left { left: 10px; }
.label-x.right { right: 10px; }

.label-origin { position: absolute; top: calc(50% + 5px); left: calc(50% + 5px); }

/* --- SIDEBAR --- */
.sidebar {
  width: 380px;
  background: #0a0a0a;
  border-left: 1px solid #1a1a1a;
  display: flex;
  flex-direction: column;
  padding: 24px;
  z-index: 20;
}

.header h1 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: -0.05em;
  background: linear-gradient(135deg, #fff 0%, #444 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header p {
  margin: 4px 0 24px 0;
  font-size: 0.7rem;
  color: #333;
  text-transform: uppercase;
}

.formula-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.formula-item {
  background: #0d0d0d;
  border-left: 3px solid transparent;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #151515;
}

.formula-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
}

.formula-input {
  flex: 1;
  background: transparent;
  border: none;
  border-bottom: 1px solid #222;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  padding: 4px 0;
}

.formula-input:focus {
  outline: none;
  border-bottom-color: #333;
}

.toggle-btn {
  background: #111;
  border: 1px solid #222;
  color: #333;
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.toggle-btn.active {
  color: #888;
}

.error-msg {
  color: #cc4444;
  font-size: 0.7rem;
  margin-top: 6px;
}

.controls {
  margin-top: auto;
  background: #0d0d0d;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #151515;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.75rem;
  margin-bottom: 8px;
}

.control-row label { flex: 1.5; color: #444; }
.control-row input { flex: 2; accent-color: #333; }
.control-row span { width: 40px; color: #555; font-family: monospace; text-align: right; }

.footer { margin-top: 20px; font-size: 0.65rem; color: #222; }

.project-links {
  margin-top: 10px;
  display: flex;
  gap: 15px;
}

.project-links a {
  color: #444;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.project-links a:hover {
  color: #00ccff;
}

::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-thumb { background: #222; }
</style>
