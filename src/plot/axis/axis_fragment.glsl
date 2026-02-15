precision highp float;

varying vec3 vWorldPos;

uniform vec3 uColor;
uniform vec2 uOffset;
uniform float uZoom;
uniform float uThickness;
uniform float uTickStep;
uniform float uTickSize;
uniform float uSubTicks;
uniform float uSubTickSize;
uniform vec2 uRangeX; // minX, maxX
uniform vec2 uRangeY; // minY, maxY

float getLine(float d, float width) {
    float fw = fwidth(d);
    return smoothstep(width + fw, width - fw, abs(d));
}

float getPeriodicTicks(float pos, float step, float width) {
    float fw = fwidth(pos);
    float dist = abs(fract(pos / step + 0.5) - 0.5) * step;
    return smoothstep(width + fw, width - fw, dist);
}

void main() {
    vec2 relPos = vWorldPos.xy - uOffset;
    float plotHeight = uRangeY.y - uRangeY.x;
    
    // Calculate pixel size in world units
    float pixelSize = 1.0 / uZoom;
    
    // Thicknesses in world units
    float lineW = max(uThickness * pixelSize * 0.5, pixelSize * 0.5);
    float tickW = max(uThickness * pixelSize * 0.4, pixelSize * 0.4);
    float subTickW = max(uThickness * pixelSize * 0.25, pixelSize * 0.3);
    
    // Limits
    float maxW = plotHeight * 0.05;
    lineW = min(lineW, maxW);
    tickW = min(tickW, maxW);
    subTickW = min(subTickW, maxW);

    // 1. Axes
    float yAxis = 0.0;
    if (relPos.y >= uRangeY.x - 1.0 && relPos.y <= uRangeY.y + 1.0) {
        yAxis = getLine(relPos.x - uRangeX.x, lineW);
    }
    
    float xAxis = 0.0;
    if (relPos.x >= uRangeX.x - 1.0 && relPos.x <= uRangeX.y + 1.0) {
        xAxis = getLine(relPos.y, lineW);
    }
    
    // 2. Ticks
    float currentTickSize = min(uTickSize * pixelSize, plotHeight * 0.1);
    float currentSubTickSize = min(uSubTickSize * pixelSize, plotHeight * 0.05);
    
    float yTicks = 0.0;
    float ySubTicks = 0.0;
    if (relPos.y >= uRangeY.x && relPos.y <= uRangeY.y) {
        // Main Ticks
        if (relPos.x >= uRangeX.x && relPos.x <= uRangeX.x + currentTickSize) {
            yTicks = getPeriodicTicks(relPos.y, uTickStep, tickW);
        }
        // Sub Ticks
        if (uSubTicks > 1.0 && relPos.x >= uRangeX.x && relPos.x <= uRangeX.x + currentSubTickSize) {
            ySubTicks = getPeriodicTicks(relPos.y, uTickStep / uSubTicks, subTickW) * 0.6;
        }
    }
    
    float xTicks = 0.0;
    float xSubTicks = 0.0;
    if (relPos.x >= uRangeX.x && relPos.x <= uRangeX.y) {
        // Main Ticks
        if (abs(relPos.y) < currentTickSize) {
            xTicks = getPeriodicTicks(relPos.x, uTickStep, tickW);
        }
        // Sub Ticks
        if (uSubTicks > 1.0 && abs(relPos.y) < currentSubTickSize) {
            xSubTicks = getPeriodicTicks(relPos.x, uTickStep / uSubTicks, subTickW) * 0.6;
        }
    }
    
    float combinedTicks = max(max(xTicks, yTicks), max(xSubTicks, ySubTicks));
    float finalAlpha = max(max(xAxis, yAxis), combinedTicks);
    
    if (finalAlpha < 0.01) discard;
    
    gl_FragColor = vec4(uColor, finalAlpha * 0.7);
}
