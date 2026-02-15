# 🎮 [Interactive Playground](https://binos.github.io/three-plot/)

# ThreePlot

A lightweight, high-performance GPU-accelerated data visualization library for the web, powered by Three.js.

ThreePlot is designed for real-time visualization of massive datasets (millions of points) where standard SVG or Canvas-based solutions fail.

## 🚀 Key Performance Features

- **GPU Subsampling**: Smart data reduction performed on the GPU to maintain high FPS regardless of total point count.
- **Instanced Rendering**: Lines are rendered as hardware-instanced quads (not `THREE.Line` or `THREE.Line2`), allowing for thick, beautiful, and efficient segments.
- **Frustum Culling**: Automatic drawing range calculation to skip data points outside the viewport.
- **Tree-shakeable**: Minimal Three.js dependency footprint.
- **Managed Lifecycle**: Automatic GPU memory management (geometry/material disposal).

## 🛠️ Usage

### Installation

```bash
npm install three-plot
```

### Basic Example (Fluent API)

```typescript
import { ThreePlot } from 'three-plot';

const container = ThreePlot.init(document.getElementById('plot-container'));

// Add an Axis
container.axis('#ffffff')
  .ticks(50, 8)
  .subTicks(5)
  .thickness(1.5);

// Add a line plot with 100,000 points
const myLine = container.line(100000, '#00ff88')
  .amplitude(50)
  .frequency(0.02)
  .preset(4);
```

## 🔧 Shaders & Custom Signals

ThreePlot uses external GLSL shaders bundled at build time. If you are consuming the library and want to use custom shaders or modify existing ones, ensure your build tool (like Vite or Webpack) can handle `.glsl` imports.

In a Vite project, we recommend `vite-plugin-glsl`:
```typescript
import glsl from 'vite-plugin-glsl';
export default { plugins: [glsl()] };
```

### Custom Presets on-the-fly
You can register your own GPU signals without re-building:
```typescript
container.registerPreset('MyWave', 'sin(t + x * 0.1) * uAmplitude');
myLine.preset(8); // Custom presets start at index 8
```

## ✅ What it does well
- High-frequency real-time updates (oscilloscopes, heart-rate monitors).
- Visualizing datasets from 10k to 10M+ points at 60 FPS.
- Multi-plot overlays on a single WebGL context.
- Flexible coordinate system with built-in zoom and pan.
- Built-in Axes and MSDF Labels for performance.

## 📦 Project Structure
- `src/plot/PlotContainer.ts`: The orchestrator and scene manager.
- `src/plot/line/`: Instanced line engine with GLSL shaders.
- `src/plot/point/`: GPU subsampled point engine with GLSL shaders.
- `src/components/`: Vue.js showcase and demo components.

---
Developed with performance and DX in mind.
