precision mediump float;
uniform vec3 uColor;
varying float vVanish;

void main() {
    if (vVanish > 0.5) discard;
    gl_FragColor = vec4(uColor, 1.0);
}
