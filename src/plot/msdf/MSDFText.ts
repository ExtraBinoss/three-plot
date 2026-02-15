import * as THREE from 'three';
import { type FontData, type Char } from './FontData';

const msdfVert = `
attribute vec4 aUvOffset;
attribute vec3 aColor;
varying vec2 vUv;
varying vec3 vColor;

void main() {
    vUv = uv * aUvOffset.zw + aUvOffset.xy;
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`;

const msdfFrag = `
varying vec2 vUv;
varying vec3 vColor;
uniform sampler2D uMap;

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

float contour(in float d, in float w) {
    return smoothstep(0.5 - w, 0.5 + w, d);
}

float samp(in vec2 uv, float w) {
    return contour(median(texture2D(uMap, uv).r, texture2D(uMap, uv).g, texture2D(uMap, uv).b), w);
}

void main() {
    vec3 msdfSample = texture2D(uMap, vUv).rgb;
    float dist = median(msdfSample.r, msdfSample.g, msdfSample.b);
    float width = fwidth(dist);
    float alpha = contour(dist, width);
    
    float dscale = 0.354; 
    vec2 duv = dscale * (dFdx(vUv) + dFdy(vUv));
    vec4 box = vec4(vUv - duv, vUv + duv);
    
    float asum = samp(box.xy, width) + samp(box.zw, width) + samp(box.xw, width) + samp(box.zy, width);
    float opacity = (alpha + 0.5 * asum) / 3.0;
    
    if (opacity < 0.01) discard;
    gl_FragColor = vec4(vColor, opacity);
}
`;

export interface TextInstance {
    text: string;
    position: THREE.Vector3;
    scale: number;
    color: THREE.Color;
    align: 'left' | 'center' | 'right';
}

export class MSDFText {
    private mesh: THREE.InstancedMesh;
    private material: THREE.ShaderMaterial;
    private charMap: Map<string, Char> = new Map();
    private fontData: FontData | null = null;
    private instances: TextInstance[] = [];
    private capacity: number;

    constructor(capacity: number = 2000) {
        this.capacity = capacity;
        this.material = new THREE.ShaderMaterial({
            vertexShader: msdfVert,
            fragmentShader: msdfFrag,
            uniforms: { uMap: { value: null } },
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const geometry = new THREE.PlaneGeometry(1, 1);
        geometry.setAttribute('aUvOffset', new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4));
        geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3));

        this.mesh = new THREE.InstancedMesh(geometry, this.material, capacity);
        this.mesh.count = 0;
        this.mesh.frustumCulled = false;
    }

    public async load(fontUrl: string, textureUrl: string) {
        const [fontRes, texture] = await Promise.all([
            fetch(fontUrl).then(res => res.json()),
            new THREE.TextureLoader().loadAsync(textureUrl)
        ]);

        this.fontData = fontRes;
        if (this.fontData && this.fontData.chars) {
            this.fontData.chars.forEach(c => this.charMap.set(c.char, c));
        }
        
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        
        if (this.material.uniforms.uMap) {
            this.material.uniforms.uMap.value = texture;
        }
    }

    public addText(text: string, x: number, y: number, scale: number = 0.1, color: string | THREE.Color = '#ffffff', align: 'left' | 'center' | 'right' = 'left'): this {
        this.instances.push({
            text,
            position: new THREE.Vector3(x, y, 0),
            scale,
            color: new THREE.Color(color as any),
            align
        });
        return this;
    }

    public clear() {
        this.instances = [];
    }

    public update() {
        if (!this.fontData) return;

        let glyphIndex = 0;
        const matArray = this.mesh.instanceMatrix.array as Float32Array;
        const uvAttr = this.mesh.geometry.getAttribute('aUvOffset') as THREE.InstancedBufferAttribute;
        const uvArray = uvAttr.array as Float32Array;
        const colAttr = this.mesh.geometry.getAttribute('aColor') as THREE.InstancedBufferAttribute;
        const colArray = colAttr.array as Float32Array;
        
        const scaleW = this.fontData.common.scaleW;
        const scaleH = this.fontData.common.scaleH;
        const charMap = this.charMap;

        for (const inst of this.instances) {
            const text = inst.text;
            const textLen = text.length;
            const s = inst.scale;
            const pos = inst.position;
            const color = inst.color;
            
            let cursorX = 0;
            const textWidth = this.calculateWidth(text) * s;
            
            let alignOffsetX = 0;
            if (inst.align === 'center') alignOffsetX = -textWidth / 2;
            else if (inst.align === 'right') alignOffsetX = -textWidth;

            for (let i = 0; i < textLen; i++) {
                if (glyphIndex >= this.capacity) break;

                const charStr = text[i];
                if (charStr === undefined) continue;

                const char = charMap.get(charStr);
                if (!char) {
                    if (charStr === ' ') cursorX += 20; 
                    continue;
                }

                const m = glyphIndex * 16;
                const charW = char.width * s;
                const charH = char.height * s;
                const px = pos.x + alignOffsetX + (cursorX + char.xoffset + char.width / 2) * s;
                const py = pos.y - (char.yoffset + char.height / 2) * s;

                // Column-major matrix filling (optimized)
                matArray[m + 0] = charW;  matArray[m + 1] = 0;      matArray[m + 2] = 0;      matArray[m + 3] = 0;
                matArray[m + 4] = 0;      matArray[m + 5] = charH;  matArray[m + 6] = 0;      matArray[m + 7] = 0;
                matArray[m + 8] = 0;      matArray[m + 9] = 0;      matArray[m + 10] = 1;     matArray[m + 11] = 0;
                matArray[m + 12] = px;    matArray[m + 13] = py;    matArray[m + 14] = pos.z; matArray[m + 15] = 1;

                const u = glyphIndex * 4;
                uvArray[u + 0] = char.x / scaleW;
                uvArray[u + 1] = 1.0 - (char.y + char.height) / scaleH;
                uvArray[u + 2] = char.width / scaleW;
                uvArray[u + 3] = char.height / scaleH;

                const c = glyphIndex * 3;
                colArray[c + 0] = color.r;
                colArray[c + 1] = color.g;
                colArray[c + 2] = color.b;

                cursorX += char.xadvance;
                glyphIndex++;
            }
        }

        this.mesh.count = glyphIndex;
        this.mesh.instanceMatrix.needsUpdate = true;
        uvAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
    }

    private calculateWidth(text: string): number {
        if (!this.fontData) return 0;
        let w = 0;
        const charMap = this.charMap;
        for (let i = 0; i < text.length; i++) {
            const charStr = text[i];
            if (charStr === undefined) continue;
            w += charMap.get(charStr)?.xadvance ?? 20;
        }
        return w;
    }

    public get meshObj() { return this.mesh; }
}
