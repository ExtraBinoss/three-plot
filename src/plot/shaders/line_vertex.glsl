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

vec2 getScreenPos(float index, mat4 mvp) {
    float x = getPlotX(index);
    vec4 clip = mvp * vec4(x, getPlotY(x), 0.0, 1.0);
    // Standard NDC to screen conversion
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
    // We draw (uCount - 1) segments. 
    if (instanceIndex >= uCount - 1.0 || instanceIndex > uCount * uLodFactor) {
        vVanish = 1.0;
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
    }

    mat4 mvp = projectionMatrix * modelViewMatrix;
    
    // Calculate current segment points in screen space
    vec2 p0 = getScreenPos(instanceIndex, mvp);
    vec2 p1 = getScreenPos(instanceIndex + 1.0, mvp);

    // Get current segment normal
    vec2 nCurrent = getNormal(p0, p1);
    
    // Calculate miters by looking at neighbors
    vec2 nStart = nCurrent;
    vec2 nEnd = nCurrent;

    // Start Joint (Miter with previous segment if exists)
    if (instanceIndex > 0.0) {
        vec2 pPrev = getScreenPos(instanceIndex - 1.0, mvp);
        vec2 nPrev = getNormal(pPrev, p0);
        vec2 miterNormalized = normalize(nPrev + nCurrent);
        // Correct length to maintain thickness: thickness / cos(angle)
        float miterLen = uLineWidth / max(dot(miterNormalized, nCurrent), 0.5); 
        nStart = miterNormalized * min(miterLen, uLineWidth * 3.0);
    } else {
        nStart = nCurrent * uLineWidth;
    }

    // End Joint (Miter with next segment if exists)
    if (instanceIndex < uCount - 2.0) {
        vec2 pNext = getScreenPos(instanceIndex + 2.0, mvp);
        vec2 nNext = getNormal(p1, pNext);
        vec2 miterNormalized = normalize(nCurrent + nNext);
        float miterLen = uLineWidth / max(dot(miterNormalized, nCurrent), 0.5);
        nEnd = miterNormalized * min(miterLen, uLineWidth * 3.0);
    } else {
        nEnd = nCurrent * uLineWidth;
    }

    // Interpolate between mitered normals based on position.x
    // position.x is -0.5 at start of segment, 0.5 at end.
    float t = position.x + 0.5;
    vec2 currentPos = mix(p0, p1, t);
    vec2 currentNormal = mix(nStart, nEnd, t);
    
    // Offset in screen space by mitered normal and vertex height
    // position.y is -0.5 or 0.5
    currentPos += currentNormal * position.y * 2.0; // Multiplying by 2 if position is +-0.5

    // Convert screen back to NDC
    gl_Position = vec4((currentPos / uResolution * 2.0 - 1.0), 0.0, 1.0);
}
