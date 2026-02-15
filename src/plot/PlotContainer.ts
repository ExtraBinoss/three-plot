import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Options for initializing a PlotContainer.
 */
export interface PlotContainerOptions {
    /** Existing WebGLRenderer to use. If not provided, a new one will be created. */
    renderer?: THREE.WebGLRenderer;
    /** Existing Scene to use. If not provided, a new one will be created. */
    scene?: THREE.Scene;
    /** Existing OrthographicCamera to use. If not provided, a new one will be created. */
    camera?: THREE.OrthographicCamera;
    /** Whether to automatically start the render loop. Defaults to true. */
    autoRender?: boolean;
    /** Anti-aliasing setting for the internal renderer (if created). */
    antialias?: boolean;
    /** Alpha setting for the internal renderer (if created). */
    alpha?: boolean;
}

/**
 * Main entry point for the ThreePlot library.
 * Manages the Three.js scene, camera, renderer, and render loop.
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
    
    /**
     * Callback for custom per-frame logic.
     * @param time Total elapsed time in milliseconds.
     */
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
                preserveDrawingBuffer: false, 
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
        
        // In OrthographicCamera, the visible world units depend on left/right/top/bottom and zoom
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
        
        if (!this.isExternalRenderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
        }
        
        this.controls.dispose();
    }
}
