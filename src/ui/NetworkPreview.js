import * as PIXI from 'pixi.js';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 200;

class NetworkPreview extends PIXI.Container {
    constructor() {
        super();
        this.canvas = new PIXI.Graphics();

        this.addChild(this.canvas);
    }

    renderView(network, genome = null, activations = null) {
        this.canvas.clear();
        if (!network) return;

        const { sizes } = network;
        const numLayers = sizes.length;
        if (numLayers === 0) return;

        // Extract weights if genome is provided
        const weights = genome ? this._extractWeights(network, genome) : null;

        // Calculate layout: nodes are arranged in vertical layers
        const layerSpacing = CANVAS_WIDTH / (numLayers + 1);
        const padding = 10;
        const maxNodes = Math.max(...sizes);
        const nodeRadius = 3;
        
        // Use real activations if available, otherwise fall back to weight-based signals
        let nodeSignals = null;
        if (activations && activations.length === numLayers) {
            // Use real activations from forward pass
            nodeSignals = this._processActivations(activations);
        } else if (weights) {
            // Fall back to weight-based signal calculation
            nodeSignals = this._calculateNodeSignals(sizes, weights);
        }

        // Draw connections (before nodes so they appear behind)
        if (weights) {
            this._drawConnections(sizes, layerSpacing, padding, maxNodes, nodeRadius, weights, activations);
        }

        // Draw nodes with color based on signal strength
        for (let layer = 0; layer < numLayers; layer++) {
            const numNodes = sizes[layer];
            const x = (layer + 1) * layerSpacing;
            const nodeSpacing = numNodes > 1 ? (CANVAS_HEIGHT - 2 * padding) / (numNodes - 1) : 0;
            
            for (let node = 0; node < numNodes; node++) {
                const y = numNodes === 1 ? CANVAS_HEIGHT / 2 : padding + node * nodeSpacing;
                this.canvas.circle(x, y, nodeRadius);
                
                if (nodeSignals && nodeSignals.signals && nodeSignals.signals[layer] && nodeSignals.signals[layer][node] !== undefined) {
                    const signal = nodeSignals.signals[layer][node];
                    const color = this._getColorForSignal(signal, nodeSignals.maxAbsSignal);
                    this.canvas.fill(color);
                } else {
                    this.canvas.fill(0x888888); // Gray for nodes without signal data
                }
            }
        }
    }

    _extractWeights(network, genome) {
        const { sizes } = network;
        const genes = genome.genes || genome; // Support both Genome object and array
        const weights = [];
        
        let offset = 0;
        for (let l = 0; l < sizes.length - 1; l++) {
            const inD = sizes[l];
            const outD = sizes[l + 1];
            const layerWeights = [];
            
            // Extract weights for this layer
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

    _processActivations(activations) {
        const nodeSignals = [];
        let maxAbsSignal = 0;
        
        // Process real activations from forward pass
        for (let layer = 0; layer < activations.length; layer++) {
            const layerActivations = activations[layer];
            if (!layerActivations) continue;
            
            nodeSignals[layer] = [];
            
            for (let node = 0; node < layerActivations.length; node++) {
                const activation = layerActivations[node];
                const absActivation = Math.abs(activation);
                nodeSignals[layer][node] = activation;
                maxAbsSignal = Math.max(maxAbsSignal, absActivation);
            }
        }
        
        // Ensure minimum range for visualization (avoid all-gray when values are very small)
        if (maxAbsSignal < 0.001) {
            maxAbsSignal = 1.0; // Normalize to [-1, 1] range for visualization
        }
        
        return { signals: nodeSignals, maxAbsSignal };
    }

    _calculateNodeSignals(sizes, weights) {
        const nodeSignals = [];
        let maxAbsSignal = 0;
        
        // Initialize signals for all nodes
        for (let layer = 0; layer < sizes.length; layer++) {
            nodeSignals[layer] = new Array(sizes[layer]).fill(0);
        }
        
        // Calculate signal strength for each node based on connected weights
        for (let layer = 0; layer < sizes.length - 1; layer++) {
            const layerWeights = weights[layer];
            const numInputNodes = sizes[layer];
            const numOutputNodes = sizes[layer + 1];
            
            // For output nodes: sum of incoming weights
            for (let outputNode = 0; outputNode < numOutputNodes; outputNode++) {
                let signalSum = 0;
                for (let inputNode = 0; inputNode < numInputNodes; inputNode++) {
                    signalSum += layerWeights[outputNode][inputNode];
                }
                nodeSignals[layer + 1][outputNode] = signalSum;
                maxAbsSignal = Math.max(maxAbsSignal, Math.abs(signalSum));
            }
            
            // For input nodes: sum of outgoing weights (if not already set)
            if (layer === 0) {
                for (let inputNode = 0; inputNode < numInputNodes; inputNode++) {
                    let signalSum = 0;
                    for (let outputNode = 0; outputNode < numOutputNodes; outputNode++) {
                        signalSum += layerWeights[outputNode][inputNode];
                    }
                    nodeSignals[layer][inputNode] = signalSum;
                    maxAbsSignal = Math.max(maxAbsSignal, Math.abs(signalSum));
                }
            }
        }
        
        return { signals: nodeSignals, maxAbsSignal };
    }

    _getColorForSignal(signal, maxAbsSignal) {
        if (maxAbsSignal === 0 || maxAbsSignal < 0.001) return 0x888888; // Gray if no signal
        
        const normalizedSignal = Math.abs(signal) / maxAbsSignal;
        // Use full range 0-255 for better visibility, with minimum brightness for non-zero signals
        const intensity = Math.min(255, Math.max(64, Math.floor(64 + normalizedSignal * 191))); // 64-255 range
        
        if (signal >= 0) {
            // Red for positive signals
            return (intensity << 16) | 0x000000; // Red channel
        } else {
            // Blue for negative signals
            return 0x000000 | intensity; // Blue channel
        }
    }

    _drawConnections(sizes, layerSpacing, padding, maxNodes, nodeRadius, weights, activations = null) {
        const numLayers = sizes.length;
        
        // Calculate actual signal flow if activations are available
        let connectionSignals = null;
        let maxAbsSignal = 0;
        
        if (activations && activations.length === numLayers) {
            // Calculate signal flow: activation * weight for each connection
            connectionSignals = [];
            for (let layer = 0; layer < numLayers - 1; layer++) {
                const layerWeights = weights[layer];
                const inputActivations = activations[layer];
                const numInputNodes = sizes[layer];
                const numOutputNodes = sizes[layer + 1];
                
                const layerSignals = [];
                for (let outputNode = 0; outputNode < numOutputNodes; outputNode++) {
                    const nodeSignals = [];
                    for (let inputNode = 0; inputNode < numInputNodes; inputNode++) {
                        const inputActivation = inputActivations[inputNode];
                        const weight = layerWeights[outputNode][inputNode];
                        const signal = inputActivation * weight;
                        nodeSignals.push(signal);
                        maxAbsSignal = Math.max(maxAbsSignal, Math.abs(signal));
                    }
                    layerSignals.push(nodeSignals);
                }
                connectionSignals.push(layerSignals);
            }
        }
        
        // Fall back to weight-based visualization if no activations
        if (!connectionSignals) {
            let maxAbsWeight = 0;
            for (const layerWeights of weights) {
                for (const nodeWeights of layerWeights) {
                    for (const weight of nodeWeights) {
                        maxAbsWeight = Math.max(maxAbsWeight, Math.abs(weight));
                    }
                }
            }
            maxAbsSignal = maxAbsWeight;
        }
        
        if (maxAbsSignal === 0 || maxAbsSignal < 0.001) {
            maxAbsSignal = 1.0; // Avoid division by zero and ensure visibility
        }

        for (let layer = 0; layer < numLayers - 1; layer++) {
            const numInputNodes = sizes[layer];
            const numOutputNodes = sizes[layer + 1];
            const inputX = (layer + 1) * layerSpacing;
            const outputX = (layer + 2) * layerSpacing;
            const inputSpacing = numInputNodes > 1 ? (CANVAS_HEIGHT - 2 * padding) / (numInputNodes - 1) : 0;
            const outputSpacing = numOutputNodes > 1 ? (CANVAS_HEIGHT - 2 * padding) / (numOutputNodes - 1) : 0;
            
            const layerWeights = weights[layer];
            const layerSignals = connectionSignals ? connectionSignals[layer] : null;
            
            for (let outputNode = 0; outputNode < numOutputNodes; outputNode++) {
                const outputY = numOutputNodes === 1 ? CANVAS_HEIGHT / 2 : padding + outputNode * outputSpacing;
                
                for (let inputNode = 0; inputNode < numInputNodes; inputNode++) {
                    const inputY = numInputNodes === 1 ? CANVAS_HEIGHT / 2 : padding + inputNode * inputSpacing;
                    const weight = layerWeights[outputNode][inputNode];
                    
                    // Use actual signal flow if available, otherwise use weight
                    let signal = weight;
                    if (layerSignals && layerSignals[outputNode] && layerSignals[outputNode][inputNode] !== undefined) {
                        signal = layerSignals[outputNode][inputNode];
                    }
                    
                    // Calculate line width based on absolute signal strength (0.5-2.5 pixels)
                    const normalizedSignal = Math.abs(signal) / maxAbsSignal;
                    const lineWidth = 0.5 + normalizedSignal * 2.0;
                    
                    // Color with intensity: red for positive, blue for negative
                    const colorIntensity = Math.min(255, Math.max(64, Math.floor(64 + normalizedSignal * 191))); // 64-255 range
                    const color = signal >= 0 
                        ? (colorIntensity << 16) | 0x000000  // Red
                        : 0x000000 | colorIntensity;          // Blue
                    
                    this.canvas.moveTo(inputX + nodeRadius, inputY);
                    this.canvas.lineTo(outputX - nodeRadius, outputY);
                    this.canvas.stroke({ color, width: lineWidth, alpha: 1.0 });
                }
            }
        }
    }
    
}

export default NetworkPreview;