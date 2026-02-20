<template>
  <div class="app">
    <div class="header" v-if="currentDemo !== 'plotoy'">
      <div class="logo">ThreePlot <span class="version">v1.2.0</span></div>
      <div class="tagline">GPU-Accelerated Data Visualization</div>
      
      <div class="demo-selector">
        <button 
          v-for="demo in demos" 
          :key="demo.id"
          :class="{ active: currentDemo === demo.id }"
          @click="currentDemo = demo.id"
        >
          {{ demo.name }}
        </button>
      </div>
    </div>

    <div class="content">
      <ShowcaseDemo v-if="currentDemo === 'showcase'" />
      <RGBDemo v-else-if="currentDemo === 'rgb'" />
      <PlotoyDemo v-else-if="currentDemo === 'plotoy'" />
      <SurfaceDemo v-else-if="currentDemo === 'surface'" />
    </div>
    
    <div class="demo-switcher-minimal" v-if="currentDemo === 'plotoy'">
        <button @click="currentDemo = 'showcase'">← Back to Showcase</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ShowcaseDemo from './components/demos/ShowcaseDemo.vue';
import RGBDemo from './components/demos/RGBDemo.vue';
import PlotoyDemo from './components/demos/PlotoyDemo.vue';
import SurfaceDemo from './components/demos/SurfaceDemo.vue';

const currentDemo = ref('plotoy');
const demos = [
  { id: 'plotoy', name: 'Plotoy' },
  { id: 'showcase', name: 'Showcase' },
  { id: 'rgb', name: 'RGB Channels' },
  { id: 'surface', name: '3D Surface' }
];
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap');

body, html, #app, .app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #050505;
  color: white;
  font-family: 'Outfit', sans-serif;
}

.app {
  display: flex;
  flex-direction: column;
}

.header {
  position: absolute;
  top: 24px;
  left: 30px;
  z-index: 100;
  pointer-events: none;
}

.logo {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fff 0%, #888 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  display: flex;
  align-items: center;
  gap: 8px;
}

.version {
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  color: #888;
  -webkit-text-fill-color: initial;
}

.tagline {
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 4px;
}

.demo-selector {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  pointer-events: auto;
}

.demo-selector button {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #888;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  transition: all 0.2s ease;
}

.demo-selector button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.demo-selector button.active {
  background: #00ccff;
  border-color: #00ccff;
  color: #000;
  font-weight: 700;
}

.demo-switcher-minimal {
    position: absolute;
    bottom: 24px;
    left: 24px;
    z-index: 100;
}

.demo-switcher-minimal button {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #eee;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12px;
    cursor: pointer;
    font-weight: 600;
    backdrop-filter: blur(10px);
}

.demo-switcher-minimal button:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: #00ccff;
}

.content {
  width: 100%;
  height: 100vh;
}
</style>
