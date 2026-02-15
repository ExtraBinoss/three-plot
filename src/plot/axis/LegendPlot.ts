import { Color, Object3D } from 'three';
import { type Plot } from '../PlotContainer';
import { type TextPlot } from '../msdf/TextPlot';

export interface LegendPlotParams {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    color: string | Color;
    size: number;
    precision: number;
    showMin: boolean;
    showMax: boolean;
    showRangeX: boolean;
    position: 'left' | 'right' | 'both';
    offset: { x: number, y: number };
}

export class LegendPlot implements Plot<LegendPlotParams> {
    private params: LegendPlotParams;
    private textEngine?: TextPlot;
    private dummyMesh: Object3D;

    constructor() {
        this.params = {
            minX: -200,
            maxX: 200,
            minY: -50,
            maxY: 50,
            color: '#ffffff',
            size: 0.08,
            precision: 1,
            showMin: true,
            showMax: true,
            showRangeX: false,
            position: 'right',
            offset: { x: 0, y: 0 }
        };
        this.dummyMesh = new Object3D();
    }

    public setParams(params: Partial<LegendPlotParams>): this {
        this.params = { ...this.params, ...params };
        return this;
    }

    public rangeY(min: number, max: number) { return this.setParams({ minY: min, maxY: max }); }
    public rangeX(min: number, max: number) { return this.setParams({ minX: min, maxX: max }); }
    public color(val: string | Color) { return this.setParams({ color: val }); }
    public size(val: number) { return this.setParams({ size: val }); }
    public precision(val: number) { return this.setParams({ precision: val }); }
    public side(val: 'left' | 'right' | 'both') { return this.setParams({ position: val }); }
    public showMinMax(min: boolean, max: boolean) { return this.setParams({ showMin: min, showMax: max }); }
    public showRangeX(val: boolean) { return this.setParams({ showRangeX: val }); }

    public use(tp: TextPlot): this {
        this.textEngine = tp;
        return this;
    }

    public update(_time: number, _viewport: any) {
        if (!this.textEngine) return;
        
        const p = this.params;
        const te = this.textEngine;
        const prec = p.precision;
        const off = p.offset;

        if (p.position === 'left' || p.position === 'both') {
            const lx = p.minX + off.x - 5;
            if (p.showMax) te.add(p.maxY.toFixed(prec), lx, p.maxY + off.y, p.size, p.color, "right");
            if (p.showMin) te.add(p.minY.toFixed(prec), lx, p.minY + off.y, p.size, p.color, "right");
        }

        if (p.position === 'right' || p.position === 'both') {
            const rx = p.maxX + off.x + 5;
            if (p.showMax) te.add(p.maxY.toFixed(prec), rx, p.maxY + off.y, p.size, p.color, "left");
            if (p.showMin) te.add(p.minY.toFixed(prec), rx, p.minY + off.y, p.size, p.color, "left");
        }

        if (p.showRangeX) {
            te.add(p.minX.toFixed(prec), p.minX + off.x, p.minY + off.y - 12, p.size * 0.8, p.color, "center");
            te.add(p.maxX.toFixed(prec), p.maxX + off.x, p.minY + off.y - 12, p.size * 0.8, p.color, "center");
        }
    }

    public get mesh() { return this.dummyMesh; }
    public getDrawStats() { return { total: 0, visible: 0 }; }
    public dispose() {}
}
