import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { FastPlotUpdateParams, ViewportParams } from './FastPlot';

export class LinePlot {
    private line: Line2;
    private geometry: LineGeometry;
    private material: LineMaterial;
    private positions: Float32Array;

    private readonly PLOT_WIDTH = 400.0;
    private readonly PLOT_MIN = -200.0;

    constructor(maxCount: number, baseColor: THREE.Color = new THREE.Color(0x00ff88)) {
        this.geometry = new LineGeometry();
        
        // Initialize with zeros
        this.positions = new Float32Array(maxCount * 3);
        this.geometry.setPositions(this.positions);

        this.material = new LineMaterial({
            color: baseColor.getHex(),
            linewidth: 2, // in world units if dashed is false, or pixels? LineMaterial defaults to pixels
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending
        });

        this.line = new Line2(this.geometry, this.material);
        this.line.frustumCulled = false;
    }

    public update(time: number, params: FastPlotUpdateParams, viewport?: ViewportParams) {
        if (viewport) {
            this.material.resolution.set(viewport.pixelWidth, viewport.pixelHeight);
        }

        const count = params.count;
        if (this.positions.length !== count * 3) {
            this.positions = new Float32Array(count * 3);
        }

        const freq = params.frequency;
        const amp = params.amplitude;
        const preset = Math.round(params.presetIndex);
        const PI = Math.PI;

        // Note: For Line2, CPU calculation is required if we use standard setPositions
        // This is less performant than InstancedMesh GPU, but allows for connected lines
        for (let i = 0; i < count; i++) {
            const x = (i / Math.max(count - 1, 1)) * this.PLOT_WIDTH + this.PLOT_MIN;
            let y = 0;
            const t = x * freq + time;

            if (preset === 0) y = Math.sin(t) * amp;
            else if (preset === 1) y = ((t / (2 * PI) % 1 + 1) % 1 * 2 - 1) * amp;
            else if (preset === 2) y = (Math.abs(((t / (2 * PI) % 1 + 1) % 1) * 2 - 1) * 2 - 1) * amp;
            else if (preset === 3) y = (Math.floor((t / (2 * PI) % 1 + 1) % 1 + 0.5) % 2 * 2 - 1) * amp;

            const idx = i * 3;
            this.positions[idx] = x;
            this.positions[idx + 1] = y;
            this.positions[idx + 2] = 0;
        }

        this.geometry.setPositions(this.positions);
        
        // Line2 doesn't have a 'count' or 'drawRange' in the same way easy to use for data reduction
        // so we just resize the buffer or use the whole thing.
        // For line rendering, we usually want all points.
    }

    public get mesh() {
        return this.line;
    }
}
