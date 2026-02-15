import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LinePlot } from './line/LinePlot';
import { PointPlot } from './point/PointPlot';

/**
 * Options for initializing a PlotContainer.
 */
export interface PlotContainerOptions {
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.OrthographicCamera;
    autoRender?: boolean;
    antialias?: boolean;
    alpha?: boolean;
}

export interface Plot {
    update(time: number, viewport: any): void;
    dispose(): void;
    getDrawStats(): { total: number, visible: number };
    setParams(params: any): this;
    mesh: THREE.Object3D;
}

export type PlotType = 'line' | 'point';

/**
 * Main entry point for the ThreePlot library.
 */
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
    
    public onUpdate?: (time: number) => void;

    constructor(container: HTMLElement, options: PlotContainerOptions = {}) {
        this.container = container;
        this.autoRender = options.autoRender !== false;
        
        this.scene = options.scene || new THREE.Scene();
        if (!options.scene) {
            this.scene.background = new THREE.Color(0x0a0a0a);
        }

        const width = container.clientWidth;
        const height = container.clientHeight;
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
            container.appendChild(this.renderer.domElement);
        }

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.enableRotate = false;
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
        };

        const grid = new THREE.GridHelper(2000, 100, 0x444444, 0x222222);
        grid.rotation.x = Math.PI / 2;
        grid.position.z = -1;
        this.scene.add(grid);

        this.resizeObserver = new ResizeObserver(() => this.onResize());
        this.resizeObserver.observe(container);

        if (this.autoRender) {
            this.animate();
        }
    }

    /**
     * Factory method to add a plot by type.
     */
    public add<T extends Plot>(type: PlotType, count: number, color: string | THREE.Color = '#00ff88'): T {
        let plot: any;
        const colorObj = new THREE.Color(color);
        
        if (type === 'line') {
            plot = new LinePlot(count, colorObj);
        } else if (type === 'point') {
            plot = new PointPlot(count, colorObj);
        } else {
            throw new Error(`Unknown plot type: ${type}`);
        }

        this.plots.add(plot);
        this.scene.add(plot.mesh);
        return plot as T;
    }

    // Sugar methods for better DX
    public line(count: number, color?: string | THREE.Color) { return this.add<LinePlot>('line', count, color); }
    public point(count: number, color?: string | THREE.Color) { return this.add<PointPlot>('point', count, color); }

    public remove(plot: Plot) {
        if (this.plots.has(plot)) {
            this.scene.remove(plot.mesh);
            plot.dispose();
            this.plots.delete(plot);
        }
        return this;
    }

    public clear() {
        this.plots.forEach(p => {
            this.scene.remove(p.mesh);
            p.dispose();
        });
        this.plots.clear();
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
        const visibleWidthWorld = (this.camera.right - this.camera.left) / zoom;
        const visibleHeightWorld = (this.camera.top - this.camera.bottom) / zoom;
        const minX = this.camera.position.x + (this.camera.left / zoom);
        const maxX = this.camera.position.x + (this.camera.right / zoom);
        
        return {
            pixelWidth: width,
            pixelHeight: height,
            visibleWidthWorld,
            visibleHeightWorld,
            minX,
            maxX,
            zoom
        };
    }

    public getRendererInfo() {
        return {
            frame: this.renderer.info.render.frame,
            calls: this.renderer.info.render.calls,
            points: this.renderer.info.render.points,
            triangles: this.renderer.info.render.triangles,
            memory: {
                geometries: this.renderer.info.memory.geometries,
                textures: this.renderer.info.memory.textures
            }
        };
    }

    public render() {
        const time = performance.now();
        const viewport = this.getViewportStats();

        this.plots.forEach(plot => plot.update(time / 1000, viewport));

        if (this.onUpdate) {
            this.onUpdate(time);
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    private animate() {
        if (!this.autoRender) return;
        this.animationId = requestAnimationFrame(() => this.animate());
        this.render();
    }

    public destroy() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
        this.resizeObserver.disconnect();
        this.clear();
        
        if (!this.isExternalRenderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
        }
        
        this.controls.dispose();
    }
}
