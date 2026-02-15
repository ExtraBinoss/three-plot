import * as THREE from 'three';
import vertexShader from './shaders/instanced_vertex.glsl';
import fragmentShader from './shaders/instanced_fragment.glsl';
import type { FastPlotUpdateParams, ViewportParams } from './FastPlot';

interface InstancedPlotUniforms {
    uTime: THREE.IUniform<number>;
    uCount: THREE.IUniform<number>;
    uFrequency: THREE.IUniform<number>;
    uAmplitude: THREE.IUniform<number>;
    uPreset: THREE.IUniform<number>;
    uPointSize: THREE.IUniform<number>;
    uColor: THREE.IUniform<THREE.Color>;
    uLodFactor: THREE.IUniform<number>;
}

export class InstancedPlot {
    private instancedMesh: THREE.InstancedMesh;
    private geometry: THREE.InstancedBufferGeometry;
    private material: THREE.ShaderMaterial;

    private readonly PLOT_WIDTH = 400.0;

    constructor(maxCount: number, baseColor: THREE.Color = new THREE.Color(0x00ff88)) {
        // Base geometry for each "point" - a small plane
        const baseGeom = new THREE.PlaneGeometry(1, 1);
        this.geometry = new THREE.InstancedBufferGeometry();
        this.geometry.index = baseGeom.index;
        
        if (baseGeom.attributes.position) {
            this.geometry.setAttribute('position', baseGeom.attributes.position);
        }
        if (baseGeom.attributes.uv) {
            this.geometry.setAttribute('uv', baseGeom.attributes.uv);
        }

        // Add instance index attribute
        const instanceIndices = new Float32Array(maxCount);
        for (let i = 0; i < maxCount; i++) {
            instanceIndices[i] = i;
        }
        this.geometry.setAttribute('instanceIndex', new THREE.InstancedBufferAttribute(instanceIndices, 1));

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uCount: { value: Number(maxCount) },
                uFrequency: { value: 0.1 },
                uAmplitude: { value: 20 },
                uPreset: { value: 0.0 },
                uPointSize: { value: 5.0 },
                uColor: { value: baseColor.clone() },
                uLodFactor: { value: 1.0 }
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });

        this.instancedMesh = new THREE.InstancedMesh(this.geometry, this.material, maxCount);
        this.instancedMesh.frustumCulled = false;
        
        // Identity matrices for all instances
        const dummy = new THREE.Object3D();
        dummy.updateMatrix();
        for (let i = 0; i < maxCount; i++) {
            this.instancedMesh.setMatrixAt(i, dummy.matrix);
        }
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    public update(time: number, params: FastPlotUpdateParams, viewport?: ViewportParams) {
        const u = this.material.uniforms as unknown as InstancedPlotUniforms;
        if (!u) return;

        this.updateUniform(u.uTime, time);
        this.updateUniform(u.uFrequency, params.frequency);
        this.updateUniform(u.uAmplitude, params.amplitude);
        this.updateUniform(u.uPreset, Number(params.presetIndex));
        this.updateUniform(u.uLodFactor, params.lodFactor ?? 1.0);

        const isAdaptive = params.adaptive ?? true;
        
        const effectiveCount = this.calculateEffectiveCount(params, viewport);
        const { drawCount } = this.calculateDrawRange(effectiveCount);

        const pSize = this.calculatePointSize(params.pointSize ?? 5.0, params.count, isAdaptive);

        this.updateUniform(u.uPointSize, pSize);
        this.updateUniform(u.uCount, effectiveCount);

        this.instancedMesh.count = drawCount;
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

    private calculateDrawRange(effectiveCount: number) {
        return { drawCount: effectiveCount };
    }

    private calculatePointSize(baseSize: number, totalCount: number, isAdaptive: boolean): number {
        if (!isAdaptive) return baseSize;
        return Math.max(0.1, baseSize * Math.sqrt(100000 / totalCount));
    }

    public get mesh() {
        return this.instancedMesh;
    }
}
