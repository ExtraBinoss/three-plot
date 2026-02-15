import * as THREE from 'three';
import vertexShader from './vertex.glsl';
import fragmentShader from './fragment.glsl';
import { type PlotUpdateParams, type ViewportParams } from '../shared/types';
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

export class PointPlot implements Plot {
    private points: THREE.Points;
    private geometry: THREE.BufferGeometry;
    private material: THREE.ShaderMaterial;
    private params: PlotUpdateParams;

    // Plot constants
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
        this.points = this.initPoints();
    }

    private initGeometry(maxCount: number): THREE.BufferGeometry {
        const geometry = new THREE.BufferGeometry();
        const indices = new Float32Array(maxCount);
        for (let i = 0; i < maxCount; i++) {
            indices[i] = i;
        }
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

    private initPoints(): THREE.Points {
        const points = new THREE.Points(this.geometry, this.material);
        points.frustumCulled = false;
        return points;
    }

    public setParams(params: Partial<PlotUpdateParams>) {
        this.params = { ...this.params, ...params };
    }

    public update(time: number, viewport?: ViewportParams) {
        const u = this.material.uniforms as unknown as PointPlotUniforms;
        if (!u) return;

        const p = this.params;
        const elapsed = p.autoUpdate !== false ? time : 0;

        // Basic Uniforms
        this.updateUniform(u.uTime, elapsed);
        this.updateUniform(u.uFrequency, p.frequency);
        this.updateUniform(u.uAmplitude, p.amplitude);
        this.updateUniform(u.uPreset, Number(p.presetIndex));
        this.updateUniform(u.uLodFactor, p.lodFactor ?? 1.0);

        const isAdaptive = p.adaptive ?? true;
        this.updateUniform(u.uAdaptive, isAdaptive ? 1.0 : 0.0);

        if (p.color !== undefined) {
            u.uColor.value.set(p.color as any);
        }

        if (p.offset) {
            u.uOffset.value.set(p.offset.x, p.offset.y);
        }

        // Data Reduction and Culling
        const effectiveCount = this.calculateEffectiveCount(p, viewport);
        const { drawStart, drawCount } = this.calculateDrawRange(effectiveCount, p, viewport);
        
        // Point Size Calculation
        const pSize = this.calculatePointSize(p.pointSize ?? 5.0, p.count, isAdaptive);

        // Final Updates
        this.updateUniform(u.uPointSize, pSize);
        this.updateUniform(u.uCount, effectiveCount);
        this.geometry.setDrawRange(drawStart, drawCount);
    }

    private updateUniform<T>(uniform: THREE.IUniform<T>, value: T) {
        if (uniform.value !== value) {
            uniform.value = value;
        }
    }

    private calculateEffectiveCount(params: PlotUpdateParams, viewport?: ViewportParams): number {
        const useSmartSub = params.autoSubsampling ?? true;
        if (!useSmartSub || !viewport) {
            return params.count;
        }

        const ppp = params.pointsPerPixel || 2.0;
        const visibleWidthWorld = viewport.maxX - viewport.minX;
        const visibilityRatio = this.PLOT_WIDTH / Math.max(visibleWidthWorld, 0.001);
        
        const neededInView = viewport.pixelWidth * ppp;
        const totalNeeded = Math.ceil(neededInView * visibilityRatio);
        
        return Math.min(params.count, totalNeeded);
    }

    private calculateDrawRange(effectiveCount: number, params: PlotUpdateParams, viewport?: ViewportParams) {
        const useSmartCull = params.autoCulling ?? true;
        
        if (!useSmartCull || !viewport) {
            return { drawStart: 0, drawCount: effectiveCount };
        }

        const startPct = (viewport.minX - this.PLOT_MIN) / this.PLOT_WIDTH;
        const endPct = (viewport.maxX - this.PLOT_MIN) / this.PLOT_WIDTH;

        const startIndex = Math.max(0, Math.floor(startPct * (effectiveCount - 1)));
        const endIndex = Math.min(effectiveCount - 1, Math.ceil(endPct * (effectiveCount - 1)));

        if (startIndex < effectiveCount && endIndex >= 0) {
            return {
                drawStart: startIndex,
                drawCount: Math.max(1, endIndex - startIndex + 1)
            };
        }

        return { drawStart: 0, drawCount: 0 }; // Completely off-screen
    }

    private calculatePointSize(baseSize: number, totalCount: number, isAdaptive: boolean): number {
        if (!isAdaptive) return baseSize;
        return Math.max(0.1, baseSize * Math.sqrt(100000 / totalCount));
    }

    public get mesh() {
        return this.points;
    }

    public getDrawStats() {
        return {
            total: this.params.count,
            visible: this.geometry.drawRange.count
        };
    }

    public dispose() {
        this.geometry.dispose();
        if (Array.isArray(this.material)) {
            this.material.forEach(m => m.dispose());
        } else {
            this.material.dispose();
        }
    }
}
