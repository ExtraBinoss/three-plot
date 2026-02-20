uniform float uTime;
uniform float uAmplitude;
uniform float uFrequency;
uniform vec2 uOffset;
uniform int uPreset;

varying vec2 vUv;
varying vec3 vNormalOut;
varying float vZ;
varying vec3 vWorldPosition;

float hash(float n) { return fract(sin(n) * 1e4); }
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

// --- PRESETS BEGIN --- (similar to 2D but with x and y)
float evalPreset(float x, float y, float t, int preset) {
    float scaledX = x * uFrequency + uOffset.x;
    float scaledY = y * uFrequency + uOffset.y;
    
    // built in presets
    if (preset == 0) return sin(scaledX + t) * cos(scaledY + t) * uAmplitude;
    if (preset == 1) return (sin(scaledX) + sin(scaledY)) * uAmplitude;
    if (preset == 2) return sin(sqrt(scaledX*scaledX + scaledY*scaledY) - t*3.0) * uAmplitude; 
    
    if (preset == 3) return noise3D(vec3(scaledX, scaledY, t)) * uAmplitude; 
    
    // Injected formulas
    float invF = 1.0 / max(uFrequency, 0.0001);
    float rawX = x + uOffset.x * invF;
    float rawY = y + uOffset.y * invF;
    float _z = 0.0;
    
    #define CUSTOM_CASES
    
    return _z;
}
// --- PRESETS END ---

void main() {
    vUv = uv;
    
    float x = position.x;
    float y = position.y;
    float t = uTime;
    
    // Evaluate Z
    float z = evalPreset(x, y, t, uPreset);
    
    // Evaluate neighbors for analytic normal
    float epsilon = 0.01;
    float z1 = evalPreset(x + epsilon, y, t, uPreset);
    float z2 = evalPreset(x, y + epsilon, t, uPreset);
    
    vec3 p0 = vec3(x, y, z);
    vec3 p1 = vec3(x + epsilon, y, z1);
    vec3 p2 = vec3(x, y + epsilon, z2);
    
    vec3 tangent = normalize(p1 - p0);
    vec3 bitangent = normalize(p2 - p0);
    vec3 normal = normalize(cross(tangent, bitangent));
    
    vNormalOut = normal;
    vZ = z;
    
    vec3 newPosition = vec3(x, y, z);
    vec4 worldPosition = modelMatrix * vec4(newPosition, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
