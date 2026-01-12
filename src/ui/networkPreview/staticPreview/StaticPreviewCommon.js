// Shared utilities for static (non-animated) network previews.
// Used by StaticNetworkPreview and EvoNetworkPreview to avoid duplicated layout/render logic.

export const STATIC_PREVIEW_CONFIG = {
  NODE_RADIUS: 2,
  CONNECTION_ALPHA_MIN: 0.5,
  CONNECTION_ALPHA_MAX: 0.7,
  CONNECTION_WIDTH_MIN: 0.5,
  CONNECTION_TOP_K: 3,
  MAX_EDGES_PER_LAYER: 10,
  HIDE_INACTIVE_NEURONS: true,
};

export function getConnectionWidthMax(nodeRadius = STATIC_PREVIEW_CONFIG.NODE_RADIUS) {
  return nodeRadius * 1.5;
}

export function computePositions({ sizes, width, height, nodeRadius = STATIC_PREVIEW_CONFIG.NODE_RADIUS }) {
  const pad = 10;
  const layerCount = sizes.length;
  const x0 = pad;
  const x1 = Math.max(pad, width - pad);
  const xSpacing = layerCount > 1 ? (x1 - x0) / (layerCount - 1) : 0;

  return sizes.map((count, layerIdx) => {
    const baseX = x0 + layerIdx * xSpacing;
    const isOutputLayer = layerIdx === layerCount - 1;

    // Output layer: spacing == padding
    const y0 = isOutputLayer ? 0 : pad;
    const y1p = isOutputLayer ? height : Math.max(pad, height - pad);
    const ySpacing = isOutputLayer
      ? (count > 0 ? (y1p - y0) / (count + 1) : 0)
      : (count > 1 ? (y1p - y0) / (count - 1) : 0);

    const ys = [];
    const xs = [];

    const isHiddenLayer = layerIdx > 0 && layerIdx < layerCount - 1;
    for (let i = 0; i < count; i++) {
      ys.push(isOutputLayer ? (y0 + (i + 1) * ySpacing) : (y0 + i * ySpacing));
    }
    for (let i = 0; i < count; i++) {
      const dx = isHiddenLayer ? (i % 2 === 0 ? -nodeRadius : nodeRadius) : 0;
      const x = Math.max(pad, Math.min(width - pad, baseX + dx));
      xs.push(x);
    }

    return { xs, ys };
  });
}

function buildCandidatesForLayer({ layerWeights, inCount, outCount, topK, maxEdgesPerLayer }) {
  const candidates = [];

  if (layerWeights) {
    for (let o = 0; o < outCount; o++) {
      const row = layerWeights[o];
      const idx = Array.from({ length: inCount }, (_, i) => i);
      idx.sort((a, b) => Math.abs(row[b]) - Math.abs(row[a]));
      const indices = idx.slice(0, Math.min(topK, idx.length));
      for (const i of indices) candidates.push({ i, o, abs: Math.abs(row[i]) });
    }
    candidates.sort((a, b) => b.abs - a.abs);
  } else {
    for (let o = 0; o < outCount; o++) {
      for (let i = 0; i < inCount; i++) {
        candidates.push({ i, o, abs: 0 });
        if (candidates.length >= maxEdgesPerLayer) break;
      }
      if (candidates.length >= maxEdgesPerLayer) break;
    }
  }

  return candidates;
}

export function buildVisibleEdgeSetsFromWeights({
  weights,
  sizes,
  topK = STATIC_PREVIEW_CONFIG.CONNECTION_TOP_K,
  maxEdgesPerLayer = STATIC_PREVIEW_CONFIG.MAX_EDGES_PER_LAYER,
}) {
  // Returns Array<Set<string>> where each set contains "i,o" for edges drawn in that layer.
  if (!weights?.length || !sizes?.length) return [];
  const layerCount = sizes.length;
  const sets = new Array(Math.max(0, layerCount - 1));

  for (let l = 0; l < layerCount - 1; l++) {
    const inCount = sizes[l];
    const outCount = sizes[l + 1];
    const layerWeights = weights?.[l];

    const candidates = buildCandidatesForLayer({
      layerWeights,
      inCount,
      outCount,
      topK,
      maxEdgesPerLayer
    });

    const edgesToDraw = candidates.slice(0, Math.min(maxEdgesPerLayer, candidates.length));
    const set = new Set();
    for (const e of edgesToDraw) set.add(`${e.i},${e.o}`);
    sets[l] = set;
  }

  return sets;
}

export function buildLayersFromWeights({
  weights,
  sizes,
  nodeRadius = STATIC_PREVIEW_CONFIG.NODE_RADIUS,
  topK = STATIC_PREVIEW_CONFIG.CONNECTION_TOP_K,
  maxEdgesPerLayer = STATIC_PREVIEW_CONFIG.MAX_EDGES_PER_LAYER,
  alphaMin = STATIC_PREVIEW_CONFIG.CONNECTION_ALPHA_MIN,
  alphaMax = STATIC_PREVIEW_CONFIG.CONNECTION_ALPHA_MAX,
  widthMin = STATIC_PREVIEW_CONFIG.CONNECTION_WIDTH_MIN,
  widthMax = getConnectionWidthMax(nodeRadius),
  edgeFactory, // ({ layerIdx, i, o, value, abs, t, baseWidth, baseAlpha }) => ({ i,o,color,width,alpha })
}) {
  const layerCount = sizes.length;
  const layers = [];

  for (let l = 0; l < layerCount - 1; l++) {
    const inCount = sizes[l];
    const outCount = sizes[l + 1];
    const layerWeights = weights?.[l] ?? null; // [out][in]

    const candidates = buildCandidatesForLayer({
      layerWeights,
      inCount,
      outCount,
      topK,
      maxEdgesPerLayer
    });

    const edgesToDraw = candidates.slice(0, Math.min(maxEdgesPerLayer, candidates.length));

    let maxAbs = 0;
    let minAbs = Infinity;
    for (const e of edgesToDraw) {
      const a = e.abs ?? 0;
      if (!Number.isFinite(a)) continue;
      maxAbs = Math.max(maxAbs, a);
      minAbs = Math.min(minAbs, a);
    }
    if (!Number.isFinite(minAbs)) minAbs = 0;
    const denom = Math.max(1e-9, maxAbs - minAbs);

    const edges = edgesToDraw.map((e) => {
      const value = layerWeights ? layerWeights[e.o][e.i] : NaN;
      const t = layerWeights ? Math.min(1, Math.max(0, (e.abs - minAbs) / denom)) : 0;
      const baseAlpha = layerWeights ? (alphaMin + (alphaMax - alphaMin) * t) : alphaMin;
      const baseWidth = widthMin + (widthMax - widthMin) * t;

      if (typeof edgeFactory === 'function') {
        return edgeFactory({ layerIdx: l, i: e.i, o: e.o, value, abs: e.abs, t, baseWidth, baseAlpha });
      }

      return { i: e.i, o: e.o, color: 0xffffff, width: baseWidth, alpha: baseAlpha };
    });

    layers.push({ from: l, edges });
  }

  return layers;
}

export class NetworkDiagramRenderer {
  constructor(canvas, { hideInactiveNeurons = STATIC_PREVIEW_CONFIG.HIDE_INACTIVE_NEURONS } = {}) {
    this.canvas = canvas;
    this.hideInactiveNeurons = hideInactiveNeurons;
  }

  drawCurvedConnection(x1, y1, x2, y2, style) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const absDx = Math.abs(dx);
    const dir = dx >= 0 ? 1 : -1;

    // Start/end tangent horizontal: control points keep y == endpoint y.
    const controlDist = Math.max(12, Math.min(60, absDx * 0.5));
    const cx1 = x1 + dir * controlDist;
    const cy1 = y1;
    const cx2 = x2 - dir * controlDist;
    const cy2 = y2;

    const isTiny = absDx < 2 && Math.abs(dy) < 2;

    this.canvas.moveTo(x1, y1);
    if (isTiny) {
      this.canvas.lineTo(x2, y2);
    } else {
      this.canvas.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
    }
    this.canvas.stroke(style);
  }

  render({ sizes, positions, layers, nodeColors, nodeRadius, fallbackNodeColor }) {
    const isActive = sizes.map(n => new Array(n).fill(false));

    // Edges first (mark active along the way)
    for (const layer of layers) {
      const from = positions[layer.from];
      const to = positions[layer.from + 1];
      for (const e of layer.edges) {
        isActive[layer.from][e.i] = true;
        isActive[layer.from + 1][e.o] = true;
        this.drawCurvedConnection(
          from.xs[e.i],
          from.ys[e.i],
          to.xs[e.o],
          to.ys[e.o],
          { color: e.color ?? fallbackNodeColor, width: e.width, alpha: e.alpha }
        );
      }
    }

    // Nodes
    for (let l = 0; l < sizes.length; l++) {
      const { xs, ys } = positions[l];
      for (let i = 0; i < ys.length; i++) {
        if (this.hideInactiveNeurons && !isActive[l][i]) continue;
        const color = nodeColors?.[l]?.[i] ?? fallbackNodeColor;
        this.canvas.circle(xs[i], ys[i], nodeRadius);
        this.canvas.fill({ color, alpha: 1 });
      }
    }
  }
}

