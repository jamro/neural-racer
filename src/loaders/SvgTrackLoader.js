import TrackObject from '../sim/track/TrackObject';
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
   * Load a track from an SVG file.
   * @param {string} url - URL to the SVG file
   * @returns {Promise<TrackObject>} Loaded track object
   */
  static async load(url) {
    const svg = await SvgTrackLoader.loadSvg(url);
    const wallSegments = SvgTrackLoader.getSegmentsFromPathGroup(svg, 'walls');
    const checkpoints = SvgTrackLoader.getSegmentsFromPathGroup(svg, 'checkpoints');

    const track = new TrackObject();
    for (const segment of wallSegments) {
      track.addSegment(segment.ax, segment.ay, segment.bx, segment.by);
    }
    for (const checkpoint of checkpoints) {
      track.addCheckpoint(checkpoint.ax, checkpoint.ay, checkpoint.bx, checkpoint.by);
    }
    return track;
  }
}

export default SvgTrackLoader;

