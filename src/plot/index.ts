import { PlotContainer, type PlotContainerOptions } from './PlotContainer';
export * from './PlotContainer';
export * from './point/PointPlot';
export * from './line/LinePlot';
export * from './surface/SurfacePlot';
export * from './axis/AxisPlot';
export * from './axis/LegendPlot';
export * from './msdf/TextPlot';
export * from './shared/types';
export * from './msdf/MSDFText';

/**
 * Main Library Entry Point
 */
export const ThreePlot = {
    /**
     * Initializes a new PlotContainer in the given element.
     */
    init(element: HTMLElement, options?: PlotContainerOptions): PlotContainer {
        return new PlotContainer(element, options);
    },

    /**
     * Checks if WebGL is available in the current environment.
     */
    isSupported(): boolean {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    },

    /**
     * Version info
     */
    version: '1.2.0'
};
