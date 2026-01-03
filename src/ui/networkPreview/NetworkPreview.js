import * as PIXI from 'pixi.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './NetworkPreviewConstants.js';
import { extractWeights, getSignals, calculateWeightedInputSums } from './utils.js';
import { NodePositionCalculator } from './NodePositionCalculator.js';
import { NetworkRenderer } from './NetworkRenderer.js';

/**
 * Main class for rendering neural network previews
 */
class NetworkPreview extends PIXI.Container {
    constructor(hiddenLayerColumns = 1, inputNeuronGroups = [9, 2, 1, 1, 1, 1, 2]) {
        super();
        this.canvas = new PIXI.Graphics();
        this.hiddenLayerColumns = hiddenLayerColumns;
        this.inputNeuronGroups = inputNeuronGroups;
        this.addChild(this.canvas);
        
        // Initialize helper classes
        this.positionCalculator = new NodePositionCalculator(hiddenLayerColumns, inputNeuronGroups);
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
        
        // Calculate layout
        const numColumns = 1 + Math.max(0, numLayers - 2) * this.hiddenLayerColumns + 1;
        const columnSpacing = numColumns > 1 ? CANVAS_WIDTH / (numColumns - 1) : 0;
        
        // Get input groups once (cached in positionCalculator)
        const inputGroups = sizes[0] ? this.positionCalculator.getInputGroups(sizes[0]) : [];
        
        // Process network data
        const signals = getSignals(sizes, weights, activations);
        const weightedInputSums = weights && activations ? 
            calculateWeightedInputSums(sizes, weights, activations) : null;
        
        // Render connections first (so they appear behind nodes)
        if (weights) {
            this.renderer.drawConnections(
                sizes, weights, activations, numLayers, numColumns, columnSpacing, inputGroups
            );
        }
        
        // Render nodes
        this.renderer.drawNodes(
            sizes, signals, weightedInputSums, numLayers, numColumns, columnSpacing, inputGroups
        );
    }
}

export default NetworkPreview;
