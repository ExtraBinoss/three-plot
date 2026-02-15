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
    width: number; // ADDED
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

// Unified type for internal updates
export type PlotUpdateParams = LinePlotParams & PointPlotParams;
