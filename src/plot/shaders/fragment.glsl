uniform vec3 uColor;

void main() {
    // Optimization: discard early if we are outside the point bounds or too close to edges
    if (gl_PointCoord.x < 0.02 || gl_PointCoord.x > 0.98 ||
        gl_PointCoord.y < 0.02 || gl_PointCoord.y > 0.98) {
        discard;
    }

    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    
    // Soft halo for visibility
    float alpha = smoothstep(1.0, 0.5, r);
    gl_FragColor = vec4(uColor, alpha);
}
