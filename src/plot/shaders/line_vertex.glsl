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

vec2 getScreenPos(float index, mat4 mvp) {
    float x = getPlotX(index);
    vec4 clip = mvp * vec4(x, getPlotY(x), 0.0, 1.0);
    return (clip.xy / clip.w + 1.0) * 0.5 * uResolution;
}

vec2 getNormal(vec2 p0, vec2 p1) {
    vec2 dir = p1 - p0;
    if (length(dir) < 0.0001) return vec2(0.0);
    dir = normalize(dir);
    return vec2(-dir.y, dir.x);
}

void main() {
    vVanish = 0.0;
    vSide = position.y; // Standard attribute position is available

    if (instanceIndex >= uCount - 1.0 || instanceIndex > uCount * uLodFactor) {
        vVanish = 1.0;
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
    }

    mat4 mvp = projectionMatrix * modelViewMatrix;
    
    vec2 p0 = getScreenPos(instanceIndex, mvp);
    vec2 p1 = getScreenPos(instanceIndex + 1.0, mvp);
    vec2 nCurrent = getNormal(p0, p1);
    
    vec2 nStart = nCurrent;
    vec2 nEnd = nCurrent;

    float miterLimit = 4.0; 

    // Miter Start
    if (instanceIndex > 0.0) {
        vec2 pPrev = getScreenPos(instanceIndex - 1.0, mvp);
        vec2 nPrev = getNormal(pPrev, p0);
        vec2 miter = nPrev + nCurrent;
        if (length(miter) > 0.0001) {
            miter = normalize(miter);
            float d = dot(miter, nCurrent);
            float miterLen = uLineWidth / max(d, 0.2); // Limit spike length
            nStart = miter * min(miterLen, uLineWidth * miterLimit);
        }
    } else {
        nStart = nCurrent * uLineWidth;
    }

    // Miter End
    if (instanceIndex < uCount - 2.0) {
        vec2 pNext = getScreenPos(instanceIndex + 2.0, mvp);
        vec2 nNext = getNormal(p1, pNext);
        vec2 miter = nCurrent + nNext;
        if (length(miter) > 0.0001) {
            miter = normalize(miter);
            float d = dot(miter, nCurrent);
            float miterLen = uLineWidth / max(d, 0.2);
            nEnd = miter * min(miterLen, uLineWidth * miterLimit);
        }
    } else {
        nEnd = nCurrent * uLineWidth;
    }

    float t = position.x + 0.5;
    vec2 currentPos = mix(p0, p1, t);
    vec2 currentNormal = mix(nStart, nEnd, t);
    
    // Smooth offset
    currentPos += currentNormal * position.y * 2.0;

    gl_Position = vec4((currentPos / uResolution * 2.0 - 1.0), 0.0, 1.0);
}
