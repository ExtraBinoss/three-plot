import * as THREE from 'three';
import { MSDFText } from '../msdf/MSDFText';
import { type Plot } from '../PlotContainer';

export interface TextPlotParams {
    offset: { x: number, y: number };
}

export class TextPlot implements Plot<TextPlotParams> {
    private engine: MSDFText;
    private params: TextPlotParams = { offset: { x: 0, y: 0 } };

    constructor(capacity: number = 2000) {
        this.engine = new MSDFText(capacity);
    }

    public async load(fontJson: string, fontPng: string) {
        await this.engine.load(fontJson, fontPng);
    }

    /**
     * Adds a text string to the plot. Returns this for chaining.
     */
    public add(text: string, x: number, y: number, scale: number = 0.1, color: string | THREE.Color = '#ffffff', align: 'left' | 'center' | 'right' = 'left'): this {
        this.engine.addText(text, x, y, scale, color, align);
        return this;
    }

    public setParams(params: Partial<TextPlotParams>): this {
        this.params = { ...this.params, ...params };
        return this;
    }

    public update(_time: number, _viewport: any) {
        this.engine.update();
    }

    public get mesh() { return this.engine.meshObj; }
    
    public getDrawStats() { 
        return { total: this.engine.meshObj.count, visible: this.engine.meshObj.count }; 
    }

    public clear() {
        this.engine.clear();
        return this;
    }

    public dispose() {
        this.engine.meshObj.geometry.dispose();
        if (Array.isArray(this.engine.meshObj.material)) {
            this.engine.meshObj.material.forEach(m => m.dispose());
        } else {
            this.engine.meshObj.material.dispose();
        }
    }
}
