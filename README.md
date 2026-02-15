# 🎮 [Interactive Playground](https://extrabinoss.github.io/three-plot/)

# ThreePlot

A lightweight, high-performance GPU-accelerated data visualization library for the web, powered by Three.js.

ThreePlot is designed for real-time visualization of massive datasets (millions of points) where standard SVG or Canvas-based solutions fail.

[![NPM Version](https://img.shields.io/npm/v/@extrabinoss/three-plot)](https://www.npmjs.com/package/@extrabinoss/three-plot)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.MD)

## 🔗 Links

- **NPM Package**: [@extrabinoss/three-plot](https://www.npmjs.com/package/@extrabinoss/three-plot)
- **Interactive Docs & Demo**: [Live Website](https://extrabinoss.github.io/three-plot/)
- **Source Code**: [GitHub Repository](https://github.com/ExtraBinoss/three-plot)

## 🚀 Key Performance Features

- **GPU Subsampling**: Smart data reduction performed on the GPU to maintain high FPS regardless of total point count.
- **Instanced Rendering**: Lines are rendered as hardware-instanced quads (not `THREE.Line` or `THREE.Line2`), allowing for thick, beautiful, and efficient segments.
- **Frustum Culling**: Automatic drawing range calculation to skip data points outside the viewport.
- **Tree-shakeable**: Minimal Three.js dependency footprint.
- **Managed Lifecycle**: Automatic GPU memory management (geometry/material disposal).

## 🛠️ Usage

### Installation

```bash
npm install @extrabinoss/three-plot
```

### Basic Example (Fluent API)

```typescript
import { ThreePlot } from '@extrabinoss/three-plot';

const container = ThreePlot.init(document.getElementById('plot-container'), {
  font: { json: '/fonts/font.json', texture: '/fonts/font.png' }
});

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

### 🔡 Fonts Configuration (MSDF)

ThreePlot uses **Multi-channel Signed Distance Fields (MSDF)** for high-performance text rendering.

To use labels, you must provide a font configuration during initialization:
```typescript
const container = ThreePlot.init(element, {
  font: {
    json: '/fonts/font.json',
    texture: '/fonts/font.png'
  }
});
```

## 🔧 Shaders & Custom Signals

ThreePlot uses external GLSL shaders bundled at build time.

### Custom Presets on-the-fly
You can register your own GPU signals without re-building. This allows you to define complex math directly in GLSL:
```typescript
container.registerPreset('MyWave', 'sin(t + x * 0.1) * uAmplitude');
myLine.preset(8); // Custom presets start at index 8
```

## 📈 Plotoy Demo
Included in the project is **Plotoy**, a GraphToy-inspired interactive functional plotter. It supports:
- Multiple function definitions (`f1`, `f2`...)
- Cross-function referencing (e.g., `f2(x,t) = sin(f1(x,t))`)
- Real-time GLSL parsing and injection
- High-zoom mathematical precision

## 📄 License
This project is licensed under the [MIT License](LICENSE.MD).
