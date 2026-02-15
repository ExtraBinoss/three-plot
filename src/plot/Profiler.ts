export interface ProfilingData {
    updateMs: number;
    pointsCount: number;
    fps: number;
}

export class Profiler {
    private lastUpdateStart = 0;
    private _updateMs = 0;
    private frames = 0;
    private lastFpsTime = 0;
    private _fps = 0;

    public beginUpdate() {
        this.lastUpdateStart = performance.now();
    }

    public endUpdate() {
        this._updateMs = performance.now() - this.lastUpdateStart;
        this.updateFps();
    }

    private updateFps() {
        this.frames++;
        const now = performance.now();
        if (now >= this.lastFpsTime + 1000) {
            this._fps = Math.round((this.frames * 1000) / (now - this.lastFpsTime));
            this.lastFpsTime = now;
            this.frames = 0;
        }
    }

    public get current(): ProfilingData & { updateMs: number } {
        return {
            updateMs: parseFloat(this._updateMs.toFixed(3)),
            pointsCount: 0, // Should be set by caller
            fps: this._fps
        };
    }
}
