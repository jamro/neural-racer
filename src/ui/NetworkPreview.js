import * as PIXI from 'pixi.js';

const CANVAS_WIDTH = 260;
const CANVAS_HEIGHT = 200;
const PADDING = 12;
const NODE_RADIUS = 3;
const MIN_NODE_OUTLINE_WIDTH = 0;
const MAX_NODE_OUTLINE_WIDTH = 1;
const MIN_CONNECTION_ALPHA = 0;
const MIN_NODE_ALPHA = 0;

class NetworkPreview extends PIXI.Container {
    constructor(hiddenLayerColumns = 2) {
        super();
        this.canvas = new PIXI.Graphics();
        this.hiddenLayerColumns = hiddenLayerColumns;
        this.addChild(this.canvas);
    }

    renderView(network, genome = null, activations = null) {
        this.canvas.clear();
        if (!network?.sizes?.length) return;

        const { sizes } = network;
        const numLayers = sizes.length;
        const weights = genome ? this._extractWeights(network, genome) : null;
        
        // Calculate layout
        const numHiddenLayers = Math.max(0, numLayers - 2);
        const numColumns = 1 + (numHiddenLayers * this.hiddenLayerColumns) + 1;
        const columnSpacing = CANVAS_WIDTH / (numColumns + 1);
        
        // Process signals (activations or fallback to weights)
        const signals = this._getSignals(sizes, weights, activations);
        
        // Calculate weighted input sums for each node (for stroke visualization)
        const weightedInputSums = weights && activations 
            ? this._calculateWeightedInputSums(sizes, weights, activations)
            : null;
        
        // Draw connections first (behind nodes)
        if (weights) {
            this._drawConnections(sizes, weights, activations, signals, columnSpacing);
        }
        
        // Draw nodes
        this._drawNodes(sizes, signals, weightedInputSums, columnSpacing);
    }

    _extractWeights(network, genome) {
        const { sizes } = network;
        const genes = genome.genes || genome;
        const weights = [];
        let offset = 0;
        
        for (let l = 0; l < sizes.length - 1; l++) {
            const inD = sizes[l];
            const outD = sizes[l + 1];
            const layerWeights = [];
            
            for (let o = 0; o < outD; o++) {
                const row = [];
                for (let i = 0; i < inD; i++) {
                    row.push(genes[offset + o * inD + i]);
                }
                layerWeights.push(row);
            }
            
            weights.push(layerWeights);
            offset += outD * inD + outD; // Skip biases
        }
        
        return weights;
    }

    _getSignals(sizes, weights, activations) {
        // Use real activations if available
        if (activations?.length === sizes.length) {
            let maxAbs = 0;
            const signals = activations.map(layer => {
                if (!layer) return [];
                const layerSignals = Array.from(layer);
                layerSignals.forEach(s => maxAbs = Math.max(maxAbs, Math.abs(s)));
                return layerSignals;
            });
            return { signals, maxAbs: maxAbs || 1.0 };
        }
        
        // Fallback: calculate from weights
        if (!weights) return { signals: [], maxAbs: 1.0 };
        
        const signals = sizes.map(() => []);
        let maxAbs = 0;
        
        for (let l = 0; l < sizes.length - 1; l++) {
            const layerWeights = weights[l];
            const outD = sizes[l + 1];
            
            for (let o = 0; o < outD; o++) {
                let sum = 0;
                for (let i = 0; i < sizes[l]; i++) {
                    sum += layerWeights[o][i];
                }
                signals[l + 1][o] = sum;
                maxAbs = Math.max(maxAbs, Math.abs(sum));
            }
        }
        
        return { signals, maxAbs: maxAbs || 1.0 };
    }

    _getNodePosition(layer, node, numNodes, numLayers, columnSpacing) {
        const isHidden = layer > 0 && layer < numLayers - 1;
        const numColumns = isHidden ? this.hiddenLayerColumns : 1;
        const nodesPerColumn = Math.ceil(numNodes / numColumns);
        
        // Calculate column index
        let columnIndex;
        if (layer === 0) {
            columnIndex = 0;
        } else if (layer === numLayers - 1) {
            const numHiddenLayers = Math.max(0, numLayers - 2);
            columnIndex = 1 + (numHiddenLayers * this.hiddenLayerColumns);
        } else {
            const hiddenLayerIndex = layer - 1;
            columnIndex = 1 + (hiddenLayerIndex * this.hiddenLayerColumns) + Math.floor(node / nodesPerColumn);
        }
        
        const x = (columnIndex + 1) * columnSpacing;
        
        // Calculate y position within column
        const columnNodeIndex = node % nodesPerColumn;
        const startNode = Math.floor(node / nodesPerColumn) * nodesPerColumn;
        const endNode = Math.min(startNode + nodesPerColumn, numNodes);
        const nodesInColumn = endNode - startNode;
        
        const nodeSpacing = nodesInColumn > 1 ? (CANVAS_HEIGHT - 2 * PADDING) / (nodesInColumn - 1) : 0;
        const y = nodesInColumn === 1 ? CANVAS_HEIGHT / 2 : PADDING + columnNodeIndex * nodeSpacing;
        
        return { x, y };
    }

    _calculateWeightedInputSums(sizes, weights, activations) {
        const sums = [];
        let maxAbsSum = 0;
        
        // Input layer has no incoming connections
        sums[0] = new Array(sizes[0]).fill(0);
        
        // Calculate weighted input sum for each node (sum of all incoming weighted inputs)
        for (let layer = 0; layer < sizes.length - 1; layer++) {
            const layerWeights = weights[layer];
            const inputActivations = activations[layer];
            const outD = sizes[layer + 1];
            
            sums[layer + 1] = [];
            
            for (let o = 0; o < outD; o++) {
                let sum = 0;
                for (let i = 0; i < sizes[layer]; i++) {
                    // Weighted input: activation × weight
                    sum += inputActivations[i] * layerWeights[o][i];
                }
                sums[layer + 1][o] = sum;
                maxAbsSum = Math.max(maxAbsSum, Math.abs(sum));
            }
        }
        
        return { sums, maxAbs: maxAbsSum || 1.0 };
    }

    _drawNodes(sizes, signals, weightedInputSums, columnSpacing) {
        const numLayers = sizes.length;
        
        for (let layer = 0; layer < numLayers; layer++) {
            const numNodes = sizes[layer];
            const layerSignals = signals.signals[layer] || [];
            const layerWeightedSums = weightedInputSums?.sums[layer] || [];
            
            for (let node = 0; node < numNodes; node++) {
                const pos = this._getNodePosition(layer, node, numNodes, numLayers, columnSpacing);
                const outputSignal = layerSignals[node]; // Output activation (after activation function)
                const weightedSum = layerWeightedSums[node]; // Weighted input sum (before activation)
                
                // Normalize output activation for fill
                const normalizedOutput = outputSignal !== undefined 
                    ? Math.min(1.0, Math.max(0, Math.abs(outputSignal) / signals.maxAbs))
                    : 0;
                
                // Normalize weighted input sum for stroke
                const normalizedInputSum = weightedSum !== undefined && weightedInputSums
                    ? Math.min(1.0, Math.max(0, Math.abs(weightedSum) / weightedInputSums.maxAbs))
                    : 0;
                
                // Fill alpha based on output activation
                const fillAlpha = outputSignal !== undefined 
                    ? MIN_NODE_ALPHA + (1 - MIN_NODE_ALPHA) * normalizedOutput * normalizedOutput
                    : 0.2;
                
                // Stroke alpha/width based on weighted input sum
                const strokeAlpha = weightedSum !== undefined && weightedInputSums
                    ? MIN_NODE_ALPHA + (1 - MIN_NODE_ALPHA) * normalizedInputSum
                    : 0.3;
                const strokeWidth = MIN_NODE_OUTLINE_WIDTH + (MAX_NODE_OUTLINE_WIDTH - MIN_NODE_OUTLINE_WIDTH) * normalizedInputSum;
                
                const nodeColor = outputSignal !== undefined ? 0xFFFFFF : 0x888888;
                
                // Outer glow for active nodes (based on output)
                if (outputSignal !== undefined && normalizedOutput > 0.3) {
                    this.canvas.circle(pos.x, pos.y, NODE_RADIUS + 1.5);
                    this.canvas.fill({ color: nodeColor, alpha: fillAlpha * 0.2 });
                }
                
                // Main node - fill shows output activation
                this.canvas.circle(pos.x, pos.y, NODE_RADIUS);
                this.canvas.fill({ color: nodeColor, alpha: fillAlpha });
                
                // Stroke shows weighted input sum
                this.canvas.circle(pos.x, pos.y, NODE_RADIUS);
                this.canvas.stroke({ 
                    color: 0xFFFFFF, 
                    width: strokeWidth, 
                    alpha: strokeAlpha
                });
            }
        }
    }

    _drawConnections(sizes, weights, activations, signals, columnSpacing) {
        const numLayers = sizes.length;
        let maxAbsSignal = 0;
        
        // Calculate connection signals and find max
        for (let layer = 0; layer < numLayers - 1; layer++) {
            const layerWeights = weights[layer];
            const inputActivations = activations?.[layer];
            
            for (let o = 0; o < sizes[layer + 1]; o++) {
                for (let i = 0; i < sizes[layer]; i++) {
                    const signal = inputActivations 
                        ? inputActivations[i] * layerWeights[o][i]
                        : layerWeights[o][i];
                    maxAbsSignal = Math.max(maxAbsSignal, Math.abs(signal));
                }
            }
        }
        
        if (maxAbsSignal < 0.001) maxAbsSignal = 1.0;
        
        // Draw connections with improved visual quality
        for (let layer = 0; layer < numLayers - 1; layer++) {
            const layerWeights = weights[layer];
            const inputActivations = activations?.[layer];
            
            for (let o = 0; o < sizes[layer + 1]; o++) {
                const outputPos = this._getNodePosition(layer + 1, o, sizes[layer + 1], numLayers, columnSpacing);
                
                for (let i = 0; i < sizes[layer]; i++) {
                    const inputPos = this._getNodePosition(layer, i, sizes[layer], numLayers, columnSpacing);
                    const signal = inputActivations 
                        ? inputActivations[i] * layerWeights[o][i]
                        : layerWeights[o][i];
                    
                    const normalized = Math.abs(signal) / maxAbsSignal;
                    const normalizedSq = normalized * normalized;
                    
                    // Improved alpha calculation with better range
                    const alpha = MIN_CONNECTION_ALPHA + (1 - MIN_CONNECTION_ALPHA) * normalized;
                    
                    // Line width with smoother scaling
                    const lineWidth = 0.4 + normalizedSq * normalizedSq * 1.8;
                    
                    // Draw connection
                    this.canvas.moveTo(inputPos.x + NODE_RADIUS, inputPos.y);
                    this.canvas.lineTo(outputPos.x - NODE_RADIUS, outputPos.y);
                    this.canvas.stroke({ 
                        color: 0xFFFFFF, 
                        width: lineWidth,
                        alpha: alpha
                    });
                }
            }
        }
    }
}

export default NetworkPreview;
