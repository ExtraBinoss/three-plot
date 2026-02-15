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

// Add a line plot with 100,000 points
const myLine = container.line(100000, '#00ff88')
  .amplitude(50)
  .frequency(0.02)
  .preset(4);

// Add a point plot on the same canvas
const myPoints = container.point(500000, '#ff4400')
  .size(2.0)
  .adaptive(true)
  .offset(0, -100);
```

### Chaining & Updates

```typescript
// Update parameters on the fly
myLine.amplitude(70).color('#ff00ff').offset(10, 20);

// Unified parameter object also supported
myPoints.setParams({
  count: 1000000,
  autoCulling: true
});
```

## ✅ What it does well
- High-frequency real-time updates (oscilloscopes, heart-rate monitors).
- Visualizing datasets from 10k to 10M+ points at 60 FPS.
- Multi-plot overlays on a single WebGL context.
- Flexible coordinate system with built-in zoom and pan.

## ❌ What it is NOT (yet)
- Not a general-purpose charting library (no automatic axes, labels, or legends out of the box).
- Not designed for 3D scatter plots (currently optimized for 2D data visualization in a 3D engine).
- No built-in data connectors (you provide the logic/presets for now).

## 🔧 Extensibility

ThreePlot is built with a Registry/Factory pattern. You can implement the `Plot` interface to create your own GPU-accelerated visualizations (e.g., area plots, heatmaps) and register them into the `PlotContainer`.

## 📦 Project Structure
- `src/plot/PlotContainer.ts`: The orchestrator and scene manager.
- `src/plot/line/`: Instanced line engine with GLSL shaders.
- `src/plot/point/`: GPU subsampled point engine with GLSL shaders.
- `src/components/`: Vue.js showcase and demo components.

---
Developed with performance and DX in mind.
