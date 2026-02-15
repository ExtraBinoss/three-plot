precision highp float;

// Custom index per instance
attribute float instanceIndex;

uniform float uTime;
uniform float uCount;
uniform float uFrequency;
uniform float uAmplitude;
uniform float uPreset;
uniform float uPointSize;
uniform float uLodFactor;

varying vec2 vUv;
varying float vVanish;

#define PI 3.14159265359

void main() {
    vUv = uv;
    vVanish = 0.0;

    // GPU LOD Logic - Skip/Vanish the instance if outside the LOD range
    if (instanceIndex > uCount * uLodFactor) {
        vVanish = 1.0;
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
    }

    // Horizontal range from -200 to 200
    float x = (instanceIndex / max(uCount - 1.0, 1.0)) * 400.0 - 200.0;
    float y = 0.0;
    
    int preset = int(uPreset + 0.5);
    float t = x * uFrequency + uTime;
    
    if (preset == 0) y = sin(t) * uAmplitude;
    else if (preset == 1) y = (fract(t / (2.0 * PI)) * 2.0 - 1.0) * uAmplitude;
    else if (preset == 2) y = (abs(fract(t / (2.0 * PI)) * 2.0 - 1.0) * 2.0 - 1.0) * uAmplitude;
    else if (preset == 3) y = (step(0.5, fract(t / (2.0 * PI))) * 2.0 - 1.0) * uAmplitude;

    // The 'position' attribute is for the local quad [-0.5, 0.5]
    // We scale it by uPointSize and offset it by (x, y)
    // Note: uPointSize here acts like a world-space or view-space size
    // For simplicity, let's assume it's in world units
    vec3 center = vec3(x, y, 0.0);
    vec3 localPos = position * uPointSize * 0.1; // Scale down a bit as planes are larger than points
    
    vec4 mvPosition = modelViewMatrix * vec4(center + localPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
