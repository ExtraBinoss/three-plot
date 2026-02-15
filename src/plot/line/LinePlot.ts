import * as THREE from 'three';
import vertexShader from './line_vertex.glsl';
import fragmentShader from './line_fragment.glsl';
import { type PlotUpdateParams, type ViewportParams } from '../shared/types';

interface LinePlotUniforms {
    uTime: THREE.IUniform<number>;
    uCount: THREE.IUniform<number>;
    uFrequency: THREE.IUniform<number>;
    uAmplitude: THREE.IUniform<number>;
    uPreset: THREE.IUniform<number>;
    uColor: THREE.IUniform<THREE.Color>;
    uLodFactor: THREE.IUniform<number>;
    uResolution: THREE.IUniform<THREE.Vector2>;
    uLineWidth: THREE.IUniform<number>;
    uOutlineColor: THREE.IUniform<THREE.Color>;
    uOutlineWidth: THREE.IUniform<number>;
    uDashScale: THREE.IUniform<number>;
}

export class LinePlot {
    private instancedMesh: THREE.InstancedMesh;
    private geometry: THREE.InstancedBufferGeometry;
    private material: THREE.ShaderMaterial;

    private readonly PLOT_WIDTH = 400.0;

    constructor(maxCount: number, baseColor: THREE.Color = new THREE.Color(0x00ff88)) {
        // Base geometry for each segment: a quad from x=-0.5 to 0.5, y=-0.5 to 0.5
        const plane = new THREE.PlaneGeometry(1, 1);
        this.geometry = new THREE.InstancedBufferGeometry();
        this.geometry.index = plane.index;
        if (plane.attributes.position) this.geometry.setAttribute('position', plane.attributes.position);
        
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
                uColor: { value: baseColor.clone() },
                uLodFactor: { value: 1.0 },
                uResolution: { value: new THREE.Vector2(100, 100) },
                uLineWidth: { value: 2.0 },
                uOutlineColor: { value: new THREE.Color(0x000000) },
                uOutlineWidth: { value: 0.0 },
                uDashScale: { value: 0.0 }
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending
        });

        this.instancedMesh = new THREE.InstancedMesh(this.geometry, this.material, maxCount);
        this.instancedMesh.frustumCulled = false;

        const dummy = new THREE.Object3D();
        dummy.updateMatrix();
        for (let i = 0; i < maxCount; i++) {
            this.instancedMesh.setMatrixAt(i, dummy.matrix);
        }
    }

    public update(time: number, params: PlotUpdateParams, viewport?: ViewportParams) {
        const u = this.material.uniforms as unknown as LinePlotUniforms;
        if (!u) return;

        if (viewport) {
            u.uResolution.value.set(viewport.pixelWidth, viewport.pixelHeight);
        }

        this.updateUniform(u.uTime, time);
        this.updateUniform(u.uFrequency, params.frequency);
        this.updateUniform(u.uAmplitude, params.amplitude);
        this.updateUniform(u.uPreset, Number(params.presetIndex));
        this.updateUniform(u.uLodFactor, params.lodFactor ?? 1.0);
        this.updateUniform(u.uLineWidth, params.pointSize ?? 2.0);
        
        if (params.color !== undefined) {
            u.uColor.value.set(params.color as any);
        }

        if (params.borderColor !== undefined) {
            u.uOutlineColor.value.set(params.borderColor as any);
        }
        this.updateUniform(u.uOutlineWidth, params.borderWidth ?? 0.0);
        this.updateUniform(u.uDashScale, params.dashScale ?? 0.0);

        const effectiveCount = this.calculateEffectiveCount(params, viewport);
        this.updateUniform(u.uCount, effectiveCount);
        
        // We need effectiveCount instances to draw effectiveCount points (actually N-1 segments)
        this.instancedMesh.count = Math.max(0, effectiveCount);
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
        const visibilityRatio = this.PLOT_WIDTH / Math.max(viewport.maxX - viewport.minX, 0.001);
        const totalNeeded = Math.ceil(viewport.pixelWidth * ppp * visibilityRatio);
        return Math.min(params.count, totalNeeded);
    }

    public get mesh() {
        return this.instancedMesh;
    }
}
