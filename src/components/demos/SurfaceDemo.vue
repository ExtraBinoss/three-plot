<template>
  <div class="demo-container">
    <PlotView :options="plotOptions" @ready="onPlotReady" />
    <div class="stats" v-if="stats">
      <div class="stat-group">
        <div class="stat-main">{{ fps }} <span class="unit">FPS</span> <span class="ms">({{ frameTime.toFixed(1) }}ms)</span></div>
        <div class="stat-sub">{{ drawStats.total.toLocaleString() }} total faces</div>
      </div>
      
      <div class="hint">3D Surface Engine Active</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import GUI from 'lil-gui';
import PlotView from '../PlotView.vue';
import { type PlotContainer, type SurfacePlot, type AxisPlot } from '../../plot';
import { PerspectiveCamera } from 'three';

const presets = ['Ripple', 'Cross Wave', 'Orbital Sine', 'Terrain Noise'];

const plotOptions = {
    font: { json: 'fonts/font.json', texture: 'fonts/font.png' },
    antialias: true
};

const params = reactive({
  segments: 150, 
  preset: 'Orbital Sine',
  presetIndex: 2,
  frequency: 0.1,
  amplitude: 20,
  width: 400,
  depth: 400,
  wireframe: false,
  autoUpdate: true,
  colormapName: 'Heat',
  showAxis: true,
  axisColor: '#ffffff',
  customGLSL: 'sin(sqrt(x*x+y*y) - t * 3.0) * cos(y - t) * 0.5'
});

const colormaps: Record<string, string[]> = {
  'Heat': ['#0000ff', '#00ffff', '#00ff00', '#ffff00', '#ff0000'],
  'Ocean': ['#000033', '#0000ff', '#00ffff', '#ffffff'],
  'Magma': ['#000000', '#550055', '#ff0055', '#ffff00'],
  'Monochrome': []
};

let containerInstance: PlotContainer | null = null;
let activePlot: SurfacePlot | null = null;
let activeAxis: AxisPlot | null = null;
let gui: GUI | null = null;
let presetControl: any = null;

const stats = ref(true);
const fps = ref(0);
const frameTime = ref(0);
const drawStats = reactive({ total: 0, visible: 0 });
let lastTime = performance.now();
let frames = 0;

const onPlotReady = (container: PlotContainer) => {
  containerInstance = container;
  
  // Use a perspective camera for 3D
  container.camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 5000);
  container.camera.position.set(250, 250, 450);
  container.camera.lookAt(0, 0, 0);
  if (container.controls) {
    container.controls.object = container.camera;
    container.controls.enableRotate = true; // allow 3D rotation
  }
  
  rebuildScene();
  
  container.onUpdate = (time) => {
    const start = performance.now();
    frames++;
    if (time >= lastTime + 1000) {
      fps.value = Math.round((frames * 1000) / (time - lastTime));
      lastTime = time;
      frames = 0;
    }
    
    if (activePlot) {
      const s = activePlot.getDrawStats();
      drawStats.total = s.total;
      drawStats.visible = s.visible;
    }
    
    frameTime.value = performance.now() - start;
  };
};

const rebuildScene = () => {
  if (!containerInstance) return;
  
  containerInstance.clear();

  // 1. Setup Axis
  if (params.showAxis) {
      activeAxis = containerInstance.axis(params.axisColor)
                    .ticks(50, 8)
                    .thickness(0.8)
                    .rangeX(-params.width/2, params.width/2)
                    .rangeY(-params.amplitude*1.5, params.amplitude*1.5);
  } else {
      activeAxis = null;
  }

  // 2. Setup Plot
  activePlot = containerInstance.surface(params.segments, '#ffffff')
    .dimensions(params.width, params.depth)
    .colormap(colormaps[params.colormapName] || []);
  
  syncParams();
};

const syncParams = () => {
  if (activePlot) {
    activePlot.setParams({
        frequency: params.frequency,
        amplitude: params.amplitude,
        width: params.width,
        depth: params.depth,
        presetIndex: params.presetIndex,
        wireframe: params.wireframe,
        autoUpdate: params.autoUpdate,
        colormap: colormaps[params.colormapName] || []
    });
  }
};

watch(
  () => ({ segments: params.segments, showAxis: params.showAxis }),
  () => { rebuildScene(); }
);

watch(
  () => ({
    frequency: params.frequency, 
    amplitude: params.amplitude, 
    width: params.width, 
    depth: params.depth,
    wireframe: params.wireframe,
    presetIndex: params.presetIndex,
    autoUpdate: params.autoUpdate,
    colormapName: params.colormapName
  }),
  () => { syncParams(); }
);

const setupGui = () => {
  gui = new GUI();
  
  const folderData = gui.addFolder('Geometry & Function');
  presetControl = folderData.add(params, 'preset', presets).name('Formula').onChange((val: string) => {
    params.presetIndex = presets.indexOf(val) >= 0 ? presets.indexOf(val) < 8 ? presets.indexOf(val) : presets.indexOf(val) - 4 + 8 : 0; // mapping since index 8 is custom
    if (presets.indexOf(val) >= 4) {
      params.presetIndex = 8 + (presets.indexOf(val) - 4);
    } else {
      params.presetIndex = presets.indexOf(val);
    }
  });
  folderData.add(params, 'segments', 10, 500, 10).name('Grid Resolution');
  folderData.add(params, 'width', 100, 2000, 10).name('Width (X)');
  folderData.add(params, 'depth', 100, 2000, 10).name('Depth (Y)');
  folderData.add(params, 'amplitude', 1, 200, 1).name('Amplitude (Z)');
  folderData.add(params, 'frequency', 0.01, 1.0, 0.01).name('Frequency');

  const folderStyle = gui.addFolder('Style & Shading');
  folderStyle.add(params, 'colormapName', Object.keys(colormaps)).name('Color Map');
  folderStyle.add(params, 'wireframe').name('Wireframe');
  folderStyle.add(params, 'autoUpdate').name('Animate');

  const folderCustom = gui.addFolder('Custom Preset (GLSL)');
  folderCustom.add(params, 'customGLSL').name('GLSL Code');
  folderCustom.add({ add: () => {
    if (!containerInstance) return;
    const name = `Custom_${presets.length}`;
    containerInstance.registerPreset(name, params.customGLSL);
    presets.push(name);
    if (presetControl) {
        presetControl.options(presets);
    }
    params.preset = name;
    params.presetIndex = 8 + (presets.length - 1 - 4);
    activePlot?.preset(params.presetIndex);
  } }, 'add').name('Register & Use');

  const folderWorld = gui.addFolder('World');
  folderWorld.add(params, 'showAxis').name('Show Axis');
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
.hint { font-size: 9px; color: #444; margin-top: 15px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; }
</style>
