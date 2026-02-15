precision highp float;

// Custom index per instance
attribute float instanceIndex;

uniform vec2 uResolution;
uniform float uLineWidth;
uniform float uTime;
uniform float uCount;
uniform float uFrequency;
uniform float uAmplitude;
uniform float uPreset;
uniform float uLodFactor;

varying float vVanish;
varying float vSide; // -0.5 to 0.5
varying float vProgress; // 0 to 1
varying float vSegmentIndex;

#define PI 3.14159265359

vec4 getPlotPos(float index) {
    float x = (index / max(uCount - 1.0, 1.0)) * 400.0 - 200.0;
    float t = x * uFrequency + uTime;
    int preset = int(uPreset + 0.5);
    float y = 0.0;
    if (preset == 0) y = sin(t) * uAmplitude;
    else if (preset == 1) y = (fract(t / (2.0 * PI)) * 2.0 - 1.0) * uAmplitude;
    else if (preset == 2) y = (abs(fract(t / (2.0 * PI)) * 2.0 - 1.0) * 2.0 - 1.0) * uAmplitude;
    else if (preset == 3) y = (step(0.5, fract(t / (2.0 * PI))) * 2.0 - 1.0) * uAmplitude;
    
    return vec4(x, y, 0.0, 1.0);
}

void main() {
    vVanish = 0.0;
    vSide = position.y;

    if (instanceIndex >= uCount - 1.0 || instanceIndex > uCount * uLodFactor) {
        vVanish = 1.0;
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
    }

    mat4 mvp = projectionMatrix * modelViewMatrix;
    
    vec4 worldP0 = getPlotPos(instanceIndex);
    vec4 worldP1 = getPlotPos(instanceIndex + 1.0);
    
    vec4 clipP0 = mvp * worldP0;
    vec4 clipP1 = mvp * worldP1;
    
    vec2 screenP0 = (clipP0.xy / clipP0.w + 1.0) * 0.5 * uResolution;
    vec2 screenP1 = (clipP1.xy / clipP1.w + 1.0) * 0.5 * uResolution;
    
    vec2 dir = normalize(screenP1 - screenP0);
    vec2 normal = vec2(-dir.y, dir.x);
    
    // We can also compute miter here if we want perfectly smooth joints in screen space,
    // but the key is that uLineWidth is now purely screen pixels.
    
    float t = position.x + 0.5;
    vProgress = t;
    vSegmentIndex = instanceIndex;
    
    vec2 currentScreen = mix(screenP0, screenP1, t);
    
    // Offset in screen space
    currentScreen += normal * position.y * uLineWidth * 2.0;
    
    // Back to clip space
    gl_Position = vec4((currentScreen / uResolution * 2.0 - 1.0), 0.0, 1.0);
}
