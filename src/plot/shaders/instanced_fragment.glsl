precision mediump float;

uniform vec3 uColor;
varying vec2 vUv;
varying float vVanish;

void main() {
    if (vVanish > 0.5) discard;

    // UVs are 0 to 1, remap to -1 to 1 for circular shape
    vec2 cxy = 2.0 * vUv - 1.0;
    float r = dot(cxy, cxy);
    
    // Circular discard
    if (r > 1.0) discard;
    
    // Soft halo
    float alpha = smoothstep(1.0, 0.5, r);
    gl_FragColor = vec4(uColor, alpha);
}
