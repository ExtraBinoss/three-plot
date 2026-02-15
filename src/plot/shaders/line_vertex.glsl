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

#define PI 3.14159265359

float getPlotY(float x) {
    float t = x * uFrequency + uTime;
    int preset = int(uPreset + 0.5);
    if (preset == 0) return sin(t) * uAmplitude;
    if (preset == 1) return (fract(t / (2.0 * PI)) * 2.0 - 1.0) * uAmplitude;
    if (preset == 2) return (abs(fract(t / (2.0 * PI)) * 2.0 - 1.0) * 2.0 - 1.0) * uAmplitude;
    if (preset == 3) return (step(0.5, fract(t / (2.0 * PI))) * 2.0 - 1.0) * uAmplitude;
    return 0.0;
}

float getPlotX(float index) {
    return (index / max(uCount - 1.0, 1.0)) * 400.0 - 200.0;
}

void main() {
    vVanish = 0.0;
    // We draw (uCount - 1) segments. 
    // If instanceIndex is the last point, it has no "next" point to connect to.
    if (instanceIndex >= uCount - 1.0 || instanceIndex > uCount * uLodFactor) {
        vVanish = 1.0;
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
    }

    // Calculate both points of the segment on GPU
    float x0 = getPlotX(instanceIndex);
    float x1 = getPlotX(instanceIndex + 1.0);
    vec3 p0 = vec3(x0, getPlotY(x0), 0.0);
    vec3 p1 = vec3(x1, getPlotY(x1), 0.0);

    // Project to clip space
    vec4 clip0 = projectionMatrix * modelViewMatrix * vec4(p0, 1.0);
    vec4 clip1 = projectionMatrix * modelViewMatrix * vec4(p1, 1.0);

    // Convert to screen pixels
    vec2 screen0 = (clip0.xy / clip0.w + 1.0) * 0.5 * uResolution;
    vec2 screen1 = (clip1.xy / clip1.w + 1.0) * 0.5 * uResolution;

    // Direction and normal in pixels
    vec2 dir = screen1 - screen0;
    float len = length(dir);
    
    // Fallback for overlapping points
    if (len < 0.0001) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
    }
    
    dir /= len;
    vec2 normal = vec2(-dir.y, dir.x);

    // Fat line expansion
    // position.x is in [-0.5, 0.5]. Map to [0, 1] for interpolation
    float t = position.x + 0.5;
    vec2 currentScreen = mix(screen0, screen1, t);
    
    // thickness offset
    currentScreen += normal * position.y * uLineWidth;

    // Convert back to NDC
    gl_Position = vec4((currentScreen / uResolution * 2.0 - 1.0), clip0.z / clip0.w, 1.0);
}
