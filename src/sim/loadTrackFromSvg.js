import TrackObject from './TrackObject';
import * as svgPathParser from 'svg-path-parser';

async function loadSvg(url) {
  const response = await fetch(url);
  const svgText = await response.text();
  const svg = new DOMParser().parseFromString(svgText, 'image/svg+xml');

  return svg;
}


function parsePathData(text) {
  const parseFn = svgPathParser.parse || svgPathParser.default;
  if (typeof parseFn !== 'function') {
    throw new Error('Could not find parse function in svg-path-parser module.');
  }
  return parseFn(text);
}

function getWallPath(svg) {
  const walls = svg.querySelector('path#walls');
  if (!walls) {
    throw new Error('Walls not found in SVG. Please make sure the document has a path with ID "walls"');
  }
  const wallData = walls.getAttribute('d');
  if (!wallData) {
    throw new Error('Wall data not found in SVG. Please make sure element with ID "walls" has a "d" attribute');
  }

  const path = parsePathData(wallData);
  return path;
}

function parsePathToSegments(cmds) {
  let cx = 0, cy = 0;      // current point
  let sx = 0, sy = 0;      // start of current subpath (for Z)
  const segments = [];

  const lineTo = (nx, ny) => {
    // skip zero-length segments if you want:
    // if (nx === cx && ny === cy) return;
    segments.push({ ax: cx, ay: cy, bx: nx, by: ny });
    cx = nx; cy = ny;
  };

  for (const c of cmds) {
    const code = c.code;

    if (code === "M") {
      cx = c.x; cy = c.y;
      sx = cx; sy = cy;
      continue;
    }
    if (code === "m") {
      cx += c.x; cy += c.y;
      sx = cx; sy = cy;
      continue;
    }

    if (code === "L") lineTo(c.x, c.y);
    else if (code === "l") lineTo(cx + c.x, cy + c.y);

    else if (code === "H") lineTo(c.x, cy);
    else if (code === "h") lineTo(cx + c.x, cy);

    else if (code === "V") lineTo(cx, c.y);
    else if (code === "v") lineTo(cx, cy + c.y);

    else if (code === "Z" || code === "z") {
      // close to subpath start
      lineTo(sx, sy);
    } else {
      // You can choose to throw here, or ignore unsupported commands
      throw new Error(`Unsupported path command: ${code}`);
    }
  }

  return segments;
}


function getCheckpoints(svg) {
  const container = svg.querySelector('g#checkpoints');
  if (!container) {
    throw new Error('Checkpoints container not found in SVG. Please make sure the document has a group with ID "checkpoints"');
  }

  const checkpoints = [];
  
  // iterate over all children of the container
  for (const child of container.children) {
    if (child.tagName === 'path') {
      const pathData = child.getAttribute('d');
      const path = parsePathData(pathData);
      const segments = parsePathToSegments(path);
      checkpoints.push(segments[0]);
    }
  }
  return checkpoints;
}

export default async function loadTrackFromSvg(url) {
  const svg = await loadSvg(url);
  const wallPath = getWallPath(svg)
  const wallSegments = parsePathToSegments(wallPath);

  const checkpoints = getCheckpoints(svg);

  const track = new TrackObject();
  for (const segment of wallSegments) {
    track.addSegment(segment.ax, segment.ay, segment.bx, segment.by);
  }
  for (const checkpoint of checkpoints) {
    track.addCheckpoint(checkpoint.ax, checkpoint.ay, checkpoint.bx, checkpoint.by);
  }
  return track;
}