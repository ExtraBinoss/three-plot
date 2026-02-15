import * as THREE from 'three';
import vertexShader from './line_vertex.glsl';
import fragmentShader from './line_fragment.glsl';
import { type LinePlotParams, type ViewportParams } from '../shared/types';
import { type Plot } from '../PlotContainer';

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
    uOffset: THREE.IUniform<THREE.Vector2>;
}

export class LinePlot implements Plot<LinePlotParams> {
    private instancedMesh: THREE.InstancedMesh;
    private geometry: THREE.InstancedBufferGeometry;
    private material: THREE.ShaderMaterial;
    private params: LinePlotParams;

    private readonly PLOT_WIDTH = 400.0;

    constructor(maxCount: number, baseColor: THREE.Color = new THREE.Color(0x00ff88)) {
        this.params = {
            count: maxCount,
            frequency: 0.1,
            amplitude: 20,
            presetIndex: 0,
            color: baseColor.clone(),
            lodFactor: 1.0,
            pointSize: 2.0
        };

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
                uFrequency: { value: this.params.frequency },
                uAmplitude: { value: this.params.amplitude },
                uPreset: { value: Number(this.params.presetIndex) },
                uColor: { value: baseColor.clone() },
                uLodFactor: { value: 1.0 },
                uResolution: { value: new THREE.Vector2(100, 100) },
                uLineWidth: { value: 2.0 },
                uOutlineColor: { value: new THREE.Color(0x000000) },
                uOutlineWidth: { value: 0.0 },
                uDashScale: { value: 0.0 },
                uOffset: { value: new THREE.Vector2(0, 0) }
            },
            vertexShader,
            fragmentShader,
            transparent: false,
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

    /**
     * Fluent API for parameters
     */
    public setParams(params: Partial<LinePlotParams>): this {
        this.params = { ...this.params, ...params };
        return this;
    }

    // Specific fluent shortcuts
    public color(val: string | THREE.Color) { return this.setParams({ color: val }); }
    public amplitude(val: number) { return this.setParams({ amplitude: val }); }
    public frequency(val: number) { return this.setParams({ frequency: val }); }
    public offset(x: number, y: number) { return this.setParams({ offset: { x, y } }); }
    public preset(index: number) { return this.setParams({ presetIndex: index }); }

    public update(time: number, viewport?: ViewportParams) {
        const u = this.material.uniforms as unknown as LinePlotUniforms;
        if (!u) return;

        if (viewport) {
            u.uResolution.value.set(viewport.pixelWidth, viewport.pixelHeight);
        }

        const p = this.params;
        const elapsed = p.autoUpdate !== false ? time : 0;

        this.updateUniform(u.uTime, elapsed);
        this.updateUniform(u.uFrequency, p.frequency);
        this.updateUniform(u.uAmplitude, p.amplitude);
        this.updateUniform(u.uPreset, Number(p.presetIndex));
        this.updateUniform(u.uLodFactor, p.lodFactor ?? 1.0);
        this.updateUniform(u.uLineWidth, p.pointSize ?? 2.0);
        
        if (p.color !== undefined) {
            u.uColor.value.set(p.color as any);
        }

        if (p.borderColor !== undefined) {
            u.uOutlineColor.value.set(p.borderColor as any);
        }
        this.updateUniform(u.uOutlineWidth, p.borderWidth ?? 0.0);
        this.updateUniform(u.uDashScale, p.dashScale ?? 0.0);

        if (p.offset) {
            u.uOffset.value.set(p.offset.x, p.offset.y);
        }

        const effectiveCount = this.calculateEffectiveCount(p, viewport);
        this.updateUniform(u.uCount, effectiveCount);
        this.instancedMesh.count = Math.max(0, effectiveCount);
    }

    private updateUniform<T>(uniform: THREE.IUniform<T>, value: T) {
        if (uniform.value !== value) uniform.value = value;
    }

    private calculateEffectiveCount(params: LinePlotParams, viewport?: ViewportParams): number {
        const ppp = 2.0; // Hardcoded or from params
        if (!viewport) return params.count;
        const visibilityRatio = this.PLOT_WIDTH / Math.max(viewport.maxX - viewport.minX, 0.001);
        const totalNeeded = Math.ceil(viewport.pixelWidth * ppp * visibilityRatio);
        return Math.min(params.count, totalNeeded);
    }

    public get mesh() { return this.instancedMesh; }

    public getDrawStats() {
        return { total: this.params.count, visible: this.instancedMesh.count };
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
