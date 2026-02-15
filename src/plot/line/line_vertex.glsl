precision highp float;

attribute float instanceIndex;

uniform vec2 uResolution;
uniform float uLineWidth;
uniform float uTime;
uniform float uCount;
uniform float uFrequency;
uniform float uAmplitude;
uniform float uPlotWidth; // NEW
uniform float uPreset;
uniform float uLodFactor;
uniform vec2 uOffset;

varying float vVanish;
varying float vSide; 
varying float vProgress; 
varying float vSegmentIndex;

#define PI 3.14159265359

float hash(float n) { return fract(sin(n) * 1e4); }
float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u);
}

float hash3(vec3 p3) {
	p3  = fract(p3 * .1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
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

// Injection point for custom functions
#define CUSTOM_FUNCTIONS

vec4 getPlotPos(float index) {
    // Horizontal range from -width/2 to +width/2
    float halfW = uPlotWidth * 0.5;
    float x = (index / max(uCount - 1.0, 1.0)) * uPlotWidth - halfW;
    
    float t = x * uFrequency + uTime;
    int preset = int(uPreset + 0.5);
    float y = 0.0;
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
        // Multiplication de la fréquence par 0.5 pour avoir plus de détails spatiaux
        y = (noise3D(vec3(x * uFrequency * 0.5, 0.0, uTime * 0.5)) * 2.0 - 1.0) * uAmplitude;
    }
    else {
        // This part will be replaced by custom signal logic
        y = 0.0;
    }
    
    return vec4(x + uOffset.x, y + uOffset.y, 0.0, 1.0);
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
    
    vec4 clipAmp = mvp * vec4(0.0, uAmplitude, 0.0, 0.0);
    float ampPixels = length((clipAmp.xy / clipAmp.w) * uResolution * 0.5);
    float effectiveLineWidth = min(uLineWidth, max(ampPixels * 0.2, 0.5));
    
    float t = position.x + 0.5;
    vProgress = t;
    vSegmentIndex = instanceIndex;
    
    vec2 currentScreen = mix(screenP0, screenP1, t);
    currentScreen += normal * position.y * effectiveLineWidth * 2.0;
    
    gl_Position = vec4((currentScreen / uResolution * 2.0 - 1.0), 0.0, 1.0);
}
