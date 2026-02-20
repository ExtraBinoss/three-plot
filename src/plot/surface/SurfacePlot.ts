import vertexShader from './surface_vertex.glsl';
import fragmentShader from './surface_fragment.glsl';
import { type SurfacePlotParams, type ViewportParams } from '../shared/types';
import { type Plot } from '../PlotContainer';
import { type IUniform, Color, Vector2, Mesh, ShaderMaterial, PlaneGeometry, DoubleSide } from 'three';

interface SurfacePlotUniforms {
    uTime: IUniform<number>;
    uFrequency: IUniform<number>;
    uAmplitude: IUniform<number>;
    uPreset: IUniform<number>;
    uColor: IUniform<Color>;
    uOffset: IUniform<Vector2>;
    uColorMap: IUniform<Color[]>;
    uColorMapLength: IUniform<number>;
    uUseColorMap: IUniform<boolean>;
}

export class SurfacePlot implements Plot<SurfacePlotParams> {
    public mesh: Mesh;
    private geometry: PlaneGeometry;
    private material: ShaderMaterial;
    private params: SurfacePlotParams;
    private static customFunctions: string = "";
    private static customCases: string = "";

    constructor(baseColor: Color = new Color(0x00ff88), segmentsX: number = 100, segmentsY: number = 100) {
        this.params = {
            count: segmentsX * segmentsY,
            segmentsX,
            segmentsY,
            frequency: 1.0,
            amplitude: 20,
            width: 400,
            depth: 400,
            presetIndex: 0,
            color: baseColor.clone(),
            wireframe: false,
            autoUpdate: true
        };

        // We use a high poly plane that we'll displace in vertex shader
        this.geometry = new PlaneGeometry(this.params.width, this.params.depth || this.params.width, segmentsX, segmentsY);

        this.material = new ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uFrequency: { value: this.params.frequency },
                uAmplitude: { value: this.params.amplitude },
                uPreset: { value: Number(this.params.presetIndex) },
                uColor: { value: baseColor.clone() },
                uOffset: { value: new Vector2(0, 0) },
                uColorMap: { value: [new Color(0xff0000), new Color(0x00ff00), new Color(0x0000ff), new Color(0x000000), new Color(0x000000)] },
                uColorMapLength: { value: 0 },
                uUseColorMap: { value: false }
            },
            vertexShader: this.compileVertexShader(),
            fragmentShader,
            transparent: true,
            side: DoubleSide,
            wireframe: false
        });

        this.mesh = new Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        
        // PlaneGeometry by default is in XY plane. We rotate it to be in XZ plane if desired, 
        // but the vertex shader currently uses `x` and `y` from the plane's position attributes, 
        // computes an output `z` based on eval(x, y). 
        // By default PlaneGeometry gives us X and Y components. 
        // That means the plane is standing up. We'll leave it as is, and let the camera angle handle it in the demo, or we can rotate the mesh.
        // Let's rotate it so Z is up, which means rotating -90 deg on X.
        this.mesh.rotation.x = -Math.PI / 2;
    }

    private compileVertexShader(): string {
        let v = vertexShader.replace(
            "#define CUSTOM_FUNCTIONS",
            SurfacePlot.customFunctions || ""
        );
        v = v.replace(
            /#define CUSTOM_CASES/g,
            SurfacePlot.customCases || ""
        );
        return v;
    }

    public update(time: number, _viewport: ViewportParams): void {
        if (!this.params.autoUpdate) return;
        const u = this.material.uniforms as unknown as SurfacePlotUniforms;
        this.updateUniform(u.uTime, time);
    }

    public setParams(newParams: Partial<SurfacePlotParams>): this {
        this.params = { ...this.params, ...newParams };
        const u = this.material.uniforms as unknown as SurfacePlotUniforms;
        
        if (newParams.frequency !== undefined) this.updateUniform(u.uFrequency, newParams.frequency);
        if (newParams.amplitude !== undefined) this.updateUniform(u.uAmplitude, newParams.amplitude);
        if (newParams.presetIndex !== undefined) this.updateUniform(u.uPreset, Number(newParams.presetIndex));
        if (newParams.color !== undefined) {
            const c = newParams.color instanceof Color ? newParams.color : new Color(newParams.color);
            this.updateUniform(u.uColor, c);
        }
        if (newParams.wireframe !== undefined) {
            this.material.wireframe = newParams.wireframe;
        }
        if (newParams.colormap !== undefined) {
            const colors = newParams.colormap.map(c => c instanceof Color ? c : new Color(c));
            const actualLength = colors.length;
            
            // WebGL array uniforms must perfectly match the shader declaration size (5)
            while(colors.length < 5) {
                colors.push(new Color(0x000000));
            }
            if (colors.length > 5) {
                colors.length = 5;
            }

            this.updateUniform(u.uColorMap, colors);
            this.updateUniform(u.uColorMapLength, actualLength);
            this.updateUniform(u.uUseColorMap, actualLength > 0);
        }
        
        // Rebuild geometry if dimensions or segments change
        if (newParams.width !== undefined || newParams.depth !== undefined || newParams.segmentsX !== undefined || newParams.segmentsY !== undefined) {
            this.geometry.dispose();
            const w = this.params.width;
            const d = this.params.depth || w;
            const sx = this.params.segmentsX || 100;
            const sy = this.params.segmentsY || 100;
            this.geometry = new PlaneGeometry(w, d, sx, sy);
            this.mesh.geometry = this.geometry;
        }
        
        return this;
    }

    private updateUniform<T>(uniform: IUniform<T>, value: T) {
        if (uniform.value !== value) uniform.value = value;
    }

    // Builder methods
    public color(val: string | Color) { return this.setParams({ color: val }); }
    public amplitude(val: number) { return this.setParams({ amplitude: val }); }
    public frequency(val: number) { return this.setParams({ frequency: val }); }
    public dimensions(width: number, depth: number) { return this.setParams({ width, depth }); }
    public segments(segmentsX: number, segmentsY: number) { return this.setParams({ segmentsX, segmentsY }); }
    public preset(index: number) { return this.setParams({ presetIndex: index }); }
    public wireframe(val: boolean) { return this.setParams({ wireframe: val }); }
    public colormap(colors: (string | Color)[]) { return this.setParams({ colormap: colors }); }

    public injectPresets(customPresets: Map<string, string>) {
        let funcs = "";
        let cases = "";
        
        let index = 8;
        customPresets.forEach((glsl, name) => {
            funcs += `float ${name}(float x, float y, float t) { return ${glsl}; }\n`;
            cases += `if (preset == ${index}) { _z = ${name}(rawX, rawY, t) * uAmplitude; }\n`;
            index++;
        });

        SurfacePlot.customFunctions = funcs;
        SurfacePlot.customCases = cases;

        const newVertex = this.compileVertexShader();
        if (this.material.vertexShader !== newVertex) {
            this.material.vertexShader = newVertex;
            this.material.needsUpdate = true;
        }
    }

    public getDrawStats(): { total: number, visible: number } {
        const total = (this.params.segmentsX || 100) * (this.params.segmentsY || 100);
        return { total, visible: total };
    }

    public dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }
}
