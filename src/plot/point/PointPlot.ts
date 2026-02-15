import * as THREE from 'three';
import vertexShader from './vertex.glsl';
import fragmentShader from './fragment.glsl';
import { type PointPlotParams, type ViewportParams } from '../shared/types';
import { type Plot } from '../PlotContainer';

interface PointPlotUniforms {
    uTime: THREE.IUniform<number>;
    uCount: THREE.IUniform<number>;
    uFrequency: THREE.IUniform<number>;
    uAmplitude: THREE.IUniform<number>;
    uPreset: THREE.IUniform<number>;
    uPointSize: THREE.IUniform<number>;
    uColor: THREE.IUniform<THREE.Color>;
    uAdaptive: THREE.IUniform<number>;
    uLodFactor: THREE.IUniform<number>;
    uOffset: THREE.IUniform<THREE.Vector2>;
}

export class PointPlot implements Plot<PointPlotParams> {
    private points: THREE.Points;
    private geometry: THREE.BufferGeometry;
    private material: THREE.ShaderMaterial;
    private params: PointPlotParams;

    private readonly PLOT_WIDTH = 400.0;
    private readonly PLOT_MIN = -200.0;

    constructor(maxCount: number, baseColor: THREE.Color = new THREE.Color(0x00ff88)) {
        this.params = {
            count: maxCount,
            frequency: 0.1,
            amplitude: 20,
            presetIndex: 0,
            color: baseColor.clone(),
            lodFactor: 1.0,
            pointSize: 5.0,
            adaptive: true,
            autoSubsampling: true,
            autoCulling: true
        };

        this.geometry = this.initGeometry(maxCount);
        this.material = this.initMaterial(maxCount, baseColor);
        this.points = new THREE.Points(this.geometry, this.material);
        this.points.frustumCulled = false;
    }

    private initGeometry(maxCount: number): THREE.BufferGeometry {
        const geometry = new THREE.BufferGeometry();
        const indices = new Float32Array(maxCount);
        for (let i = 0; i < maxCount; i++) indices[i] = i;
        geometry.setAttribute('pIndex', new THREE.BufferAttribute(indices, 1));
        geometry.setDrawRange(0, maxCount);
        return geometry;
    }

    private initMaterial(maxCount: number, baseColor: THREE.Color): THREE.ShaderMaterial {
        return new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uCount: { value: Number(maxCount) },
                uFrequency: { value: this.params.frequency },
                uAmplitude: { value: this.params.amplitude },
                uPreset: { value: Number(this.params.presetIndex) },
                uPointSize: { value: this.params.pointSize },
                uColor: { value: baseColor.clone() },
                uAdaptive: { value: 1.0 }, 
                uLodFactor: { value: 1.0 },
                uOffset: { value: new THREE.Vector2(0, 0) }
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending
        });
    }

    /**
     * Fluent API
     */
    public setParams(params: Partial<PointPlotParams>): this {
        this.params = { ...this.params, ...params };
        return this;
    }

    public color(val: string | THREE.Color) { return this.setParams({ color: val }); }
    public amplitude(val: number) { return this.setParams({ amplitude: val }); }
    public frequency(val: number) { return this.setParams({ frequency: val }); }
    public offset(x: number, y: number) { return this.setParams({ offset: { x, y } }); }
    public preset(index: number) { return this.setParams({ presetIndex: index }); }
    public size(val: number) { return this.setParams({ pointSize: val }); }
    public adaptive(val: boolean) { return this.setParams({ adaptive: val }); }

    public update(time: number, viewport?: ViewportParams) {
        const u = this.material.uniforms as unknown as PointPlotUniforms;
        if (!u) return;

        const p = this.params;
        const elapsed = p.autoUpdate !== false ? time : 0;

        this.updateUniform(u.uTime, elapsed);
        this.updateUniform(u.uFrequency, p.frequency);
        this.updateUniform(u.uAmplitude, p.amplitude);
        this.updateUniform(u.uPreset, Number(p.presetIndex));
        this.updateUniform(u.uLodFactor, p.lodFactor ?? 1.0);
        this.updateUniform(u.uAdaptive, p.adaptive ? 1.0 : 0.0);

        if (p.color !== undefined) u.uColor.value.set(p.color as any);
        if (p.offset) u.uOffset.value.set(p.offset.x, p.offset.y);

        const effectiveCount = this.calculateEffectiveCount(p, viewport);
        const { drawStart, drawCount } = this.calculateDrawRange(effectiveCount, p, viewport);
        const pSize = this.calculatePointSize(p.pointSize ?? 5.0, p.count, p.adaptive ?? true);

        this.updateUniform(u.uPointSize, pSize);
        this.updateUniform(u.uCount, effectiveCount);
        this.geometry.setDrawRange(drawStart, drawCount);
    }

    private updateUniform<T>(uniform: THREE.IUniform<T>, value: T) {
        if (uniform.value !== value) uniform.value = value;
    }

    private calculateEffectiveCount(params: PointPlotParams, viewport?: ViewportParams): number {
        if (!(params.autoSubsampling ?? true) || !viewport) return params.count;
        const ppp = params.pointsPerPixel || 2.0;
        const visibilityRatio = this.PLOT_WIDTH / Math.max(viewport.maxX - viewport.minX, 0.001);
        return Math.min(params.count, Math.ceil(viewport.pixelWidth * ppp * visibilityRatio));
    }

    private calculateDrawRange(effectiveCount: number, params: PointPlotParams, viewport?: ViewportParams) {
        if (!(params.autoCulling ?? true) || !viewport) return { drawStart: 0, drawCount: effectiveCount };
        const startPct = (viewport.minX - this.PLOT_MIN) / this.PLOT_WIDTH;
        const endPct = (viewport.maxX - this.PLOT_MIN) / this.PLOT_WIDTH;
        const startIndex = Math.max(0, Math.floor(startPct * (effectiveCount - 1)));
        const endIndex = Math.min(effectiveCount - 1, Math.ceil(endPct * (effectiveCount - 1)));
        return { drawStart: startIndex, drawCount: Math.max(1, endIndex - startIndex + 1) };
    }

    private calculatePointSize(baseSize: number, totalCount: number, isAdaptive: boolean): number {
        if (!isAdaptive) return baseSize;
        return Math.max(0.1, baseSize * Math.sqrt(100000 / totalCount));
    }

    public get mesh() { return this.points; }
    public getDrawStats() { return { total: this.params.count, visible: this.geometry.drawRange.count }; }

    public dispose() {
        this.geometry.dispose();
        if (Array.isArray(this.material)) {
            this.material.forEach(m => m.dispose());
        } else {
            this.material.dispose();
        }
    }
}
