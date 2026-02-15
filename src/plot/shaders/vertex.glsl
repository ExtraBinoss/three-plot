attribute float pIndex;
uniform float uTime;
uniform float uCount;
uniform float uFrequency;
uniform float uAmplitude;
uniform float uPreset;
uniform float uPointSize;

void main() {
    float x = (pIndex / uCount) * 400.0 - 200.0;
    float y = 0.0;
    
    int preset = int(uPreset);
    
    if (preset == 0) { // Sine
        y = sin(x * uFrequency + uTime) * uAmplitude;
    } else if (preset == 1) { // Saw
        float p = 1.0 / uFrequency;
        y = 2.0 * (x / p - floor(0.5 + x / p)) * uAmplitude;
    } else if (preset == 2) { // Zigzag
        float p = 1.0 / uFrequency;
        y = uAmplitude * (abs(mod(x + uTime, p) / (p / 2.0) - 1.0) * 2.0 - 1.0);
    } else if (preset == 3) { // Ramp
        float p = 1.0 / uFrequency;
        y = mod(x + uTime, p) * (uAmplitude / p);
    }

    vec4 mvPosition = modelViewMatrix * vec4(x, y, 0.0, 1.0);
    gl_PointSize = uPointSize;
    gl_Position = projectionMatrix * mvPosition;
}
