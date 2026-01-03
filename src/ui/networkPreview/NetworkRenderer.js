import { 
    NODE_RADIUS,
    MIN_NODE_OUTLINE_WIDTH, MAX_NODE_OUTLINE_WIDTH,
    MIN_NODE_ALPHA, MIN_CONNECTION_ALPHA,
    INPUT_STROKE_ALPHA,
    OUTPUT_T_HORIZONTAL_SCALE, OUTPUT_T_VERTICAL_SCALE, OUTPUT_T_SCALE_ALPHA
} from './NetworkPreviewConstants.js';
import { getColorForValue } from './utils.js';

/**
 * Handles rendering of neural network visualization
 */
export class NetworkRenderer {
    constructor(canvas, positionCalculator) {
        this.canvas = canvas;
        this.positionCalculator = positionCalculator;
    }

    /**
     * Draws a rounded rectangle with rounded top corners
     */
    drawRoundedRectTop(x, y, w, h, r, color, alpha) {
        this.canvas.moveTo(x + r, y);
        this.canvas.arc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
        this.canvas.lineTo(x + w, y + h);
        this.canvas.lineTo(x, y + h);
        this.canvas.lineTo(x, y + r);
        this.canvas.arc(x + r, y + r, r, Math.PI, 0, false);
        this.canvas.fill({ color, alpha });
    }

    /**
     * Draws a rounded rectangle with rounded bottom corners
     */
    drawRoundedRectBottom(x, y, w, h, r, color, alpha) {
        this.canvas.moveTo(x, y);
        this.canvas.lineTo(x + w, y);
        this.canvas.lineTo(x + w, y + h - r);
        this.canvas.arc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
        this.canvas.lineTo(x + r, y + h);
        this.canvas.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
        this.canvas.fill({ color, alpha });
    }

    /**
     * Draws an input node
     */
    drawInputNode(pos, node, groups, nodeColor, fillAlpha, strokeColor) {
        const rectSize = NODE_RADIUS * 2;
        
        // Find which group this node belongs to
        let nodeIndex = 0;
        let isInGroup = false;
        let positionInGroup = -1;
        let groupSize = 1;
        
        for (let g = 0; g < groups.length; g++) {
            if (node >= nodeIndex && node < nodeIndex + groups[g]) {
                isInGroup = groups[g] > 1;
                positionInGroup = node - nodeIndex;
                groupSize = groups[g];
                break;
            }
            nodeIndex += groups[g];
        }
        
        const x = pos.x - rectSize / 2;
        const y = pos.y - rectSize / 2;
        const isTopInGroup = isInGroup && positionInGroup === 0;
        const isBottomInGroup = isInGroup && positionInGroup === groupSize - 1;
        
        if (isTopInGroup) {
            this.drawRoundedRectTop(x, y, rectSize, rectSize, NODE_RADIUS, nodeColor, fillAlpha);
        } else if (isBottomInGroup) {
            this.drawRoundedRectBottom(x, y, rectSize, rectSize, NODE_RADIUS, nodeColor, fillAlpha);
        } else if (isInGroup) {
            this.canvas.rect(x, y, rectSize, rectSize);
            this.canvas.fill({ color: nodeColor, alpha: fillAlpha });
        } else {
            this.canvas.circle(pos.x, pos.y, NODE_RADIUS);
            this.canvas.fill({ color: nodeColor, alpha: fillAlpha });
            this.canvas.circle(pos.x, pos.y, NODE_RADIUS);
            this.canvas.stroke({ color: strokeColor, width: 1, alpha: INPUT_STROKE_ALPHA });
        }
    }

    /**
     * Draws an output node with T-shape indicator
     */
    drawOutputNode(pos, outputSignal, nodeColor, fillAlpha, strokeColor, strokeWidth, strokeAlpha) {
        // Draw circle
        this.canvas.circle(pos.x, pos.y, NODE_RADIUS);
        this.canvas.fill({ color: nodeColor, alpha: fillAlpha });
        this.canvas.circle(pos.x, pos.y, NODE_RADIUS);
        this.canvas.stroke({ color: strokeColor, width: strokeWidth, alpha: strokeAlpha });
        
        // Draw T-shape indicator
        const startX = pos.x + NODE_RADIUS;
        const endX = startX + OUTPUT_T_HORIZONTAL_SCALE;
        const centerY = pos.y;
        const topY = centerY - OUTPUT_T_VERTICAL_SCALE / 2;
        const bottomY = centerY + OUTPUT_T_VERTICAL_SCALE / 2;
        
        // Draw T-shape outline
        this.canvas.moveTo(startX, centerY);
        this.canvas.lineTo(endX, centerY);
        this.canvas.moveTo(endX, topY);
        this.canvas.lineTo(endX, bottomY);
        this.canvas.stroke({ color: 0xFFFFFF, width: 1, alpha: OUTPUT_T_SCALE_ALPHA });
        
        // Draw progress bar
        if (outputSignal !== undefined) {
            const clampedValue = Math.max(-1, Math.min(1, outputSignal));
            const progressY = centerY - (clampedValue * OUTPUT_T_VERTICAL_SCALE / 2);
            this.canvas.moveTo(endX, centerY);
            this.canvas.lineTo(endX, progressY);
            this.canvas.stroke({ color: nodeColor, width: 2, alpha: 0.8 });
        }
    }

    /**
     * Draws connections between layers
     */
    drawConnections(sizes, weights, activations, numLayers, totalNumColumns, columnSpacing, inputGroups) {
        // Calculate max signal for normalization
        let maxAbsSignal = 0;
        for (let layer = 0; layer < numLayers - 1; layer++) {
            const inputActivations = activations?.[layer];
            for (let o = 0; o < sizes[layer + 1]; o++) {
                for (let i = 0; i < sizes[layer]; i++) {
                    const signal = inputActivations ? 
                        inputActivations[i] * weights[layer][o][i] : 
                        weights[layer][o][i];
                    maxAbsSignal = Math.max(maxAbsSignal, Math.abs(signal));
                }
            }
        }
        if (maxAbsSignal < 0.001) maxAbsSignal = 1.0;

        // Draw connections
        for (let layer = 0; layer < numLayers - 1; layer++) {
            const inputActivations = activations?.[layer];
            
            for (let o = 0; o < sizes[layer + 1]; o++) {
                const outputPos = this.positionCalculator.getNodePosition(
                    layer + 1, o, sizes[layer + 1], numLayers, totalNumColumns, columnSpacing, inputGroups
                );
                
                for (let i = 0; i < sizes[layer]; i++) {
                    const inputPos = this.positionCalculator.getNodePosition(
                        layer, i, sizes[layer], numLayers, totalNumColumns, columnSpacing, inputGroups
                    );
                    
                    const signal = inputActivations ? 
                        inputActivations[i] * weights[layer][o][i] : 
                        weights[layer][o][i];
                    const normalized = Math.abs(signal) / maxAbsSignal;
                    const normalizedSq = normalized * normalized;
                    const connectionColor = getColorForValue(signal);
                    
                    const startX = inputPos.x + NODE_RADIUS;
                    const endX = outputPos.x - NODE_RADIUS;
                    const curveOffset = Math.abs(endX - startX) * 0.3;
                    
                    this.canvas.moveTo(startX, inputPos.y);
                    this.canvas.bezierCurveTo(
                        startX + curveOffset, inputPos.y,
                        endX - curveOffset, outputPos.y,
                        endX, outputPos.y
                    );
                    this.canvas.stroke({ 
                        color: connectionColor, 
                        width: 0.4 + normalizedSq * normalizedSq * 1.8,
                        alpha: MIN_CONNECTION_ALPHA + (1 - MIN_CONNECTION_ALPHA) * normalized
                    });
                }
            }
        }
    }

    /**
     * Draws all nodes
     */
    drawNodes(sizes, signals, weightedInputSums, numLayers, totalNumColumns, columnSpacing, inputGroups) {
        const rectSize = NODE_RADIUS * 2;
        
        for (let layer = 0; layer < numLayers; layer++) {
            const layerSignals = signals.signals[layer] || [];
            const layerWeightedSums = weightedInputSums?.sums[layer] || [];
            const isOutputLayer = layer === numLayers - 1;
            const isInputLayer = layer === 0;
            
            for (let node = 0; node < sizes[layer]; node++) {
                const pos = this.positionCalculator.getNodePosition(
                    layer, node, sizes[layer], numLayers, totalNumColumns, columnSpacing, inputGroups
                );
                const outputSignal = layerSignals[node];
                const weightedSum = layerWeightedSums[node];
                
                // Calculate normalized values
                const absSignal = outputSignal !== undefined ? Math.abs(outputSignal) : 0;
                const normalizedOutput = isOutputLayer ? Math.sqrt(absSignal) : 
                    (outputSignal !== undefined ? Math.min(1, absSignal / signals.maxAbs) : 0);
                const normalizedInputSum = weightedSum !== undefined && weightedInputSums ? 
                    Math.min(1, Math.abs(weightedSum) / weightedInputSums.maxAbs) : 0;
                
                // Calculate visual properties
                const fillAlpha = outputSignal !== undefined ? 
                    MIN_NODE_ALPHA + (1 - MIN_NODE_ALPHA) * normalizedOutput * normalizedOutput : 0.2;
                const strokeAlpha = weightedSum !== undefined && weightedInputSums ? 
                    MIN_NODE_ALPHA + (1 - MIN_NODE_ALPHA) * normalizedInputSum : 0.3;
                const strokeWidth = MIN_NODE_OUTLINE_WIDTH + 
                    (MAX_NODE_OUTLINE_WIDTH - MIN_NODE_OUTLINE_WIDTH) * normalizedInputSum;
                const nodeColor = getColorForValue(outputSignal);
                const strokeColor = getColorForValue(weightedSum);
                
                // Draw node based on layer type
                if (isInputLayer) {
                    this.drawInputNode(pos, node, inputGroups, nodeColor, fillAlpha, strokeColor);
                } else if (isOutputLayer) {
                    this.drawOutputNode(pos, outputSignal, nodeColor, fillAlpha, strokeColor, strokeWidth, strokeAlpha);
                } else {
                    // Hidden layer
                    this.canvas.circle(pos.x, pos.y, NODE_RADIUS);
                    this.canvas.fill({ color: nodeColor, alpha: fillAlpha });
                    this.canvas.circle(pos.x, pos.y, NODE_RADIUS);
                    this.canvas.stroke({ color: strokeColor, width: strokeWidth, alpha: strokeAlpha });
                }
            }
            
            // Draw input group outlines
            if (isInputLayer && inputGroups) {
                let nodeIndex = 0;
                for (let g = 0; g < inputGroups.length; g++) {
                    const groupSize = inputGroups[g];
                    if (groupSize > 1) {
                        const firstPos = this.positionCalculator.getNodePosition(
                            layer, nodeIndex, sizes[layer], numLayers, totalNumColumns, columnSpacing, inputGroups
                        );
                        const lastPos = this.positionCalculator.getNodePosition(
                            layer, nodeIndex + groupSize - 1, sizes[layer], numLayers, totalNumColumns, columnSpacing, inputGroups
                        );
                        
                        this.canvas.roundRect(
                            firstPos.x - rectSize / 2,
                            Math.min(firstPos.y, lastPos.y) - NODE_RADIUS,
                            rectSize,
                            Math.max(firstPos.y, lastPos.y) - Math.min(firstPos.y, lastPos.y) + NODE_RADIUS * 2,
                            NODE_RADIUS
                        );
                        this.canvas.stroke({ color: 0xFFFFFF, width: 1, alpha: INPUT_STROKE_ALPHA });
                    }
                    nodeIndex += groupSize;
                }
            }
        }
    }
}

