import { drawConnections } from './rendering/drawConnections.js';
import { drawNodes } from './rendering/drawNodes.js';

/**
 * Handles rendering of neural network visualization
 */
export class NetworkRenderer {
    constructor(canvas, positionCalculator) {
        this.canvas = canvas;
        this.positionCalculator = positionCalculator;
        // Persistent across render calls so we can fade edges out instead of hiding instantly.
        this.edgeFadeState = new Map();
        // Track network structure to detect changes and clean up stale fade states
        this.lastNetworkSizes = null;
    }

    /**
     * Public entrypoint: render everything from a single model object.
     * This keeps `NetworkPreview` small and avoids long parameter lists.
     */
    render(model) {
        const {
            sizes,
            weights,
            activations,
            signals,
            weightedInputSums,
            layout
        } = model || {};

        const numLayers = layout?.numLayers ?? sizes?.length ?? 0;
        const totalNumColumns = layout?.numColumns ?? 0;
        const columnSpacing = layout?.columnSpacing ?? 0;
        const inputLayout = layout?.inputLayout ?? null;

        if (!sizes?.length || !numLayers) return;

        // Detect network structure changes and clean up stale fade states
        // This prevents memory leaks when network structure changes
        const sizesKey = sizes.join(',');
        if (this.lastNetworkSizes !== sizesKey) {
            // Network structure changed - clear all fade states to prevent memory leak
            this.edgeFadeState.clear();
            this.lastNetworkSizes = sizesKey;
        }

        // Render connections first (so they appear behind nodes)
        if (weights) {
            drawConnections({
                canvas: this.canvas,
                positionCalculator: this.positionCalculator,
                sizes,
                weights,
                activations,
                numLayers,
                totalNumColumns,
                columnSpacing,
                inputLayout,
                edgeFadeState: this.edgeFadeState
            });
        }

        // Render nodes
        drawNodes({
            canvas: this.canvas,
            positionCalculator: this.positionCalculator,
            sizes,
            signals,
            weightedInputSums,
            numLayers,
            totalNumColumns,
            columnSpacing,
            inputLayout,
            weights
        });
    }

    /**
     * Clean up resources. Should be called when NetworkPreview is destroyed.
     */
    destroy() {
        this.edgeFadeState.clear();
        this.edgeFadeState = null;
        this.canvas = null;
        this.positionCalculator = null;
        this.lastNetworkSizes = null;
    }
}
