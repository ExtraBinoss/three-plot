export * from './PlotContainer';
export * from './point/PointPlot';
export * from './line/LinePlot';

import { PlotContainer } from './PlotContainer';
import type { PlotContainerOptions } from './PlotContainer';

/**
 * Helper to quickly initialize a plot in a container.
 */
export function createPlot(element: HTMLElement, options?: PlotContainerOptions): PlotContainer {
    return new PlotContainer(element, options);
}
