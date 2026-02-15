precision highp float;
uniform vec3 uColor;
uniform float uLineWidth;
varying float vVanish;
varying float vSide; // -0.5 to 0.5

void main() {
    if (vVanish > 0.5) discard;
    
    // Antialiasing based on distance from center
    // abs(vSide) is 0.5 at the edges.
    float dist = abs(vSide) * 2.0; // 0 to 1
    
    // blur width in "normalized distance" units
    // 1 pixel = 1.5 / uLineWidth in these units
    float blur = 1.5 / max(uLineWidth, 1.0);
    float alpha = smoothstep(1.0, 1.0 - blur, dist);
    
    gl_FragColor = vec4(uColor, alpha);
}
