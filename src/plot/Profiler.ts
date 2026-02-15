import * as THREE from 'three';

export interface ProfilingData {
    updateMs: number;
    renderMs: number;
    gpuMs: number;
    frameMs: number;
    pointsCount: number;
    fps: number;
    drawCalls: number;
    triangles: number;
    points: number; 
}

export class Profiler {
    private gl: WebGL2RenderingContext | null = null;
    private renderer: THREE.WebGLRenderer | null = null;
    private ext: any = null;
    private queries: WebGLQuery[] = [];
    private queryIndex = 0;
    private currentQuery: WebGLQuery | null = null;
    private queryInProgress = false;

    private lastFrameTime = 0;
    private _frameMs = 0;
    private _updateMs = 0;
    private _renderMs = 0;
    private _gpuMs = 0;
    private _fps = 0;
    private frames = 0;
    private lastFpsUpdate = 0;

    private startUpdate = 0;
    private startRender = 0;

    public init(renderer: THREE.WebGLRenderer) {
        this.renderer = renderer;
        this.gl = renderer.getContext() as WebGL2RenderingContext;
        if (this.gl) {
            this.ext = this.gl.getExtension('EXT_disjoint_timer_query_webgl2');
            if (this.ext) {
                for (let i = 0; i < 3; i++) {
                    this.queries.push(this.gl.createQuery()!);
                }
            }
        }
    }

    public beginFrame() {
        const now = performance.now();
        if (this.lastFrameTime > 0) {
            this._frameMs = now - this.lastFrameTime;
        }
        this.lastFrameTime = now;
        
        this.frames++;
        if (now - this.lastFpsUpdate > 1000) {
            this._fps = Math.round((this.frames * 1000) / (now - this.lastFpsUpdate));
            this.lastFpsUpdate = now;
            this.frames = 0;
        }

        if (this.gl && this.ext && !this.queryInProgress) {
            this.currentQuery = this.queries[this.queryIndex];
            this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.currentQuery!);
            this.queryInProgress = true;
        }
    }

    public beginUpdate() {
        this.startUpdate = performance.now();
    }

    public endUpdate() {
        this._updateMs = performance.now() - this.startUpdate;
    }

    public beginRender() {
        this.startRender = performance.now();
    }

    public endRender() {
        this._renderMs = performance.now() - this.startRender;
    }

    public endFrame() {
        if (this.gl && this.ext && this.queryInProgress && this.currentQuery) {
            this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
            this.queryInProgress = false;

            this.queryIndex = (this.queryIndex + 1) % this.queries.length;
            const nextQuery = this.queries[this.queryIndex];

            const available = this.gl.getQueryParameter(nextQuery, this.gl.QUERY_RESULT_AVAILABLE);
            const disjoint = this.gl.getParameter(this.ext.GPU_DISJOINT_EXT);

            if (available && !disjoint) {
                const ns = this.gl.getQueryParameter(nextQuery, this.gl.QUERY_RESULT);
                this._gpuMs = ns / 1000000;
            }
        }
    }

    public get current(): ProfilingData {
        const info = this.renderer?.info;
        return {
            updateMs: parseFloat(this._updateMs.toFixed(3)),
            renderMs: parseFloat(this._renderMs.toFixed(3)),
            gpuMs: parseFloat(this._gpuMs.toFixed(3)),
            frameMs: parseFloat(this._frameMs.toFixed(3)),
            pointsCount: 0,
            fps: this._fps,
            drawCalls: info?.render.calls ?? 0,
            triangles: info?.render.triangles ?? 0,
            points: info?.render.points ?? 0
        };
    }
}
