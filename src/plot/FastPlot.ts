import * as THREE from 'three';
import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';
import { Profiler, type ProfilingData } from './Profiler';

interface FastPlotUniforms {
    uTime: THREE.IUniform<number>;
    uCount: THREE.IUniform<number>;
    uFrequency: THREE.IUniform<number>;
    uAmplitude: THREE.IUniform<number>;
    uPreset: THREE.IUniform<number>;
    uPointSize: THREE.IUniform<number>;
    uColor: THREE.IUniform<THREE.Color>;
}

export class FastPlot {
    private points: THREE.Points;
    private geometry: THREE.BufferGeometry;
    private material: THREE.ShaderMaterial;
    private profiler: Profiler;

    constructor(maxCount: number, baseColor: THREE.Color = new THREE.Color(0x00ff88)) {
        this.profiler = new Profiler();
        
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
                uColor: { value: baseColor.clone() }
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
    }) {
        this.profiler.beginUpdate();

        const u = this.material.uniforms as unknown as FastPlotUniforms;
        if (!u) return;

        if (u.uTime.value !== time) u.uTime.value = time;
        if (u.uFrequency.value !== params.frequency) u.uFrequency.value = params.frequency;
        if (u.uAmplitude.value !== params.amplitude) u.uAmplitude.value = params.amplitude;
        
        const presetVal = Number(params.presetIndex);
        if (u.uPreset.value !== presetVal) u.uPreset.value = presetVal;

        const pSize = params.pointSize || 5.0;
        if (u.uPointSize.value !== pSize) u.uPointSize.value = pSize;
        
        if (u.uCount.value !== params.count) {
             u.uCount.value = Number(params.count);
             this.geometry.setDrawRange(0, params.count);
        }

        this.profiler.endUpdate();
    }

    public get mesh() {
        return this.points;
    }

    public get profiling(): ProfilingData {
        const data = this.profiler.current;
        const u = this.material.uniforms as unknown as FastPlotUniforms;
        data.pointsCount = u ? u.uCount.value : 0;
        return data;
    }
}
