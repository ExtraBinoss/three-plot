import * as THREE from 'three';

export interface ViewportParams {
    pixelWidth: number;
    pixelHeight: number;
    minX: number;
    maxX: number;
    zoom: number;
}

export interface BasePlotParams {
    count: number;
    frequency: number;
    amplitude: number;
    presetIndex: number;
    color?: string | THREE.Color;
    lodFactor?: number;
    pointSize?: number;
    autoUpdate?: boolean;
    offset?: { x: number, y: number };
}

export interface LinePlotParams extends BasePlotParams {
    borderColor?: string | THREE.Color;
    borderWidth?: number;
    dashScale?: number;
}

export interface PointPlotParams extends BasePlotParams {
    adaptive?: boolean;
    autoSubsampling?: boolean;
    autoCulling?: boolean;
    pointsPerPixel?: number;
}

// Unified type for internal updates (kept for compatibility with existing update logic)
export type PlotUpdateParams = LinePlotParams & PointPlotParams;
