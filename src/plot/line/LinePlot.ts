import vertexShader from './line_vertex.glsl';
import fragmentShader from './line_fragment.glsl';
import areaVertexShader from './area_vertex.glsl';
import areaFragmentShader from './area_fragment.glsl';
import { type LinePlotParams, type ViewportParams } from '../shared/types';
import { type Plot } from '../PlotContainer';
import { type IUniform, Color, Vector2, InstancedMesh, InstancedBufferGeometry, ShaderMaterial, PlaneGeometry, InstancedBufferAttribute, NormalBlending, Object3D, Group, DoubleSide } from 'three';

interface LinePlotUniforms {
    uTime: IUniform<number>;
    uCount: IUniform<number>;
    uFrequency: IUniform<number>;
    uAmplitude: IUniform<number>;
    uPlotWidth: IUniform<number>;
    uPreset: IUniform<number>;
    uColor: IUniform<Color>;
    uLodFactor: IUniform<number>;
    uResolution: IUniform<Vector2>;
    uLineWidth: IUniform<number>;
    uOutlineColor: IUniform<Color>;
    uOutlineWidth: IUniform<number>;
    uDashScale: IUniform<number>;
    uOffset: IUniform<Vector2>;
}

interface AreaPlotUniforms {
    uTime: IUniform<number>;
    uCount: IUniform<number>;
    uFrequency: IUniform<number>;
    uAmplitude: IUniform<number>;
    uPlotWidth: IUniform<number>;
    uPreset: IUniform<number>;
    uColor: IUniform<Color>;
    uFillOpacity: IUniform<number>;
    uLodFactor: IUniform<number>;
    uResolution: IUniform<Vector2>;
    uOffset: IUniform<Vector2>;
}

export class LinePlot implements Plot<LinePlotParams> {
    private instancedMesh: InstancedMesh;
    private areaMesh: InstancedMesh;
    private group: Group;
    private geometry: InstancedBufferGeometry;
    private material: ShaderMaterial;
    private areaMaterial: ShaderMaterial;
    private params: LinePlotParams;
    private static customFunctions: string = "";
    private static customCases: string = "else { y = 0.0; }";

    constructor(maxCount: number, baseColor: Color = new Color(0x00ff88)) {
        this.params = {
            count: maxCount,
            frequency: 0.1,
            amplitude: 20,
            width: 400,
            presetIndex: 0,
            color: baseColor.clone(),
            lodFactor: 1.0,
            pointSize: 2.0,
            autoSubsampling: true,
            autoCulling: true
        };

        const plane = new PlaneGeometry(1, 1);
        this.geometry = new InstancedBufferGeometry();
        this.geometry.index = plane.index;
        if (plane.attributes.position) this.geometry.setAttribute('position', plane.attributes.position);
        
        const instanceIndices = new Float32Array(maxCount);
        for (let i = 0; i < maxCount; i++) instanceIndices[i] = i;
        this.geometry.setAttribute('instanceIndex', new InstancedBufferAttribute(instanceIndices, 1));

        this.material = new ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uCount: { value: Number(maxCount) },
                uFrequency: { value: this.params.frequency },
                uAmplitude: { value: this.params.amplitude },
                uPlotWidth: { value: 400 },
                uPreset: { value: Number(this.params.presetIndex) },
                uColor: { value: baseColor.clone() },
                uLodFactor: { value: 1.0 },
                uResolution: { value: new Vector2(100, 100) },
                uLineWidth: { value: 2.0 },
                uOutlineColor: { value: new Color(0x000000) },
                uOutlineWidth: { value: 0.0 },
                uDashScale: { value: 0.0 },
                uOffset: { value: new Vector2(0, 0) }
            },
            vertexShader: this.compileVertexShader(),
            fragmentShader,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: NormalBlending
        });

        this.instancedMesh = new InstancedMesh(this.geometry, this.material, maxCount);
        this.instancedMesh.frustumCulled = false;

        this.areaMaterial = new ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uCount: { value: Number(maxCount) },
                uFrequency: { value: this.params.frequency },
                uAmplitude: { value: this.params.amplitude },
                uPlotWidth: { value: 400 },
                uPreset: { value: Number(this.params.presetIndex) },
                uColor: { value: baseColor.clone() },
                uFillOpacity: { value: 0.0 }, // default hidden
                uLodFactor: { value: 1.0 },
                uResolution: { value: new Vector2(100, 100) },
                uOffset: { value: new Vector2(0, 0) }
            },
            vertexShader: this.compileAreaVertexShader(),
            fragmentShader: areaFragmentShader,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            side: DoubleSide,
            blending: NormalBlending
        });

        this.areaMesh = new InstancedMesh(this.geometry, this.areaMaterial, maxCount);
        this.areaMesh.frustumCulled = false;

        const dummy = new Object3D();
        dummy.updateMatrix();
        for (let i = 0; i < maxCount; i++) {
            this.instancedMesh.setMatrixAt(i, dummy.matrix);
            this.areaMesh.setMatrixAt(i, dummy.matrix);
        }

        this.group = new Group();
        this.group.add(this.areaMesh);
        this.group.add(this.instancedMesh);

        // Intercept renderOrder to make sure children get sorted correctly.
        Object.defineProperty(this.group, 'renderOrder', {
            get: () => this.instancedMesh.renderOrder,
            set: (v: number) => {
                this.areaMesh.renderOrder = v;
                // Add a small offset so the line always renders on top of its own fill
                this.instancedMesh.renderOrder = v + 0.1;
            }
        });
    }

    private compileVertexShader(): string {
        let v = vertexShader.replace(
            "#define CUSTOM_FUNCTIONS",
            LinePlot.customFunctions || ""
        );
        v = v.replace(
            /else\s*{\s*y\s*=\s*0\.0;\s*}/g,
            LinePlot.customCases || "else { y = 0.0; }"
        );
        return v;
    }

    private compileAreaVertexShader(): string {
        let v = areaVertexShader.replace(
            "#define CUSTOM_FUNCTIONS",
            LinePlot.customFunctions || ""
        );
        v = v.replace(
            /else\s*{\s*y\s*=\s*0\.0;\s*}/g,
            LinePlot.customCases || "else { y = 0.0; }"
        );
        return v;
    }

    public setParams(params: Partial<LinePlotParams>): this {
        this.params = { ...this.params, ...params };
        return this;
    }

    public color(val: string | Color) { return this.setParams({ color: val }); }
    public amplitude(val: number) { return this.setParams({ amplitude: val }); }
    public frequency(val: number) { return this.setParams({ frequency: val }); }
    public width(val: number) { return this.setParams({ width: val }); }
    public offset(x: number, y: number) { return this.setParams({ offset: { x, y } }); }
    public preset(index: number) { return this.setParams({ presetIndex: index }); }
    public fill(color?: string | Color, opacity: number = 0.2) { 
        return this.setParams({ fillColor: color || this.params.color, fillOpacity: opacity }); 
    }
    public thickness(val: number) { return this.setParams({ pointSize: val }); }
    public size(val: number) { return this.setParams({ pointSize: val }); }

    public injectPresets(customPresets: Map<string, string>) {
        let funcs = "";
        let cases = "";
        
        customPresets.forEach((_, name) => {
            funcs += `float ${name}(float x, float t);\n`;
        });
        funcs += "\n";

        let index = 8;
        customPresets.forEach((glsl, name) => {
            funcs += `float ${name}(float x, float t) { return ${glsl}; }\n`;
            cases += `else if (preset == ${index}) { y = ${name}(x, uTime); }\n`;
            index++;
        });
        cases += "else { y = 0.0; }";

        LinePlot.customFunctions = funcs;
        LinePlot.customCases = cases;

        const newVertex = this.compileVertexShader();
        if (this.material.vertexShader !== newVertex) {
            this.material.vertexShader = newVertex;
            this.material.needsUpdate = true;
        }

        const newAreaVertex = this.compileAreaVertexShader();
        if (this.areaMaterial.vertexShader !== newAreaVertex) {
            this.areaMaterial.vertexShader = newAreaVertex;
            this.areaMaterial.needsUpdate = true;
        }
    }

    public update(time: number, viewport?: ViewportParams) {
        const u = this.material.uniforms as unknown as LinePlotUniforms;
        if (!u) return;

        if (viewport) u.uResolution.value.set(viewport.pixelWidth, viewport.pixelHeight);

        const p = this.params;
        const elapsed = p.autoUpdate !== false ? time : 0;

        this.updateUniform(u.uTime, elapsed);
        this.updateUniform(u.uFrequency, p.frequency);
        this.updateUniform(u.uAmplitude, p.amplitude);
        this.updateUniform(u.uPlotWidth, p.width ?? 400);
        this.updateUniform(u.uPreset, Number(p.presetIndex));
        this.updateUniform(u.uLodFactor, p.lodFactor ?? 1.0);
        this.updateUniform(u.uLineWidth, p.pointSize ?? 2.0);
        
        if (p.color !== undefined) u.uColor.value.set(p.color as any);
        if (p.borderColor !== undefined) u.uOutlineColor.value.set(p.borderColor as any);
        this.updateUniform(u.uOutlineWidth, p.borderWidth ?? 0.0);
        this.updateUniform(u.uDashScale, p.dashScale ?? 0.0);
        if (p.offset) u.uOffset.value.set(p.offset.x, p.offset.y);

        const effectiveCount = this.calculateEffectiveCount(p, viewport);
        this.updateUniform(u.uCount, effectiveCount);
        this.instancedMesh.count = Math.max(0, effectiveCount);

        const areaU = this.areaMaterial.uniforms as unknown as AreaPlotUniforms;
        if (areaU) {
            if (viewport) areaU.uResolution.value.set(viewport.pixelWidth, viewport.pixelHeight);
            
            this.updateUniform(areaU.uTime, elapsed);
            this.updateUniform(areaU.uFrequency, p.frequency);
            this.updateUniform(areaU.uAmplitude, p.amplitude);
            this.updateUniform(areaU.uPlotWidth, p.width ?? 400);
            this.updateUniform(areaU.uPreset, Number(p.presetIndex));
            this.updateUniform(areaU.uLodFactor, p.lodFactor ?? 1.0);
            this.updateUniform(areaU.uFillOpacity, p.fillOpacity ?? 0.0);
            
            if (p.fillColor !== undefined) areaU.uColor.value.set(p.fillColor as any);
            else if (p.color !== undefined) areaU.uColor.value.set(p.color as any);
            
            if (p.offset) areaU.uOffset.value.set(p.offset.x, p.offset.y);
            
            this.updateUniform(areaU.uCount, effectiveCount);
            this.areaMesh.count = Math.max(0, effectiveCount);
        }
    }

    private updateUniform<T>(uniform: IUniform<T>, value: T) {
        if (uniform.value !== value) uniform.value = value;
    }

    private calculateEffectiveCount(params: LinePlotParams, viewport?: ViewportParams): number {
        // If subsampling is disabled, always return full count
        if (params.autoSubsampling === false) return params.count;

        const ppp = 2.0;
        if (!viewport) return params.count;
        const width = params.width ?? 400;
        const viewportWidth = Math.max(viewport.maxX - viewport.minX, 0.001);
        const visibilityRatio = width / viewportWidth;
        const totalNeeded = Math.ceil(viewport.pixelWidth * ppp * visibilityRatio);
        
        return Math.min(params.count, totalNeeded);
    }

    public get mesh() { return this.group; }
    public getDrawStats() { return { total: this.params.count * 2, visible: this.instancedMesh.count + this.areaMesh.count }; }
    public dispose() {
        this.geometry.dispose();
        if (Array.isArray(this.material)) this.material.forEach(m => m.dispose());
        else this.material.dispose();
        
        if (Array.isArray(this.areaMaterial)) this.areaMaterial.forEach(m => m.dispose());
        else this.areaMaterial.dispose();
    }
}
