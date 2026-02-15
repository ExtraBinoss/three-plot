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

export class FastPlot {
    private points: THREE.Points;
    private geometry: THREE.BufferGeometry;
    private material: THREE.ShaderMaterial;

    constructor(maxCount: number, baseColor: THREE.Color = new THREE.Color(0x00ff88)) {
        this.geometry = new THREE.BufferGeometry();
        
        const indices = new Float32Array(maxCount);
        for (let i = 0; i < maxCount; i++) {
            indices[i] = i;
        }

        this.geometry.setAttribute('pIndex', new THREE.BufferAttribute(indices, 1));

        this.material = new THREE.ShaderMaterial({
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

        this.points = new THREE.Points(this.geometry, this.material);
        this.points.frustumCulled = false;
        
        this.geometry.setDrawRange(0, maxCount);
    }

    public update(time: number, params: {
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
    }, viewport?: {
        pixelWidth: number;
        minX: number;
        maxX: number;
        zoom: number;
    }) {
        const u = this.material.uniforms as unknown as FastPlotUniforms;
        if (!u) return;

        if (u.uTime.value !== time) u.uTime.value = time;
        if (u.uFrequency.value !== params.frequency) u.uFrequency.value = params.frequency;
        if (u.uAmplitude.value !== params.amplitude) u.uAmplitude.value = params.amplitude;
        
        const presetVal = Number(params.presetIndex);
        if (u.uPreset.value !== presetVal) u.uPreset.value = presetVal;

        const isAdaptive = params.adaptive ?? true;
        const adaptiveVal = isAdaptive ? 1.0 : 0.0;
        if (u.uAdaptive.value !== adaptiveVal) u.uAdaptive.value = adaptiveVal;
        
        const lod = params.lodFactor ?? 1.0;
        if (u.uLodFactor.value !== lod) u.uLodFactor.value = lod;

        // Data Reduction Logic
        let effectiveCount = params.count;
        const useSmartSub = params.autoSubsampling ?? true;
        const useSmartCull = params.autoCulling ?? true;
        const ppp = params.pointsPerPixel || 2.0;

        // Plot constants
        const plotWidth = 400.0;
        const plotMin = -200.0;

        if (useSmartSub && viewport) {
            // Smart Subsampling: We want 'ppp' points per pixel in the VISIBLE area.
            // If the whole plot is 400 units and we only see 40 units (10%), 
            // we need 10x more points in total to maintain density in those 40 units.
            const visibleWidthWorld = viewport.maxX - viewport.minX;
            const visibilityRatio = plotWidth / Math.max(visibleWidthWorld, 0.001);
            
            const neededInView = viewport.pixelWidth * ppp;
            const totalNeeded = Math.ceil(neededInView * visibilityRatio);
            
            effectiveCount = Math.min(params.count, totalNeeded);
        }

        let drawStart = 0;
        let drawCount = effectiveCount;

        if (useSmartCull && viewport) {
            const startPct = (viewport.minX - plotMin) / plotWidth;
            const endPct = (viewport.maxX - plotMin) / plotWidth;

            const startIndex = Math.max(0, Math.floor(startPct * (effectiveCount - 1)));
            const endIndex = Math.min(effectiveCount - 1, Math.ceil(endPct * (effectiveCount - 1)));

            if (startIndex < effectiveCount && endIndex >= 0) {
                drawStart = startIndex;
                drawCount = Math.max(1, endIndex - startIndex + 1);
            } else {
                drawCount = 0; // Completely off-screen
            }
        }

        let pSize = params.pointSize || 5.0;
        if (isAdaptive) {
            // Stability fix: base the adaptive size on the TOTAL requested count, 
            // not the subsampled effectiveCount. This keeps size constant during zoom.
            pSize = Math.max(0.1, pSize * Math.sqrt(100000 / params.count));
        }
        
        if (u.uPointSize.value !== pSize) u.uPointSize.value = pSize;
        
        if (u.uCount.value !== effectiveCount) {
             u.uCount.value = Number(effectiveCount);
        }
        
        this.geometry.setDrawRange(drawStart, drawCount);
    }

    public get mesh() {
        return this.points;
    }
}
