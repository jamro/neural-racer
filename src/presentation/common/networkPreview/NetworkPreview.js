import * as PIXI from 'pixi.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './NetworkPreviewConstants.js';
import { extractWeights, getSignals, calculateWeightedInputSums } from './utils.js';
import { NodePositionCalculator } from './NodePositionCalculator.js';
import { NetworkRenderer } from './NetworkRenderer.js';

/**
 * Main class for rendering neural network previews
 */
class NetworkPreview extends PIXI.Container {
  /**
     * @param {Array<Object>} inputConfig "segments" config for the artificial input layer.
     *   - { range: [start, end], group: true }  // outlines this range as a group, no other change
     *   - { index: i }                          // single input as an individual entry
     *
     * If `artificialSources` is provided (also supports the legacy typo `artificalSources`),
     * the input is skipped in the artificial layer and we draw extra "artificial edges"
     * from those sources to the real input neuron (second column).
     *
     *   - { index: i, artificialSources: [0, 3, 5] }
     *
     * Example:
     * [
     *   { range: [0, 8], group: true },
     *   { index: 9, artificialSources: [3, 5] },
     *   { index: 10, artificialSources: [3, 5] },
     *   { index: 11, artificialSources: [0, 1, 2, 6, 7, 8] },
     *   { index: 12, artificialSources: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
     *   { index: 13 },
     *   { index: 14 },
     *   { range: [15, 16], group: true }
     * ]
     */
  constructor(inputConfig = []) {
    super();
    this.canvas = new PIXI.Graphics();
    this.inputConfig = inputConfig;
    this.addChild(this.canvas);
        
    // Initialize helper classes
    this.positionCalculator = new NodePositionCalculator(inputConfig);
    this.renderer = new NetworkRenderer(this.canvas, this.positionCalculator);
  }

  get canvasWidth() {
    return CANVAS_WIDTH;
  }

  get canvasHeight() {
    return CANVAS_HEIGHT;
  }

  /**
     * Renders the neural network visualization
     * @param {Object} network - Network object with sizes array
     * @param {Object|Array} genome - Optional genome for weight extraction
     * @param {Array<Array<number>>} activations - Optional activation values per layer
     */
  renderView(network, genome = null, activations = null) {
    this.canvas.clear();
    if (!network?.sizes?.length) return;

    const { sizes } = network;
    const numLayers = sizes.length;
        
    // Extract weights if genome is provided
    const weights = genome ? extractWeights(network, genome) : null;
        
    // Calculate layout - add 1 column for the intermediate layer between input and first hidden
    // Layout: input (col 0) -> intermediate (col 1) -> hidden layers -> output (last col)
    // We render one visual column per hidden layer (simpler + clearer).
    const numColumns = 2 + Math.max(0, numLayers - 2) + 1;
    const columnSpacing = numColumns > 1 ? CANVAS_WIDTH / (numColumns - 1) : 0;
        
    // Build input layout once (cached in positionCalculator)
    const inputLayout = sizes[0] ? this.positionCalculator.getInputLayout(sizes[0]) : null;
        
    // Process network data
    const signals = getSignals(sizes, weights, activations);
    const weightedInputSums = weights && activations ? 
      calculateWeightedInputSums(sizes, weights, activations) : null;

    // Render using a single "model" object to avoid plumbing a long argument list.
    this.renderer.render({
      sizes,
      weights,
      activations,
      signals,
      weightedInputSums,
      layout: {
        numLayers,
        numColumns,
        columnSpacing,
        inputLayout
      }
    });
  }

  /**
     * Clean up resources to prevent memory leaks.
     * Should be called when this NetworkPreview is no longer needed.
     */
  destroy(options) {
    // Pixi v8 nuance: `Graphics.destroy({...})` will NOT destroy its GraphicsContext
    // unless you pass `{ context: true }` (or call destroy() with no options).
    // When we pass Container-style options from the parent (children/texture/baseTexture),
    // the internal GraphicsContext can stay alive and be retained by the renderer
    // (`GraphicsContextSystem._gpuContextHash`), which looks like a leak.
    const graphicsDestroyOptions =
            options && typeof options === 'object'
              ? { ...options, context: true }
              : { context: true };
    // Clean up renderer (which clears edgeFadeState Map)
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }

    // Destroy Graphics object to free internal resources
    if (this.canvas) {
      this.canvas.clear();
      this.canvas.destroy(graphicsDestroyOptions);
      this.canvas = null;
    }

    // Clean up position calculator
    this.positionCalculator = null;

    // Call parent destroy
    super.destroy(options);
  }
}

export default NetworkPreview;
