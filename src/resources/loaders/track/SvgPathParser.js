import * as svgPathParser from 'svg-path-parser';

const MIN_SEGMENTS = 3;
const MAX_SEGMENTS = 50;
const TARGET_SEGMENT_LENGTH = 15.0; // meters/units per segment

/**
 * Utility class for parsing SVG path data into line segments.
 */
class SvgPathParser {
  /**
   * Parse SVG path data string into command objects.
   * @param {string} text - SVG path data string
   * @returns {Array} Array of path command objects
   */
  static parsePathData(text) {
    const parseFn = svgPathParser.parse || svgPathParser.default;
    if (typeof parseFn !== 'function') {
      throw new Error('Could not find parse function in svg-path-parser module.');
    }
    return parseFn(text);
  }

  /**
   * Calculate distance between two points.
   * @param {number} x1 
   * @param {number} y1 
   * @param {number} x2 
   * @param {number} y2 
   * @returns {number} Distance between points
   */
  static distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Estimate arc length of a curve by sampling points along it.
   * @param {Function} getPointAtT - Function that returns point at parameter t (0-1)
   * @param {number} sampleCount - Number of samples to take
   * @returns {number} Estimated arc length
   */
  static estimateArcLength(getPointAtT, sampleCount = 20) {
    let length = 0;
    let prevPoint = getPointAtT(0);
    for (let i = 1; i <= sampleCount; i++) {
      const t = i / sampleCount;
      const point = getPointAtT(t);
      length += SvgPathParser.distance(prevPoint.x, prevPoint.y, point.x, point.y);
      prevPoint = point;
    }
    return length;
  }

  /**
   * Calculate optimal number of segments based on curve length and shape.
   * @param {number} estimatedLength - Estimated length of the curve
   * @returns {number} Number of segments to use
   */
  static calculateSegmentCount(estimatedLength) {
    // Base segment count on arc length
    let count = Math.ceil(estimatedLength / TARGET_SEGMENT_LENGTH);
    // Apply bounds
    count = Math.max(MIN_SEGMENTS, Math.min(MAX_SEGMENTS, count));
    return count;
  }

  /**
   * Evaluate a cubic Bezier curve at parameter t (0 to 1).
   * @param {number} x0 - Start point x
   * @param {number} y0 - Start point y
   * @param {number} x1 - First control point x
   * @param {number} y1 - First control point y
   * @param {number} x2 - Second control point x
   * @param {number} y2 - Second control point y
   * @param {number} x3 - End point x
   * @param {number} y3 - End point y
   * @param {number} t - Parameter value (0 to 1)
   * @returns {{x: number, y: number}} Point on curve
   */
  static cubicBezier(x0, y0, x1, y1, x2, y2, x3, y3, t) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    
    const x = mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3;
    const y = mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3;
    
    return { x, y };
  }

  /**
   * Evaluate a quadratic Bezier curve at parameter t (0 to 1).
   * @param {number} x0 - Start point x
   * @param {number} y0 - Start point y
   * @param {number} x1 - Control point x
   * @param {number} y1 - Control point y
   * @param {number} x2 - End point x
   * @param {number} y2 - End point y
   * @param {number} t - Parameter value (0 to 1)
   * @returns {{x: number, y: number}} Point on curve
   */
  static quadraticBezier(x0, y0, x1, y1, x2, y2, t) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    
    const x = mt2 * x0 + 2 * mt * t * x1 + t2 * x2;
    const y = mt2 * y0 + 2 * mt * t * y1 + t2 * y2;
    
    return { x, y };
  }

  /**
   * Parse SVG path commands into line segments.
   * @param {Array} cmds - Array of path command objects from svg-path-parser
   * @returns {Array<{ax: number, ay: number, bx: number, by: number}>} Array of line segments
   */
  static parsePathToSegments(cmds) {
    let cx = 0, cy = 0;      // current point
    let sx = 0, sy = 0;      // start of current subpath (for Z)
    let prevCX = 0, prevCY = 0; // previous control point for smooth curves
    const segments = [];

    const lineTo = (nx, ny) => {
      segments.push({ ax: cx, ay: cy, bx: nx, by: ny });
      cx = nx; cy = ny;
    };

    const curveToLineSegments = (startX, startY, endX, endY, getPointAtT) => {
      // Estimate arc length to determine optimal segment count
      const estimatedLength = SvgPathParser.estimateArcLength(getPointAtT);
      const segmentCount = SvgPathParser.calculateSegmentCount(estimatedLength);
      
      let prevPoint = { x: startX, y: startY };
      for (let i = 1; i <= segmentCount; i++) {
        const t = i / segmentCount;
        const point = getPointAtT(t);
        segments.push({ ax: prevPoint.x, ay: prevPoint.y, bx: point.x, by: point.y });
        prevPoint = point;
      }
      cx = endX;
      cy = endY;
    };

    for (const c of cmds) {
      const code = c.code;
      if (!code) {
        throw new Error('Invalid path command: ' + JSON.stringify(c));
      }

      if (code === "M") {
        cx = c.x; cy = c.y;
        sx = cx; sy = cy;
        prevCX = cx; prevCY = cy; // Reset previous control point for smooth curves
        continue;
      }
      if (code === "m") {
        cx += c.x; cy += c.y;
        sx = cx; sy = cy;
        prevCX = cx; prevCY = cy; // Reset previous control point for smooth curves
        continue;
      }

      if (code === "L") {
        lineTo(c.x, c.y);
        prevCX = cx; prevCY = cy; // Reset previous control point for smooth curves
      }
      else if (code === "l") {
        lineTo(cx + c.x, cy + c.y);
        prevCX = cx; prevCY = cy; // Reset previous control point for smooth curves
      }

      else if (code === "H") {
        lineTo(c.x, cy);
        prevCX = cx; prevCY = cy; // Reset previous control point for smooth curves
      }
      else if (code === "h") {
        lineTo(cx + c.x, cy);
        prevCX = cx; prevCY = cy; // Reset previous control point for smooth curves
      }

      else if (code === "V") {
        lineTo(cx, c.y);
        prevCX = cx; prevCY = cy; // Reset previous control point for smooth curves
      }
      else if (code === "v") {
        lineTo(cx, cy + c.y);
        prevCX = cx; prevCY = cy; // Reset previous control point for smooth curves
      }

      else if (code === "C") {
        // Cubic Bezier (absolute): x1, y1, x2, y2, x, y
        const startX = cx, startY = cy;
        const endX = c.x, endY = c.y;
        curveToLineSegments(startX, startY, endX, endY, (t) => 
          SvgPathParser.cubicBezier(startX, startY, c.x1, c.y1, c.x2, c.y2, endX, endY, t)
        );
        prevCX = c.x2;
        prevCY = c.y2;
      }
      else if (code === "c") {
        // Cubic Bezier (relative)
        const startX = cx, startY = cy;
        const endX = cx + c.x, endY = cy + c.y;
        curveToLineSegments(startX, startY, endX, endY, (t) => 
          SvgPathParser.cubicBezier(startX, startY, startX + c.x1, startY + c.y1, startX + c.x2, startY + c.y2, endX, endY, t)
        );
        prevCX = startX + c.x2;
        prevCY = startY + c.y2;
      }
      else if (code === "S") {
        // Smooth cubic Bezier (absolute): x2, y2, x, y
        // First control point is reflection of previous control point
        const startX = cx, startY = cy;
        const endX = c.x, endY = c.y;
        const x1 = 2 * startX - prevCX;
        const y1 = 2 * startY - prevCY;
        curveToLineSegments(startX, startY, endX, endY, (t) => 
          SvgPathParser.cubicBezier(startX, startY, x1, y1, c.x2, c.y2, endX, endY, t)
        );
        prevCX = c.x2;
        prevCY = c.y2;
      }
      else if (code === "s") {
        // Smooth cubic Bezier (relative)
        const startX = cx, startY = cy;
        const endX = cx + c.x, endY = cy + c.y;
        const x1 = 2 * startX - prevCX;
        const y1 = 2 * startY - prevCY;
        curveToLineSegments(startX, startY, endX, endY, (t) => 
          SvgPathParser.cubicBezier(startX, startY, x1, y1, startX + c.x2, startY + c.y2, endX, endY, t)
        );
        prevCX = startX + c.x2;
        prevCY = startY + c.y2;
      }
      else if (code === "Q") {
        // Quadratic Bezier (absolute): x1, y1, x, y
        const startX = cx, startY = cy;
        const endX = c.x, endY = c.y;
        curveToLineSegments(startX, startY, endX, endY, (t) => 
          SvgPathParser.quadraticBezier(startX, startY, c.x1, c.y1, endX, endY, t)
        );
        prevCX = c.x1;
        prevCY = c.y1;
      }
      else if (code === "q") {
        // Quadratic Bezier (relative)
        const startX = cx, startY = cy;
        const endX = cx + c.x, endY = cy + c.y;
        curveToLineSegments(startX, startY, endX, endY, (t) => 
          SvgPathParser.quadraticBezier(startX, startY, startX + c.x1, startY + c.y1, endX, endY, t)
        );
        prevCX = startX + c.x1;
        prevCY = startY + c.y1;
      }
      else if (code === "T") {
        // Smooth quadratic Bezier (absolute): x, y
        // Control point is reflection of previous control point
        const startX = cx, startY = cy;
        const endX = c.x, endY = c.y;
        const x1 = 2 * startX - prevCX;
        const y1 = 2 * startY - prevCY;
        curveToLineSegments(startX, startY, endX, endY, (t) => 
          SvgPathParser.quadraticBezier(startX, startY, x1, y1, endX, endY, t)
        );
        prevCX = x1;
        prevCY = y1;
      }
      else if (code === "t") {
        // Smooth quadratic Bezier (relative)
        const startX = cx, startY = cy;
        const endX = cx + c.x, endY = cy + c.y;
        const x1 = 2 * startX - prevCX;
        const y1 = 2 * startY - prevCY;
        curveToLineSegments(startX, startY, endX, endY, (t) => 
          SvgPathParser.quadraticBezier(startX, startY, x1, y1, endX, endY, t)
        );
        prevCX = x1;
        prevCY = y1;
      }

      else if (code === "Z" || code === "z") {
        // close to subpath start
        lineTo(sx, sy);
        prevCX = cx; prevCY = cy; // Reset previous control point for smooth curves
      } else {
        // You can choose to throw here, or ignore unsupported commands
        throw new Error(`Unsupported path command: ${code}`);
      }
    }

    return segments;
  }
}

export default SvgPathParser;

