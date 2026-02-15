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
    vec2 relPos = vWorldPos.xy - uOffset;
    
    // Bounds of the plot
    float plotHeight = uRangeY.y - uRangeY.x;
    
    // Thickness logic: constant pixels (1.5px) but clamped to 2% of plot height 
    // to avoid drowning the data when zooming out.
    float maxWorldThickness = plotHeight * 0.02;
    float lineThickness = min(1.5 / uZoom, maxWorldThickness);
    float tickThickness = min(1.0 / uZoom, maxWorldThickness);
    
    // 1. Y-Axis at the LEFT
    float yAxis = 0.0;
    if (relPos.y >= uRangeY.x && relPos.y <= uRangeY.y) {
        yAxis = smoothstep(lineThickness, lineThickness * 0.5, abs(vWorldPos.x - uRangeX.x));
    }
    
    // 2. X-Axis at the CENTER baseline (Y = 0)
    float xAxis = 0.0;
    if (relPos.x >= uRangeX.x && relPos.x <= uRangeX.y) {
        xAxis = smoothstep(lineThickness, lineThickness * 0.5, abs(relPos.y));
    }
    
    // 3. Ticks
    // World size of ticks also clamped
    float currentTickSize = min(uTickSize / uZoom, plotHeight * 0.1);
    
    float yTicks = 0.0;
    if (vWorldPos.x >= uRangeX.x && vWorldPos.x <= uRangeX.x + currentTickSize) {
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
