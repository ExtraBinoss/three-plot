import * as THREE from 'three';

export interface ViewportParams {
    pixelWidth: number;
    pixelHeight: number;
    minX: number;
    maxX: number;
    zoom: number;
}

export interface PlotUpdateParams {
    frequency: number;
    amplitude: number;
    presetIndex: number;
    count: number;
    pointSize?: number;
    adaptive?: boolean;
    lodFactor?: number;
    autoSubsampling?: boolean;
    autoCulling?: boolean;
    pointsPerPixel?: number;
    color?: string | THREE.Color;
    borderColor?: string | THREE.Color;
    borderWidth?: number;
    dashScale?: number;
    offset?: { x: number, y: number };
    mode?: string;
    autoUpdate?: boolean;
}
