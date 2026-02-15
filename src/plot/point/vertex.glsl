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

    vec4 worldPos = vec4(x + uOffset.x, y + uOffset.y, 0.0, 1.0);
    vec4 mvPosition = modelViewMatrix * worldPos;
    gl_PointSize = uPointSize;
    gl_Position = projectionMatrix * mvPosition;
}
