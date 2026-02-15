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
    }) {
        const u = this.material.uniforms as unknown as FastPlotUniforms;
        if (!u) return;

        if (u.uTime.value !== time) u.uTime.value = time;
        if (u.uFrequency.value !== params.frequency) u.uFrequency.value = params.frequency;
        if (u.uAmplitude.value !== params.amplitude) u.uAmplitude.value = params.amplitude;
        
        const presetVal = Number(params.presetIndex);
        if (u.uPreset.value !== presetVal) u.uPreset.value = presetVal;

        const isAdaptive = params.adaptive ?? true;
        u.uAdaptive.value = isAdaptive ? 1.0 : 0.0;
        
        const lod = params.lodFactor ?? 1.0;
        if (u.uLodFactor.value !== lod) u.uLodFactor.value = lod;

        let pSize = params.pointSize || 5.0;
        if (isAdaptive) {
            // formula: uPointSize = Math.max(1.0, baseSize * Math.sqrt(100_000 / count))
            pSize = Math.max(0.5, pSize * Math.sqrt(100000 / params.count));
        }
        if (u.uPointSize.value !== pSize) u.uPointSize.value = pSize;
        
        if (u.uCount.value !== params.count) {
             u.uCount.value = Number(params.count);
             this.geometry.setDrawRange(0, params.count);
        }
    }

    public get mesh() {
        return this.points;
    }
}
