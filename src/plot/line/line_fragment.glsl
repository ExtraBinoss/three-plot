precision highp float;
uniform vec3 uColor;
uniform vec3 uOutlineColor;
uniform float uOutlineWidth;
uniform float uLineWidth;
uniform float uDashScale;
uniform float uTime;

varying float vVanish;
varying float vSide; // -0.5 to 0.5
varying float vProgress; // 0 to 1
varying float vSegmentIndex;
varying float vLineWidth;

void main() {
    if (vVanish > 0.5) discard;
    
    // Dashing
    if (uDashScale > 0.0) {
        float dashPos = (vSegmentIndex + vProgress) * uDashScale;
        if (fract(dashPos) > 0.5) discard;
    }
    
    // Antialiasing based on distance from center
    // abs(vSide) is 0.5 at the edges.
    float dist = abs(vSide) * 2.0; // 0 to 1
    
    // blur width in "normalized distance" units
    // 1 pixel = 1.5 / vLineWidth in these units
    float blur = 1.5 / max(vLineWidth, 1.0);
    
    // Calculate outline
    // Inner width is (1.0 - uOutlineWidth)
    float innerEdge = 1.0 - uOutlineWidth;
    
    // Alpha for the whole line
    float alpha = smoothstep(1.0, 1.0 - blur, dist);
    
    // Base Color
    vec3 baseColor = uColor;
    
    // Color transition between inner and outline
    float innerAlpha = smoothstep(innerEdge, innerEdge - blur, dist);
    vec3 color = mix(uOutlineColor, baseColor, innerAlpha);
    
    gl_FragColor = vec4(color, alpha);
}
