import * as THREE from 'three';
import vertexShader from './axis_vertex.glsl';
import fragmentShader from './axis_fragment.glsl';
import { type Plot } from '../PlotContainer';
import { type TextPlot } from './TextPlot';

export interface AxisPlotParams {
    color: string | THREE.Color;
    offset: { x: number, y: number };
    tickStep: number;
    tickSize: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    labelSize: number;
    labelColor: string | THREE.Color;
    showLabels: boolean;
}

interface AxisPlotUniforms {
    uColor: THREE.IUniform<THREE.Color>;
    uOffset: THREE.IUniform<THREE.Vector2>;
    uTickStep: THREE.IUniform<number>;
    uTickSize: THREE.IUniform<number>;
    uRangeX: THREE.IUniform<THREE.Vector2>;
    uRangeY: THREE.IUniform<THREE.Vector2>;
    uZoom: THREE.IUniform<number>;
}

export class AxisPlot implements Plot<AxisPlotParams> {
    private meshObj: THREE.Mesh;
    private geometry: THREE.PlaneGeometry;
    private material: THREE.ShaderMaterial;
    private params: AxisPlotParams;
    private textEngine?: TextPlot;

    constructor(color: string | THREE.Color = '#ffffff') {
        this.params = {
            color: new THREE.Color(color),
            offset: { x: 0, y: 0 },
            tickStep: 50,
            tickSize: 8,
            minX: -200,
            maxX: 200,
            minY: -50,
            maxY: 50,
            labelSize: 0.06,
            labelColor: '#888888',
            showLabels: false
        };

        this.geometry = new THREE.PlaneGeometry(4000, 4000);
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: this.params.color },
                uOffset: { value: new THREE.Vector2(0, 0) },
                uTickStep: { value: 50 },
                uTickSize: { value: 8 },
                uRangeX: { value: new THREE.Vector2(-200, 200) },
                uRangeY: { value: new THREE.Vector2(-50, 50) },
                uZoom: { value: 1.0 }
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.meshObj = new THREE.Mesh(this.geometry, this.material);
        this.meshObj.position.z = -0.1;
    }

    public setParams(params: Partial<AxisPlotParams>): this {
        this.params = { ...this.params, ...params };
        return this;
    }

    public color(val: string | THREE.Color) { return this.setParams({ color: val }); }
    public offset(x: number, y: number) { return this.setParams({ offset: { x, y } }); }
    public ticks(step: number, size: number = 8) { return this.setParams({ tickStep: step, tickSize: size }); }
    public rangeY(min: number, max: number) { return this.setParams({ minY: min, maxY: max }); }
    public rangeX(min: number, max: number) { return this.setParams({ minX: min, maxX: max }); }
    
    public labels(tp: TextPlot, size: number = 0.06, color: string | THREE.Color = '#888') {
        this.textEngine = tp;
        return this.setParams({ showLabels: true, labelSize: size, labelColor: color });
    }

    public update(_time: number, viewport: any) {
        const u = this.material.uniforms as unknown as AxisPlotUniforms;
        if (!u) return;

        const p = this.params;
        if (p.color !== undefined) u.uColor.value.set(p.color as any);
        u.uOffset.value.set(p.offset.x, p.offset.y);
        u.uRangeX.value.set(p.minX, p.maxX);
        u.uRangeY.value.set(p.minY, p.maxY);
        this.updateUniform(u.uTickStep, p.tickStep);
        this.updateUniform(u.uTickSize, p.tickSize);
        this.updateUniform(u.uZoom, viewport.zoom);
        
        this.meshObj.position.x = viewport.minX + (viewport.maxX - viewport.minX) / 2;
        this.meshObj.position.y = p.offset.y; 

        if (p.showLabels && this.textEngine) {
            this.renderLabels();
        }
    }

    private renderLabels() {
        if (!this.textEngine) return;
        const p = this.params;
        const te = this.textEngine;
        const offX = p.offset.x;
        const offY = p.offset.y;

        // Y Labels (Left side)
        // Correct labelX to follow offset and reduced gap to 4 units
        const labelX = p.minX + offX - 4;
        te.add(p.maxY.toFixed(0), labelX, offY + p.maxY, p.labelSize, p.labelColor, "right");
        te.add("0", labelX, offY, p.labelSize, p.labelColor, "right");
        te.add(p.minY.toFixed(0), labelX, offY + p.minY, p.labelSize, p.labelColor, "right");

        // X Labels (Bottom ticks)
        // Reduced gap to 8 units below the axis
        const step = p.tickStep;
        const startX = Math.ceil(p.minX / step) * step;
        for (let x = startX; x <= p.maxX; x += step) {
            if (Math.abs(x - p.minX) < 10) continue;
            te.add(x.toString(), x + offX, offY - 8, p.labelSize * 0.8, p.labelColor, "center");
        }
    }

    private updateUniform<T>(uniform: THREE.IUniform<T>, value: T) {
        if (uniform.value !== value) uniform.value = value;
    }

    public get mesh() { return this.meshObj; }
    public getDrawStats() { return { total: 1, visible: 1 }; }
    public dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }
}
