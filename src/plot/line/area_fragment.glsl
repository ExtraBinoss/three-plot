precision highp float;
uniform vec3 uColor;
uniform float uFillOpacity;

varying float vVanish;

void main() {
    if (vVanish > 0.5) discard;
    gl_FragColor = vec4(uColor, uFillOpacity);
}
