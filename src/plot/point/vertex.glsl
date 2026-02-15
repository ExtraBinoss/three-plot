precision highp float;
attribute float pIndex;
uniform float uTime;
uniform float uCount;
uniform float uFrequency;
uniform float uAmplitude;
uniform float uPlotWidth; // NEW
uniform float uPreset;
uniform float uPointSize;
uniform float uLodFactor;
uniform float uAdaptive;
uniform vec2 uOffset;

#define PI 3.14159265359

float hash(float n) { return fract(sin(n) * 1e4); }
float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u);
}

float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3D(in vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
                   mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
                   mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}

void main() {
    if (pIndex > uCount * uLodFactor) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
    }

    float halfW = uPlotWidth * 0.5;
    float x = (pIndex / max(uCount - 1.0, 1.0)) * uPlotWidth - halfW;
    float y = 0.0;
    
    int preset = int(uPreset + 0.5);
    float t = x * uFrequency + uTime;
    
    if (preset == 0) y = sin(t) * uAmplitude;
    else if (preset == 1) y = (fract(t / (2.0 * PI)) * 2.0 - 1.0) * uAmplitude;
    else if (preset == 2) y = (abs(fract(t / (2.0 * PI)) * 2.0 - 1.0) * 2.0 - 1.0) * uAmplitude;
    else if (preset == 3) y = (step(0.5, fract(t / (2.0 * PI))) * 2.0 - 1.0) * uAmplitude;
    else if (preset == 4) {
        y = (sin(t) + sin(t * 2.1) * 0.5 + sin(t * 0.5) * 1.5) * uAmplitude * 0.5;
        y += cos(t * 0.2) * uAmplitude * 0.3;
    }
    else if (preset == 5) {
        y = (sin(t) * cos(t * 1.1 + uTime) * sin(t * 0.5 - uTime * 0.5)) * uAmplitude * 2.0;
    }
    else if (preset == 6) {
        y = (noise(t) * 2.0 - 1.0) * uAmplitude;
    }
    else if (preset == 7) {
        y = (noise3D(vec3(x * 0.05, t, uTime * 0.5)) * 2.0 - 1.0) * uAmplitude;
    }
    else {
        y = 0.0;
    }

    vec4 worldPos = vec4(x + uOffset.x, y + uOffset.y, 0.0, 1.0);
    vec4 mvPosition = modelViewMatrix * worldPos;
    gl_PointSize = uPointSize;
    gl_Position = projectionMatrix * mvPosition;
}
