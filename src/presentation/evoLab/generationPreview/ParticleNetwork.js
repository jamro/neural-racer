import * as PIXI from 'pixi.js';

const CONNECTION_DEFAULT_COLOR = 0xffff66;

export class Connection extends PIXI.Graphics {
  constructor(x1, y1, x2, y2, color1 = CONNECTION_DEFAULT_COLOR, color2 = CONNECTION_DEFAULT_COLOR) {
    super();
    // Calculate distances
    const verticalDistance = Math.abs(y2 - y1);
    const horizontalDistance = Math.abs(x2 - x1);

    const alpha = 0.8
    const width = 1.5
    
    // For vertical start/end tangents, control points must have same x as endpoints
    // Control points offset vertically to create smooth arch
    const archHeight = Math.min(verticalDistance * 0.4, horizontalDistance * 0.6, 50);
    
    // First control point: same x as start, offset vertically (vertical tangent at start)
    const cp1x = x1;
    const cp1y = y1 + (y2 > y1 ? archHeight : -archHeight);
    
    // Second control point: same x as end, offset vertically (vertical tangent at end)
    const cp2x = x2;
    const cp2y = y2 + (y2 > y1 ? -archHeight : archHeight);
    
    // Helper function to convert hex color to RGB
    const hexToRgb = (hex) => {
      const r = (hex >> 16) & 0xff;
      const g = (hex >> 8) & 0xff;
      const b = hex & 0xff;
      return { r, g, b };
    };
    
    // Helper function to interpolate between two colors
    const interpolateColor = (color1, color2, t) => {
      const c1 = hexToRgb(color1);
      const c2 = hexToRgb(color2);
      const r = Math.round(c1.r + (c2.r - c1.r) * t);
      const g = Math.round(c1.g + (c2.g - c1.g) * t);
      const b = Math.round(c1.b + (c2.b - c1.b) * t);
      return (r << 16) | (g << 8) | b;
    };
    
    // Helper function to get point on cubic bezier curve at parameter t
    const bezierPoint = (t, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) => {
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const t2 = t * t;
      const t3 = t2 * t;
      
      const x = mt3 * p0x + 3 * mt2 * t * p1x + 3 * mt * t2 * p2x + t3 * p3x;
      const y = mt3 * p0y + 3 * mt2 * t * p1y + 3 * mt * t2 * p2y + t3 * p3y;
      
      return { x, y };
    };
    
    // Sample points along the bezier curve and draw segments with gradient colors
    const segments = 50; // Number of segments for smooth gradient
    
    for (let i = 1; i <= segments; i++) {
      const t1 = (i - 1) / segments;
      const t2 = i / segments;
      
      const p1 = bezierPoint(t1, x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2);
      const p2 = bezierPoint(t2, x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2);
      
      // Interpolate color based on midpoint of the segment for smoother transition
      const tMid = (t1 + t2) / 2;
      const color = interpolateColor(color1, color2, tMid);
      
      // Draw each segment independently
      this.moveTo(p1.x, p1.y);
      this.lineTo(p2.x, p2.y);
      this.stroke({ color, width, alpha });
    }
  }

  fadeOutStep() {
    this.alpha *= 0.95;
    if (this.alpha <= 0.1) {
      if (this.parent) {
        this.parent.removeChild(this);
      }
      this.destroy();
      PIXI.Ticker.shared.remove(this.fadeOutStep, this);
    }
  }

  fadeOut() {
    PIXI.Ticker.shared.add(this.fadeOutStep, this);
  }
}

export class ConnectionGroup {
  constructor() {
    this.connections = [];
  }

  addConnection(connection) {
    this.connections.push(connection);
  }

  removeConnection(connection) {
    this.connections = this.connections.filter(c => c !== connection);
  }

  fadeOut() {
    this.connections.forEach(c => c.fadeOut());
  }
}

class ParticleNetwork extends PIXI.Container {

  constructor() {
    super();
    this.alpha = 0.8;
  }

  addConnection(sourceParticle, targetParticle) {
    const connection = new Connection(
      sourceParticle.x, 
      sourceParticle.y, 
      targetParticle.x, 
      targetParticle.y,
      sourceParticle.baseTint,
      targetParticle.baseTint
    )
    this.addChild(connection);

    return connection;
  }
}

export default ParticleNetwork;