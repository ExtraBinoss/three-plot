uniform vec3 uColor;
uniform float uAmplitude;
uniform vec3 uColorMap[5];
uniform int uColorMapLength;
uniform bool uUseColorMap;

varying vec2 vUv;
varying vec3 vNormalOut;
varying float vZ;
varying vec3 vWorldPosition;

void main() {
    vec3 baseColor = uColor;
    
    if (uUseColorMap && uColorMapLength > 0) {
        // Normalize Z between 0.0 and 1.0 based on amplitude
        // Since z can go from -uAmplitude to uAmplitude, we map it:
        float normalizedZ = clamp((vZ + uAmplitude) / (2.0 * uAmplitude), 0.0, 1.0);
        
        // Find segment
        float segmentCount = float(uColorMapLength - 1);
        float p = normalizedZ * segmentCount;
        int index1 = int(floor(p));
        int index2 = min(index1 + 1, uColorMapLength - 1);
        float fractP = fract(p);
        
        vec3 c1 = uColorMap[index1];
        vec3 c2 = uColorMap[index2];
        baseColor = mix(c1, c2, smoothstep(0.0, 1.0, fractP));
    }
    
    // Simple directional lighting
    vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
    vec3 normal = normalize(vNormalOut);
    float diff = max(dot(normal, lightDir), 0.0);
    
    // Ambient
    vec3 ambient = vec3(0.3) * baseColor;
    vec3 diffuse = diff * baseColor;
    
    // Fake rim light
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
    rim = smoothstep(0.6, 1.0, rim);
    vec3 rimLight = vec3(1.0) * rim * 0.5;
    
    vec3 finalColor = ambient + diffuse + rimLight;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
