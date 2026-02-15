import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LinePlot } from './line/LinePlot';
import { PointPlot } from './point/PointPlot';
import { AxisPlot } from './shared/AxisPlot';
import { TextPlot } from './shared/TextPlot';

export interface PlotContainerOptions {
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.OrthographicCamera;
    autoRender?: boolean;
    antialias?: boolean;
    alpha?: boolean;
    font?: {
        json: string;
        texture: string;
    }
}

export interface Plot<T = any> {
    update(time: number, viewport: any): void;
    dispose(): void;
    getDrawStats(): { total: number, visible: number };
    setParams(params: Partial<T>): this;
    mesh: THREE.Object3D;
}

export type PlotType = 'line' | 'point' | 'axis' | 'text';

export class PlotContainer {
    public scene: THREE.Scene;
    public camera: THREE.OrthographicCamera;
    public renderer: THREE.WebGLRenderer;
    public controls: OrbitControls;
    
    private container: HTMLElement;
    private animationId: number | null = null;
    private resizeObserver: ResizeObserver;
    private isExternalRenderer: boolean = false;
    private autoRender: boolean = true;
    
    private plots: Set<Plot> = new Set();
    private textPlots: Set<TextPlot> = new Set();
    private fontConfig?: { json: string; texture: string };
    
    public onUpdate?: (time: number) => void;

    constructor(container: HTMLElement, options: PlotContainerOptions = {}) {
        this.container = container;
        this.autoRender = options.autoRender !== false;
        this.fontConfig = options.font;
        
        this.scene = options.scene || new THREE.Scene();
        if (!options.scene) {
            this.scene.background = new THREE.Color(0x0a0a0a);
        }

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const aspect = width / height;
        const viewSize = 250; 

        this.camera = options.camera || new THREE.OrthographicCamera(
            -viewSize * aspect, viewSize * aspect,
            viewSize, -viewSize,
            0.1, 2000
        );
        if (!options.camera) {
            this.camera.position.set(0, 0, 500);
        }

        if (options.renderer) {
            this.renderer = options.renderer;
            this.isExternalRenderer = true;
        } else {
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: options.antialias ?? false, 
                alpha: options.alpha ?? false, 
                powerPreference: 'high-performance' 
            });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setSize(width, height);
            this.container.appendChild(this.renderer.domElement);
        }

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.enableRotate = false;
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
        };
        
        this.resizeObserver = new ResizeObserver(() => this.onResize());
        this.resizeObserver.observe(this.container);

        if (this.autoRender) {
            this.animate();
        }
    }

    public add<T extends Plot>(type: PlotType, countOrColor: any, color?: string | THREE.Color): T {
        let plot: any;
        
        if (type === 'line') {
            plot = new LinePlot(countOrColor, new THREE.Color(color || '#00ff88'));
        } else if (type === 'point') {
            plot = new PointPlot(countOrColor, new THREE.Color(color || '#00ff88'));
        } else if (type === 'axis') {
            plot = new AxisPlot(countOrColor || '#ffffff');
        } else if (type === 'text') {
            plot = new TextPlot(countOrColor || 2000);
            if (this.fontConfig && this.fontConfig.json && this.fontConfig.texture) {
                plot.load(this.fontConfig.json, this.fontConfig.texture);
            }
            this.textPlots.add(plot);
        }

        if (type !== 'text') {
            this.plots.add(plot);
        }
        
        this.scene.add(plot.mesh);
        return plot as T;
    }

    public line(count: number, color?: string | THREE.Color) { return this.add<LinePlot>('line', count, color); }
    public point(count: number, color?: string | THREE.Color) { return this.add<PointPlot>('point', count, color); }
    public axis(color?: string | THREE.Color) { return this.add<AxisPlot>('axis', color); }
    public text(capacity?: number) { return this.add<TextPlot>('text', capacity); }

    public remove(plot: Plot) {
        this.plots.delete(plot);
        if (plot instanceof TextPlot) this.textPlots.delete(plot);
        this.scene.remove(plot.mesh);
        plot.dispose();
        return this;
    }

    public clear() {
        this.plots.forEach(p => { this.scene.remove(p.mesh); p.dispose(); });
        this.textPlots.forEach(p => { this.scene.remove(p.mesh); p.dispose(); });
        this.plots.clear();
        this.textPlots.clear();
        return this;
    }

    private onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const aspect = width / height;
        const viewSize = 250;
        this.camera.left = -viewSize * aspect;
        this.camera.right = viewSize * aspect;
        this.camera.top = viewSize;
        this.camera.bottom = -viewSize;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    public getViewportStats() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const zoom = this.camera.zoom;
        const minX = this.camera.position.x + (this.camera.left / zoom);
        const maxX = this.camera.position.x + (this.camera.right / zoom);
        return { pixelWidth: width, pixelHeight: height, minX, maxX, zoom };
    }

    public getRendererInfo() {
        return {
            frame: this.renderer.info.render.frame,
            calls: this.renderer.info.render.calls,
            points: this.renderer.info.render.points,
            triangles: this.renderer.info.render.triangles
        };
    }

    public render() {
        const time = performance.now();
        const viewport = this.getViewportStats();
        
        if (this.onUpdate) this.onUpdate(time);
        this.plots.forEach(plot => plot.update(time / 1000, viewport));
        this.textPlots.forEach(tp => tp.update(time / 1000, viewport));
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    private animate() {
        if (!this.autoRender) return;
        this.animationId = requestAnimationFrame(() => this.animate());
        this.render();
    }

    public destroy() {
        if (this.animationId !== null) cancelAnimationFrame(this.animationId);
        this.resizeObserver.disconnect();
        this.clear();
        if (!this.isExternalRenderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
        }
        this.controls.dispose();
    }
}
