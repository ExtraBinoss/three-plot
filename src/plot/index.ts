import { PlotContainer, type PlotContainerOptions } from './PlotContainer';
export * from './PlotContainer';
export * from './point/PointPlot';
export * from './line/LinePlot';
export * from './shared/AxisPlot';
export * from './shared/TextPlot';
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
     * Version info
     */
    version: '1.2.0'
};
