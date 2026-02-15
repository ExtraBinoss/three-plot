precision highp float;

varying vec3 vWorldPos;

uniform vec3 uColor;
uniform vec2 uOffset;
uniform float uZoom;
uniform float uTickStep;
uniform float uTickSize;
uniform vec2 uRangeX; // minX, maxX
uniform vec2 uRangeY; // minY, maxY

void main() {
    // Coordinate relative to the plot's origin
    vec2 relPos = vWorldPos.xy - uOffset;
    
    // Line thickness logic
    float lineThickness = 1.5 / uZoom;
    float tickThickness = 1.0 / uZoom;
    
    // 1. Y-Axis at the LEFT (X = minX)
    float yAxis = 0.0;
    if (relPos.y >= uRangeY.x && relPos.y <= uRangeY.y) {
        yAxis = smoothstep(lineThickness, 0.0, abs(vWorldPos.x - uRangeX.x));
    }
    
    // 2. X-Axis at the CENTER baseline (Y = 0)
    float xAxis = 0.0;
    if (vWorldPos.x >= uRangeX.x && vWorldPos.x <= uRangeX.y) {
        xAxis = smoothstep(lineThickness, 0.0, abs(relPos.y));
    }
    
    // 3. Ticks on Y-Axis (left side)
    float yTicks = 0.0;
    if (vWorldPos.x >= uRangeX.x && vWorldPos.x <= uRangeX.x + uTickSize/uZoom) {
        if (relPos.y >= uRangeY.x && relPos.y <= uRangeY.y) {
            float distToTick = abs(mod(relPos.y + uTickStep * 0.5, uTickStep) - uTickStep * 0.5);
            yTicks = smoothstep(tickThickness, 0.0, distToTick);
        }
    }
    
    // 4. Ticks on X-Axis (baseline)
    float xTicks = 0.0;
    if (abs(relPos.y) < uTickSize/uZoom) {
        if (vWorldPos.x >= uRangeX.x && vWorldPos.x <= uRangeX.y) {
            float distToTick = abs(mod(vWorldPos.x + uTickStep * 0.5, uTickStep) - uTickStep * 0.5);
            xTicks = smoothstep(tickThickness, 0.0, distToTick);
        }
    }
    
    float finalAlpha = max(max(xAxis, yAxis), max(xTicks, yTicks));
    
    if (finalAlpha < 0.1) discard;
    
    gl_FragColor = vec4(uColor, finalAlpha * 0.6);
}
