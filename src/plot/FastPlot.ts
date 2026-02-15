import * as THREE from 'three';
import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';

interface FastPlotUniforms {
    uTime: THREE.IUniform<number>;
    uCount: THREE.IUniform<number>;
    uFrequency: THREE.IUniform<number>;
    uAmplitude: THREE.IUniform<number>;
    uPreset: THREE.IUniform<number>;
    uPointSize: THREE.IUniform<number>;
    uColor: THREE.IUniform<THREE.Color>;
    uAdaptive: THREE.IUniform<number>;
    uLodFactor: THREE.IUniform<number>;
}

export interface ViewportParams {
    pixelWidth: number;
    minX: number;
    maxX: number;
    zoom: number;
}

export interface FastPlotUpdateParams {
    frequency: number;
    amplitude: number;
    presetIndex: number;
    pointSize?: number;
    count: number;
    adaptive?: boolean;
    lodFactor?: number;
    autoSubsampling?: boolean;
    autoCulling?: boolean;
    pointsPerPixel?: number;
}

export class FastPlot {
    private points: THREE.Points;
    private geometry: THREE.BufferGeometry;
    private material: THREE.ShaderMaterial;

    // Plot constants
    private readonly PLOT_WIDTH = 400.0;
    private readonly PLOT_MIN = -200.0;

    constructor(maxCount: number, baseColor: THREE.Color = new THREE.Color(0x00ff88)) {
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
                uFrequency: { value: 0.1 },
                uAmplitude: { value: 20 },
                uPreset: { value: 0.0 },
                uPointSize: { value: 5.0 },
                uColor: { value: baseColor.clone() },
                uAdaptive: { value: 1.0 }, // 1.0 = on, 0.0 = off
                uLodFactor: { value: 1.0 }
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

    public update(time: number, params: FastPlotUpdateParams, viewport?: ViewportParams) {
        const u = this.material.uniforms as unknown as FastPlotUniforms;
        if (!u) return;

        // Basic Uniforms
        this.updateUniform(u.uTime, time);
        this.updateUniform(u.uFrequency, params.frequency);
        this.updateUniform(u.uAmplitude, params.amplitude);
        this.updateUniform(u.uPreset, Number(params.presetIndex));
        this.updateUniform(u.uLodFactor, params.lodFactor ?? 1.0);

        const isAdaptive = params.adaptive ?? true;
        this.updateUniform(u.uAdaptive, isAdaptive ? 1.0 : 0.0);

        // Data Reduction and Culling
        const effectiveCount = this.calculateEffectiveCount(params, viewport);
        const { drawStart, drawCount } = this.calculateDrawRange(effectiveCount, params, viewport);
        
        // Point Size Calculation
        const pSize = this.calculatePointSize(params.pointSize ?? 5.0, params.count, isAdaptive);

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

    private calculateEffectiveCount(params: FastPlotUpdateParams, viewport?: ViewportParams): number {
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

    private calculateDrawRange(effectiveCount: number, params: FastPlotUpdateParams, viewport?: ViewportParams) {
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
        
        // Stability fix: base the adaptive size on the TOTAL requested count, 
        // not the subsampled effectiveCount. This keeps size constant during zoom.
        return Math.max(0.1, baseSize * Math.sqrt(100000 / totalCount));
    }

    public get mesh() {
        return this.points;
    }
}

