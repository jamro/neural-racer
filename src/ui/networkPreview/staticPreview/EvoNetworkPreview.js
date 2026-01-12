import * as PIXI from 'pixi.js';
import { extractWeights, extractBiases } from '../utils';
import {
  STATIC_PREVIEW_CONFIG,
  NetworkDiagramRenderer,
  computePositions,
  buildLayersFromWeights,
  buildVisibleEdgeSetsFromWeights,
  getConnectionWidthMax,
} from './StaticPreviewCommon';

const CHILD_EDGE_WIDTH_SCALE = 0.3; // scale applied to edges not coming from either parent
const PARENT_EDGE_MIN_WIDTH = getConnectionWidthMax(STATIC_PREVIEW_CONFIG.NODE_RADIUS) * 0.5; // minimum width for edges attributed to a parent

function approxEqual(a, b, eps = 1e-6) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= eps;
}

function isBetween(x, a, b, eps = 1e-6) {
  if (!Number.isFinite(x) || !Number.isFinite(a) || !Number.isFinite(b)) return false;
  const lo = Math.min(a, b) - eps;
  const hi = Math.max(a, b) + eps;
  return x >= lo && x <= hi;
}

function pickParentByMagnitude(p1, p2) {
  // "bigger value" interpreted as bigger absolute value (tie -> parent 1)
  return Math.abs(p1) >= Math.abs(p2) ? 1 : 2;
}

function classifyGene({ childValue, parent1Value, parent2Value }) {
  if (!Number.isFinite(childValue)) return 'child';
  if (!Number.isFinite(parent1Value) || !Number.isFinite(parent2Value)) return 'child';

  const eq1 = approxEqual(childValue, parent1Value);
  const eq2 = approxEqual(childValue, parent2Value);

  if (eq1 && !eq2) return 'p1';
  if (eq2 && !eq1) return 'p2';

  // If child matches both (typically p1==p2), treat as "both" (resolved later).
  if (eq1 && eq2) return 'both';

  // If child is between the two parent values, assume blend crossover ("from both")
  // (later resolved to a specific parent, subject to visibility constraints).
  if (isBetween(childValue, parent1Value, parent2Value)) return 'both';

  // Otherwise it likely came from mutation / noise after crossover.
  return 'child';
}

function isEdgeVisible(visibleSets, layerIdx, i, o) {
  const set = visibleSets?.[layerIdx];
  if (!set) return false;
  return set.has(`${i},${o}`);
}

class NetworkGraphBuilder {
  build({
    childNetwork,
    childGenome,
    childColor,
    parentNetwork1,
    parentGenome1,
    parentColor1,
    parentNetwork2,
    parentGenome2,
    parentColor2,
    width,
    height
  }) {
    if (!childNetwork?.sizes?.length) return null;

    const { sizes } = childNetwork;
    const layerCount = sizes.length;

    // Extract matrices/vectors (note: child selection is based on child weights)
    const wC = childGenome ? extractWeights(childNetwork, childGenome) : null;
    const bC = childGenome ? extractBiases(childNetwork, childGenome) : null;

    const wP1 = parentGenome1 && parentNetwork1 ? extractWeights(parentNetwork1, parentGenome1) : null;
    const bP1 = parentGenome1 && parentNetwork1 ? extractBiases(parentNetwork1, parentGenome1) : null;

    const wP2 = parentGenome2 && parentNetwork2 ? extractWeights(parentNetwork2, parentGenome2) : null;
    const bP2 = parentGenome2 && parentNetwork2 ? extractBiases(parentNetwork2, parentGenome2) : null;

    // Parent visibility sets: an edge can only be colored by a parent
    // if it is among that parent's own top-K visible edges.
    const p1Visible = parentNetwork1?.sizes ? buildVisibleEdgeSetsFromWeights({ weights: wP1, sizes: parentNetwork1.sizes }) : [];
    const p2Visible = parentNetwork2?.sizes ? buildVisibleEdgeSetsFromWeights({ weights: wP2, sizes: parentNetwork2.sizes }) : [];

    const positions = computePositions({
      sizes,
      width,
      height,
      nodeRadius: STATIC_PREVIEW_CONFIG.NODE_RADIUS
    });

    // Node colors (based on bias ownership per neuron; input layer is neutral child color)
    const nodeColors = sizes.map((count, layerIdx) => {
      const arr = new Array(count);
      if (layerIdx === 0) {
        arr.fill(childColor);
        return arr;
      }

      const biasLayer = layerIdx - 1; // biases are per "output neuron" of previous layer
      for (let i = 0; i < count; i++) {
        const c = bC?.[biasLayer]?.[i];
        const p1 = bP1?.[biasLayer]?.[i];
        const p2 = bP2?.[biasLayer]?.[i];
        const origin = classifyGene({ childValue: c, parent1Value: p1, parent2Value: p2 });
        arr[i] = origin === 'p1' ? parentColor1 : origin === 'p2' ? parentColor2 : childColor;
      }
      return arr;
    });

    const layers = buildLayersFromWeights({
      weights: wC,
      sizes,
      nodeRadius: STATIC_PREVIEW_CONFIG.NODE_RADIUS,
      edgeFactory: ({ layerIdx, i, o, value: childVal, baseWidth, baseAlpha }) => {
        const p1Val = wP1?.[layerIdx]?.[o]?.[i];
        const p2Val = wP2?.[layerIdx]?.[o]?.[i];
        const baseOrigin = classifyGene({ childValue: childVal, parent1Value: p1Val, parent2Value: p2Val });

        let origin = baseOrigin;
        if (baseOrigin === 'p1' && !isEdgeVisible(p1Visible, layerIdx, i, o)) origin = 'child';
        if (baseOrigin === 'p2' && !isEdgeVisible(p2Visible, layerIdx, i, o)) origin = 'child';
        if (baseOrigin === 'both') {
          const preferred = pickParentByMagnitude(p1Val, p2Val) === 1 ? 'p1' : 'p2';
          const other = preferred === 'p1' ? 'p2' : 'p1';
          const preferredVisible = preferred === 'p1'
            ? isEdgeVisible(p1Visible, layerIdx, i, o)
            : isEdgeVisible(p2Visible, layerIdx, i, o);
          const otherVisible = other === 'p1'
            ? isEdgeVisible(p1Visible, layerIdx, i, o)
            : isEdgeVisible(p2Visible, layerIdx, i, o);

          if (preferredVisible) origin = preferred;
          else if (otherVisible) origin = other;
          else origin = 'child';
        }

        const width = origin === 'child'
          ? baseWidth * CHILD_EDGE_WIDTH_SCALE
          : Math.max(baseWidth, PARENT_EDGE_MIN_WIDTH);

        return {
          i,
          o,
          color: origin === 'p1' ? parentColor1 : origin === 'p2' ? parentColor2 : childColor,
          alpha: baseAlpha,
          width
        };
      }
    });

    return { sizes, positions, layers, nodeColors };
  }
}

class EvoNetworkPreview extends PIXI.Container {
  constructor(
    width,
    height,
    childNeuralNetwork,
    childGenome,
    childColor,
    parentNeuralNetwork1,
    parentGenome1,
    parentColor1,
    parentNeuralNetwork2,
    parentGenome2,
    parentColor2
  ) {
    super();

    this.canvasWidth = width;
    this.canvasHeight = height;

    this.childNeuralNetwork = childNeuralNetwork;
    this.childGenome = childGenome;
    this.childColor = childColor;

    this.parentNeuralNetwork1 = parentNeuralNetwork1;
    this.parentGenome1 = parentGenome1;
    this.parentColor1 = parentColor1;

    this.parentNeuralNetwork2 = parentNeuralNetwork2;
    this.parentGenome2 = parentGenome2;
    this.parentColor2 = parentColor2;

    this.canvas = new PIXI.Graphics();
    this.addChild(this.canvas);

    this.builder = new NetworkGraphBuilder();
    this.renderer = new NetworkDiagramRenderer(this.canvas);

    this.renderView();
  }

  renderView() {
    this.canvas.clear();
    const model = this.builder.build({
      childNetwork: this.childNeuralNetwork,
      childGenome: this.childGenome,
      childColor: this.childColor,
      parentNetwork1: this.parentNeuralNetwork1,
      parentGenome1: this.parentGenome1,
      parentColor1: this.parentColor1,
      parentNetwork2: this.parentNeuralNetwork2,
      parentGenome2: this.parentGenome2,
      parentColor2: this.parentColor2,
      width: this.canvasWidth,
      height: this.canvasHeight
    });
    if (!model) return;

    this.renderer.render({
      sizes: model.sizes,
      positions: model.positions,
      layers: model.layers,
      nodeColors: model.nodeColors,
      nodeRadius: STATIC_PREVIEW_CONFIG.NODE_RADIUS,
      fallbackNodeColor: this.childColor
    });
  }
}

export default EvoNetworkPreview;

