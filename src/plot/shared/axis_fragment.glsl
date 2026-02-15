precision highp float;

varying vec3 vWorldPos;

uniform vec3 uColor;
uniform vec2 uOffset;
uniform float uZoom;
uniform float uThickness;
uniform float uTickStep;
uniform float uTickSize;
uniform vec2 uRangeX; // minX, maxX
uniform vec2 uRangeY; // minY, maxY

void main() {
    vec2 relPos = vWorldPos.xy - uOffset;
    float plotHeight = uRangeY.y - uRangeY.x;
    
    float maxWorldThickness = plotHeight * 0.05;
    float lineThickness = min(uThickness / uZoom, maxWorldThickness);
    float tickThickness = min((uThickness * 0.66) / uZoom, maxWorldThickness);
    
    // 1. Y-Axis at the LEFT (relPos.x == uRangeX.x)
    float yAxis = 0.0;
    if (relPos.y >= uRangeY.x && relPos.y <= uRangeY.y) {
        yAxis = smoothstep(lineThickness, lineThickness * 0.5, abs(relPos.x - uRangeX.x));
    }
    
    // 2. X-Axis at the CENTER baseline (relPos.y == 0)
    float xAxis = 0.0;
    if (relPos.x >= uRangeX.x && relPos.x <= uRangeX.y) {
        xAxis = smoothstep(lineThickness, lineThickness * 0.5, abs(relPos.y));
    }
    
    // 3. Ticks
    float currentTickSize = min(uTickSize / uZoom, plotHeight * 0.1);
    
    float yTicks = 0.0;
    if (relPos.x >= uRangeX.x && relPos.x <= uRangeX.x + currentTickSize) {
        if (relPos.y >= uRangeY.x && relPos.y <= uRangeY.y) {
            float distToTick = abs(mod(relPos.y + uTickStep * 0.5, uTickStep) - uTickStep * 0.5);
            yTicks = smoothstep(tickThickness, tickThickness * 0.5, distToTick);
        }
    }
    
    float xTicks = 0.0;
    if (abs(relPos.y) < currentTickSize) {
        if (relPos.x >= uRangeX.x && relPos.x <= uRangeX.y) {
            float distToTick = abs(mod(relPos.x + uTickStep * 0.5, uTickStep) - uTickStep * 0.5);
            xTicks = smoothstep(tickThickness, tickThickness * 0.5, distToTick);
        }
    }
    
    float finalAlpha = max(max(xAxis, yAxis), max(xTicks, yTicks));
    if (finalAlpha < 0.1) discard;
    
    gl_FragColor = vec4(uColor, finalAlpha * 0.6);
}
