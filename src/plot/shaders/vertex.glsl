precision highp float;
attribute float pIndex;
uniform float uTime;
uniform float uCount;
uniform float uFrequency;
uniform float uAmplitude;
uniform float uPreset;
uniform float uPointSize;
uniform float uLodFactor;

#define PI 3.14159265359

void main() {
    // GPU LOD Logic - Skip the vertex if outside the LOD range
    if (pIndex > uCount * uLodFactor) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
    }

    // Horizontal range from -200 to 200
    // Pre-calculate denominator to avoid division by zero or redundancy
    float x = (pIndex / max(uCount - 1.0, 1.0)) * 400.0 - 200.0;
    float y = 0.0;
    
    int preset = int(uPreset + 0.5);
    float t = x * uFrequency + uTime;
    
    if (preset == 0) {
        y = sin(t) * uAmplitude;
    } 
    else if (preset == 1) {
        y = (fract(t / (2.0 * PI)) * 2.0 - 1.0) * uAmplitude;
    } 
    else if (preset == 2) {
        y = (abs(fract(t / (2.0 * PI)) * 2.0 - 1.0) * 2.0 - 1.0) * uAmplitude;
    } 
    else if (preset == 3) {
        y = (step(0.5, fract(t / (2.0 * PI))) * 2.0 - 1.0) * uAmplitude;
    }

    vec4 mvPosition = modelViewMatrix * vec4(x, y, 0.0, 1.0);
    gl_PointSize = uPointSize;
    gl_Position = projectionMatrix * mvPosition;
}
