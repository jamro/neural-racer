import * as PIXI from 'pixi.js';
import { extractBiases, extractWeights } from './utils';

// Keep StaticNetworkPreview self-contained (no constants import).
const NODE_RADIUS = 1.5;
const COLOR_POSITIVE = 0xFF6600;
const COLOR_NEGATIVE = 0x6666FF;
const COLOR_NEUTRAL = 0xFF6600;
const BIAS_NORM_PERCENTILE = 0.9;
const BIAS_FILL_ALPHA_MIN = 0.28;
const BIAS_FILL_ALPHA_MAX = 0.95;
const BIAS_FILL_ALPHA_EXPONENT = 0.5;
const CONNECTION_ALPHA_MIN = 0;
const CONNECTION_ALPHA_MAX = 0.7;
const CONNECTION_WIDTH_MIN = 0.0;
const CONNECTION_WIDTH_MAX = NODE_RADIUS*1.5;
const CONNECTION_TOP_K = 2;
const MAX_EDGES_PER_LAYER = 15;
const HIDE_INACTIVE_NEURONS = true;

class StaticNetworkPreview extends PIXI.Container {
  constructor(width, height, neuralNetwork, genome) {
    super();
    this.neuralNetwork = neuralNetwork;
    this.genome = genome;
    this.canvasWidth = width;
    this.canvasHeight = height;

    this.canvas = new PIXI.Graphics();
    this.addChild(this.canvas);

    this.renderView(this.neuralNetwork, this.genome);
  }

  drawCurvedConnection(x1, y1, x2, y2, style) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const absDx = Math.abs(dx);
    const dir = dx >= 0 ? 1 : -1;

    // Control point horizontal offset: big enough to show curvature, but bounded.
    const controlDist = Math.max(12, Math.min(60, absDx * 0.5));
    const cx1 = x1 + dir * controlDist;
    const cy1 = y1; // keep start tangent horizontal
    const cx2 = x2 - dir * controlDist;
    const cy2 = y2; // keep end tangent horizontal

    // If points are extremely close, fall back to a straight line.
    const isTiny = absDx < 2 && Math.abs(dy) < 2;

    this.canvas.moveTo(x1, y1);
    if (isTiny) {
      this.canvas.lineTo(x2, y2);
    } else {
      this.canvas.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
    }
    this.canvas.stroke(style);
  }

  /**
   * Render a static architecture preview (nodes + connections).
   * @param {Object} network - NeuralNet-like object with `sizes`
   * @param {Object|Array|null} genome - optional genome (falls back to network.genome)
   */
  renderView(network, genome = null) {
    this.canvas.clear();
    if (!network?.sizes?.length) return;

    const { sizes } = network;
    const genes = genome ?? network.genome ?? null;
    const weights = genes ? extractWeights(network, genes) : null;
    const biases = genes ? extractBiases(network, genes) : null;

    const pad = 10;
    const width = this.canvasWidth;
    const height = this.canvasHeight;
    const layerCount = sizes.length;

    if (layerCount === 0) return;

    const x0 = pad;
    const x1 = Math.max(pad, width - pad);
    const xSpacing = layerCount > 1 ? (x1 - x0) / (layerCount - 1) : 0;

    // Precompute neuron positions per layer.
    const positions = sizes.map((count, layerIdx) => {
      const baseX = x0 + layerIdx * xSpacing;
      const isOutputLayer = layerIdx === layerCount - 1;

      // Output layer: spacing between nodes equals vertical padding.
      // If there are N nodes, we want:
      // - top padding == inter-node spacing == bottom padding == height / (N + 1)
      const y0 = isOutputLayer ? 0 : pad;
      const y1 = isOutputLayer ? height : Math.max(pad, height - pad);
      const ySpacing = isOutputLayer
        ? (count > 0 ? (y1 - y0) / (count + 1) : 0)
        : (count > 1 ? (y1 - y0) / (count - 1) : 0);
      const ys = [];
      const xs = [];

      const isHiddenLayer = layerIdx > 0 && layerIdx < layerCount - 1;
      for (let i = 0; i < count; i++) {
        ys.push(isOutputLayer ? (y0 + (i + 1) * ySpacing) : (y0 + i * ySpacing));
      }
      for (let i = 0; i < count; i++) {
        // Mirror NetworkPreview's hidden-layer staggering: alternate nodes left/right.
        // This helps avoid perfectly vertical stacks which visually "overlap" at small sizes.
        const dx = isHiddenLayer ? (i % 2 === 0 ? -NODE_RADIUS : NODE_RADIUS) : 0;
        const x = Math.max(pad, Math.min(width - pad, baseX + dx));
        xs.push(x);
      }

      return { xs, ys, ySpacing };
    });

    // Neuron radius (keep consistent across previews).
    const nodeRadius = NODE_RADIUS;

    // Compute max abs weight for alpha/width scaling (global for simplicity).
    let globalMaxAbsW = 0;
    if (weights) {
      for (let l = 0; l < weights.length; l++) {
        for (let o = 0; o < weights[l].length; o++) {
          for (let i = 0; i < weights[l][o].length; i++) {
            globalMaxAbsW = Math.max(globalMaxAbsW, Math.abs(weights[l][o][i]));
          }
        }
      }
    }
    if (!globalMaxAbsW) globalMaxAbsW = 1;

    // Per-layer bias normalization (robust) so most neurons aren't near-transparent.
    const biasNorm = [];
    if (biases) {
      for (let l = 0; l < biases.length; l++) {
        const abs = biases[l].map(v => Math.abs(v)).filter(v => Number.isFinite(v));
        if (abs.length === 0) {
          biasNorm[l] = 1;
          continue;
        }
        abs.sort((a, b) => a - b);
        const idx = Math.max(0, Math.min(abs.length - 1, Math.floor(BIAS_NORM_PERCENTILE * (abs.length - 1))));
        const p = abs[idx] || 0;
        biasNorm[l] = p > 1e-9 ? p : 1;
      }
    }

    // Draw connections first (so nodes sit on top).
    const isActive = sizes.map(n => new Array(n).fill(false));
    for (let l = 0; l < layerCount - 1; l++) {
      const inCount = sizes[l];
      const outCount = sizes[l + 1];
      const from = positions[l];
      const to = positions[l + 1];

      const layerWeights = weights?.[l] ?? null; // [out][in]

      // Collect candidate edges, then keep only the most significant ones per layer.
      const candidates = [];

      if (layerWeights) {
        for (let o = 0; o < outCount; o++) {
          const row = layerWeights[o];
          const idx = Array.from({ length: inCount }, (_, i) => i);
          idx.sort((a, b) => Math.abs(row[b]) - Math.abs(row[a]));
          const indices = idx.slice(0, Math.min(CONNECTION_TOP_K, idx.length));

          for (const i of indices) {
            const w = row[i];
            const abs = Math.abs(w);
            candidates.push({ i, o, w, abs });
          }
        }

        candidates.sort((a, b) => b.abs - a.abs);
      } else {
        // No weights => can't rank; draw a deterministic subset to show architecture.
        for (let o = 0; o < outCount; o++) {
          for (let i = 0; i < inCount; i++) {
            candidates.push({ i, o, w: 0, abs: 0 });
            if (candidates.length >= MAX_EDGES_PER_LAYER) break;
          }
          if (candidates.length >= MAX_EDGES_PER_LAYER) break;
        }
      }

      const edgesToDraw = candidates.slice(0, Math.min(MAX_EDGES_PER_LAYER, candidates.length));

      for (const e of edgesToDraw) {
        const { i, o, w, abs } = e;
        isActive[l][i] = true;
        isActive[l + 1][o] = true;

        const t = layerWeights ? Math.min(1, abs / globalMaxAbsW) : 0;
        const alpha = layerWeights
          ? (CONNECTION_ALPHA_MIN + (CONNECTION_ALPHA_MAX - CONNECTION_ALPHA_MIN) * t)
          : CONNECTION_ALPHA_MIN;
        const lineWidth = layerWeights
          ? (CONNECTION_WIDTH_MIN + (CONNECTION_WIDTH_MAX - CONNECTION_WIDTH_MIN) * t)
          : CONNECTION_WIDTH_MIN;
        const color = w >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;

        this.drawCurvedConnection(
          from.xs[i],
          from.ys[i],
          to.xs[o],
          to.ys[o],
          { color, width: lineWidth, alpha }
        );
      }
    }

    // Draw nodes.
    for (let l = 0; l < layerCount; l++) {
      const { xs, ys } = positions[l];

      for (let i = 0; i < ys.length; i++) {
        if (HIDE_INACTIVE_NEURONS && !isActive[l][i]) continue;

        // Bias visualization:
        // - fill color: sign of bias
        // - fill alpha: strength of bias (|bias| normalized)
        // - stroke color: sign of bias, alpha always 1
        const bias = l === 0 ? 0 : (biases?.[l - 1]?.[i] ?? 0);
        const absB = Math.abs(bias);
        const norm = l === 0 ? 1 : (biasNorm[l - 1] ?? 1);
        const tB = Math.min(1, absB / norm);
        const fillAlpha =
          BIAS_FILL_ALPHA_MIN +
          (BIAS_FILL_ALPHA_MAX - BIAS_FILL_ALPHA_MIN) * Math.pow(tB, BIAS_FILL_ALPHA_EXPONENT);

        const color = bias > 0 ? COLOR_POSITIVE : (bias < 0 ? COLOR_NEGATIVE : COLOR_NEUTRAL);

        this.canvas.circle(xs[i], ys[i], nodeRadius);
        this.canvas.fill({ color, alpha: fillAlpha });
        this.canvas.stroke({ color, width: 1, alpha: 1 });
      }
    }
  }
}
export default StaticNetworkPreview;
