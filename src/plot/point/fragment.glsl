precision mediump float;
uniform vec3 uColor;

void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    
    // Circular discard
    if (r > 1.0) discard;
    
    // Soft halo for visibility
    float alpha = smoothstep(1.0, 0.5, r);
    gl_FragColor = vec4(uColor, alpha);
}
