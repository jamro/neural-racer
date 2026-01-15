import TrackObject from '../engine/simulation/track/TrackObject';
import SvgPathParser from './SvgPathParser';

/**
 * Class responsible for loading and parsing SVG track files.
 */
class SvgTrackLoader {
  /**
   * Load an SVG document from a URL.
   * @param {string} url - URL to the SVG file
   * @returns {Promise<Document>} Parsed SVG document
   */
  static async loadSvg(url) {
    const response = await fetch(url);
    const svgText = await response.text();
    const svg = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    return svg;
  }

  /**
   * Extract line segments from a path group in the SVG.
   * @param {Document} svg - Parsed SVG document
   * @param {string} groupId - ID of the group element containing paths
   * @returns {Array<{ax: number, ay: number, bx: number, by: number}>} Array of line segments
   * @throws {Error} If the group is not found
   */
  static getSegmentsFromPathGroup(svg, groupId) {
    const container = svg.querySelector(`g#${groupId}`);
    if (!container) {
      throw new Error(
        `Path group '${groupId}' not found in SVG. ` +
        `Please make sure the document has a group with ID "${groupId}"`
      );
    }

    const wallPaths = [];
    
    // Iterate over all children of the container
    for (const child of container.children) {
      if (child.tagName === 'path') {
        const pathData = child.getAttribute('d');
        const path = SvgPathParser.parsePathData(pathData);
        const segments = SvgPathParser.parsePathToSegments(path);
        wallPaths.push(...segments);
      }
    }
    return wallPaths;
  }

  /**
   * Extract track graphics from a path group in the SVG.
   * @param {Document} svg - Parsed SVG document
   * @param {string} groupId - ID of the group element containing paths
   * @returns {Array<{x: number, y: number, texture: string}>} Array of track graphics
   * @throws {Error} If the group is not found
   */
  static getTrackGraphicsFromPathGroup(svg, groupId) {
    const container = svg.querySelector(`g#${groupId}`);
    if (!container) {
      throw new Error(
        `Path group '${groupId}' not found in SVG. ` +
        `Please make sure the document has a group with ID "${groupId}"`
      );
    }

    const trackGraphics = [];

    for (const child of container.children) {
      if (child.tagName === 'image') {
        const filename = child.getAttribute('xlink:href').split('/').pop().split('.').shift();
        const width = parseFloat(child.getAttribute('width'));
        const height = parseFloat(child.getAttribute('height'));
        const x = parseFloat(child.getAttribute('x'));
        const y = parseFloat(child.getAttribute('y'));
        const transform = child.getAttribute('transform');
        const {x: adjustedX, y: adjustedY, rotation, scaleX, scaleY} = SvgTrackLoader.parseTransform(transform, x, y, width, height);
        trackGraphics.push({ type: 'image', filename, x: adjustedX, y: adjustedY, width, height, rotation, scaleX, scaleY });
      } else if (child.tagName === 'path') {
        const pathData = child.getAttribute('d');
        const path = SvgPathParser.parsePathData(pathData);
        const segments = SvgPathParser.parsePathToSegments(path);
        trackGraphics.push({ type: 'path', segments });
      }
    }
    return trackGraphics;
  }

  /**
   * Parse SVG transform attribute into scaleX, scaleY, rotation, and adjusted x, y.
   * Compensates for transform effects on position.
   * @param {string|null|undefined} transform - SVG transform attribute value
   * @param {number} x - Original x coordinate
   * @param {number} y - Original y coordinate
   * @param {number} width - Element width
   * @param {number} height - Element height
   * @returns {{x: number, y: number, scaleX: number, scaleY: number, rotation: number}} Parsed transform values with adjusted position
   */
  static parseTransform(transform, x = 0, y = 0, width = 0, height = 0) {
    // Default values
    let scaleX = 1;
    let scaleY = 1;
    let rotation = 0;
    let adjustedX = x;
    let adjustedY = y;

    if (!transform || transform.trim() === '') {
      return { x: adjustedX, y: adjustedY, scaleX, scaleY, rotation };
    }

    // Check for translate() function and throw exception if found
    const translateRegex = /translate\s*\(/i;
    if (translateRegex.test(transform)) {
      throw new Error('translate() transform is not supported. Transform string: ' + transform);
    }

    // Build transformation matrix to calculate final position
    // SVG transforms are applied in order: rotate, scale
    // We'll accumulate the transform and apply it to (x, y)
    let currentX = x;
    let currentY = y;
    let totalRotation = 0;
    let totalScaleX = 1;
    let totalScaleY = 1;

    // Match all transform functions in the string using regex
    const transformRegex = /(\w+)\s*\(([^)]*)\)/g;
    let match;

    while ((match = transformRegex.exec(transform)) !== null) {
      const functionName = match[1].toLowerCase();
      const params = match[2].split(',').map(p => p.trim());

      if (functionName === 'rotate') {
        // rotate(angle) or rotate(angle, cx, cy)
        // SVG rotate uses degrees, convert to radians
        if (params.length >= 1) {
          const angleDegrees = parseFloat(params[0]);
          const angleRad = angleDegrees * (Math.PI / 180);
          rotation += angleRad;
          totalRotation += angleRad;

          // Apply rotation around (0,0) to current position
          const cos = Math.cos(angleRad);
          const sin = Math.sin(angleRad);
          const newX = currentX * cos - currentY * sin;
          const newY = currentX * sin + currentY * cos;
          currentX = newX;
          currentY = newY;
        }
      } else if (functionName === 'scale') {
        // scale(x, y) or scale(s)
        if (params.length >= 1) {
          const sx = parseFloat(params[0]);
          const sy = params.length >= 2 ? parseFloat(params[1]) : sx;
          scaleX *= sx;
          scaleY *= sy;
          totalScaleX *= sx;
          totalScaleY *= sy;

          // Apply scale to current position
          currentX *= sx;
          currentY *= sy;
        }
      } else if (functionName === 'matrix') {
        // matrix(a, b, c, d, e, f)
        // [a c e]   [x]   [a*x + c*y + e]
        // [b d f] * [y] = [b*x + d*y + f]
        // [0 0 1]   [1]   [      1      ]
        if (params.length >= 6) {
          const a = parseFloat(params[0]);
          const b = parseFloat(params[1]);
          const c = parseFloat(params[2]);
          const d = parseFloat(params[3]);
          const e = parseFloat(params[4]);
          const f = parseFloat(params[5]);

          // Extract scale from matrix
          const matrixScaleX = Math.sqrt(a * a + b * b);
          const matrixScaleY = Math.sqrt(c * c + d * d);
          scaleX *= matrixScaleX;
          scaleY *= matrixScaleY;
          totalScaleX *= matrixScaleX;
          totalScaleY *= matrixScaleY;

          // Extract rotation from matrix
          const matrixRotation = Math.atan2(b, a);
          rotation += matrixRotation;
          totalRotation += matrixRotation;

          // Apply matrix transform to current position
          const newX = a * currentX + c * currentY + e;
          const newY = b * currentX + d * currentY + f;
          currentX = newX;
          currentY = newY;
        }
      }
    }

    adjustedX = currentX;
    adjustedY = currentY;

    return { x: adjustedX, y: adjustedY, scaleX, scaleY, rotation };
  }

  /**
   * Load a track from an SVG file.
   * @param {string} url - URL to the SVG file
   * @returns {Promise<TrackObject>} Loaded track object
   */
  static async load(url) {
    const svg = await SvgTrackLoader.loadSvg(url);
    const wallSegments = SvgTrackLoader.getSegmentsFromPathGroup(svg, 'walls');
    const checkpoints = SvgTrackLoader.getSegmentsFromPathGroup(svg, 'checkpoints');
    const trackGraphics = SvgTrackLoader.getTrackGraphicsFromPathGroup(svg, 'graphics');


    const track = new TrackObject();
    for (const segment of wallSegments) {
      track.addSegment(segment.ax, segment.ay, segment.bx, segment.by);
    }
    for (const checkpoint of checkpoints) {
      track.addCheckpoint(checkpoint.ax, checkpoint.ay, checkpoint.bx, checkpoint.by);
    }

    for (const trackGraphic of trackGraphics) {
      if (trackGraphic.type === 'image') {
          track.addTrackGraphic(
            trackGraphic.filename, 
            trackGraphic.x, 
            trackGraphic.y, 
            trackGraphic.width,
            trackGraphic.height,
            trackGraphic.rotation, 
            trackGraphic.scaleX, 
            trackGraphic.scaleY
          );
        } else if (trackGraphic.type === 'path') {
          track.addTrackShape(trackGraphic.segments);
        }
    }
    const trackName = url.split('/').pop().split('.').shift();
    track.name = trackName;
    return track;
  }
}

export default SvgTrackLoader;

