import { Container, Graphics } from 'pixi.js';
import { extractWeights } from '../utils';
import {
  STATIC_PREVIEW_CONFIG,
  NetworkDiagramRenderer,
  computePositions,
  buildLayersFromWeights,
} from './StaticPreviewCommon';

class StaticNetworkPreview extends Container {
  constructor(width, height, neuralNetwork, genome, color = 0xffffff) {
    super();
    this.neuralNetwork = neuralNetwork;
    this.genome = genome;
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.color = color;

    this.canvas = new Graphics();
    this.addChild(this.canvas);
    this.renderer = new NetworkDiagramRenderer(this.canvas);

    this.renderView(this.neuralNetwork, this.genome);
  }

  /**
   * Render a static architecture preview (nodes + connections).
   * @param {Object} network - NeuralNet-like object with `sizes`
   * @param {Object|Array|null} genome - optional genome (falls back to network.genome)
   */
  renderView(network, genome = null) {
    this.canvas.clear();
    if (!network?.sizes?.length) return;

    const sizes = network.sizes;
    const genes = genome ?? network.genome ?? null;
    const weights = genes ? extractWeights(network, genes) : null;

    const positions = computePositions({
      sizes,
      width: this.canvasWidth,
      height: this.canvasHeight,
      nodeRadius: STATIC_PREVIEW_CONFIG.NODE_RADIUS
    });

    const layers = buildLayersFromWeights({
      weights,
      sizes,
      nodeRadius: STATIC_PREVIEW_CONFIG.NODE_RADIUS,
      edgeFactory: ({ i, o, baseWidth, baseAlpha }) => ({
        i,
        o,
        color: this.color,
        width: baseWidth,
        alpha: baseAlpha
      })
    });

    this.renderer.render({
      sizes,
      positions,
      layers,
      nodeColors: null,
      nodeRadius: STATIC_PREVIEW_CONFIG.NODE_RADIUS,
      fallbackNodeColor: this.color
    });
  }
}
export default StaticNetworkPreview;
