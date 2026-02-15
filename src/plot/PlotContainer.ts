import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class PlotContainer {
    public scene: THREE.Scene;
    public camera: THREE.OrthographicCamera;
    public renderer: THREE.WebGLRenderer;
    public controls: OrbitControls;
    private container: HTMLElement;
    private animationId: number | null = null;
    private resizeObserver: ResizeObserver;
    public onUpdate?: (time: number) => void;

    constructor(container: HTMLElement) {
        this.container = container;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);

        const width = container.clientWidth;
        const height = container.clientHeight;
        const aspect = width / height;
        const viewSize = 250; 

        this.camera = new THREE.OrthographicCamera(
            -viewSize * aspect, viewSize * aspect,
            viewSize, -viewSize,
            0.1, 2000
        );
        this.camera.position.set(0, 0, 500);

        this.renderer = new THREE.WebGLRenderer({ 
            antialias: false, 
            alpha: false, 
            preserveDrawingBuffer: false, 
            powerPreference: 'high-performance' 
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(width, height);
        container.appendChild(this.renderer.domElement);

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

        this.animate();
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

    private animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        const time = performance.now();
        if (this.onUpdate) {
            this.onUpdate(time);
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    public destroy() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
        this.resizeObserver.disconnect();
        this.renderer.dispose();
        this.renderer.domElement.remove();
        this.controls.dispose();
    }
}
