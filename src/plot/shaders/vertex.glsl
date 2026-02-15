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
    // GPU LOD Logic
    if (pIndex > uCount * uLodFactor) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
    }

    // Horizontal range from -200 to 200
    float x = (pIndex / (uCount - 1.0)) * 400.0 - 200.0;
    float y = 0.0;
    
    int preset = int(uPreset + 0.5); // Add 0.5 to avoid rounding issues with float uniforms
    
    // Scale X by frequency for more intuitive control
    // freq=0.1 means 10 times the range for one period
    float t = x * uFrequency + uTime;
    
    if (preset == 0) { // Sine
        y = sin(t) * uAmplitude;
    } 
    else if (preset == 1) { // Sawtooth (Ascending)
        // Values from -1 to 1 repeated
        y = (fract(t / (2.0 * PI)) * 2.0 - 1.0) * uAmplitude;
    } 
    else if (preset == 2) { // Zigzag (Triangle)
        // Values from -1 to 1 rising then falling
        y = (abs(fract(t / (2.0 * PI)) * 2.0 - 1.0) * 2.0 - 1.0) * uAmplitude;
    } 
    else if (preset == 3) { // Square (instead of ramp which is similar to saw)
        y = (step(0.5, fract(t / (2.0 * PI))) * 2.0 - 1.0) * uAmplitude;
    }

    vec4 mvPosition = modelViewMatrix * vec4(x, y, 0.0, 1.0);
    gl_PointSize = uPointSize;
    gl_Position = projectionMatrix * mvPosition;
}
