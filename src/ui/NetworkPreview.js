import * as PIXI from 'pixi.js';

const CANVAS_WIDTH = 210;
const CANVAS_HEIGHT = 180;
const NODE_RADIUS = 3;
const MIN_NODE_OUTLINE_WIDTH = 0.1;
const MAX_NODE_OUTLINE_WIDTH = 1;
const MIN_CONNECTION_ALPHA = 0;
const MIN_NODE_ALPHA = 0;
const INPUT_STROKE_ALPHA = 0.5;
const OUTPUT_T_HORIZONTAL_SCALE = 5;
const OUTPUT_T_VERTICAL_SCALE = 50;
const OUTPUT_T_SCALE_ALPHA = 0.2;

class NetworkPreview extends PIXI.Container {
    constructor(hiddenLayerColumns = 2, inputNeuronGroups = [9, 2, 1, 1, 1, 1, 2]) {
        super();
        this.canvas = new PIXI.Graphics();
        this.hiddenLayerColumns = hiddenLayerColumns;
        this.inputNeuronGroups = inputNeuronGroups;
        this.addChild(this.canvas);
    }

    renderView(network, genome = null, activations = null) {
        this.canvas.clear();
        if (!network?.sizes?.length) return;

        const { sizes } = network;
        const numLayers = sizes.length;
        const weights = genome ? this._extractWeights(network, genome) : null;
        const numColumns = 1 + Math.max(0, numLayers - 2) * this.hiddenLayerColumns + 1;
        const columnSpacing = numColumns > 1 ? CANVAS_WIDTH / (numColumns - 1) : 0;
        
        const signals = this._getSignals(sizes, weights, activations);
        const weightedInputSums = weights && activations ? this._calculateWeightedInputSums(sizes, weights, activations) : null;
        
        if (weights) this._drawConnections(sizes, weights, activations, numLayers, numColumns, columnSpacing);
        this._drawNodes(sizes, signals, weightedInputSums, numLayers, numColumns, columnSpacing);
    }

    _extractWeights(network, genome) {
        const { sizes } = network;
        const genes = genome.genes || genome;
        const weights = [];
        let offset = 0;
        for (let l = 0; l < sizes.length - 1; l++) {
            const inD = sizes[l], outD = sizes[l + 1];
            const layerWeights = [];
            for (let o = 0; o < outD; o++) {
                const row = [];
                for (let i = 0; i < inD; i++) row.push(genes[offset + o * inD + i]);
                layerWeights.push(row);
            }
            weights.push(layerWeights);
            offset += outD * inD + outD;
        }
        return weights;
    }

    _getSignals(sizes, weights, activations) {
        if (activations?.length === sizes.length) {
            let maxAbs = 0;
            const signals = activations.map(layer => {
                if (!layer) return [];
                const arr = Array.from(layer);
                arr.forEach(s => maxAbs = Math.max(maxAbs, Math.abs(s)));
                return arr;
            });
            return { signals, maxAbs: maxAbs || 1.0 };
        }
        if (!weights) return { signals: [], maxAbs: 1.0 };
        
        const signals = sizes.map(() => []);
        let maxAbs = 0;
        for (let l = 0; l < sizes.length - 1; l++) {
            for (let o = 0; o < sizes[l + 1]; o++) {
                let sum = 0;
                for (let i = 0; i < sizes[l]; i++) sum += weights[l][o][i];
                signals[l + 1][o] = sum;
                maxAbs = Math.max(maxAbs, Math.abs(sum));
            }
        }
        return { signals, maxAbs: maxAbs || 1.0 };
    }

    _getInputGroups(numNodes) {
        const groups = [...this.inputNeuronGroups];
        let total = groups.reduce((sum, g) => sum + g, 0);
        while (total < numNodes) { groups.push(1); total++; }
        while (total > numNodes) {
            const last = groups[groups.length - 1];
            if (last > 1) { groups[groups.length - 1] = last - 1; total--; }
            else { groups.pop(); total--; }
        }
        return groups;
    }

    _getInputNodeYPosition(node, numNodes) {
        const groups = this._getInputGroups(numNodes);
        const nodeSpacing = 2 * NODE_RADIUS;
        const groupHeights = groups.map(size => size > 1 ? (size - 1) * nodeSpacing : 0);
        const totalHeightNeeded = groupHeights.reduce((sum, h) => sum + h, 0);
        const availableHeight = CANVAS_HEIGHT - 2 * NODE_RADIUS;
        
        let nodeIndex = 0, groupIndex = 0, positionInGroup = 0;
        for (let g = 0; g < groups.length; g++) {
            if (node < nodeIndex + groups[g]) {
                groupIndex = g;
                positionInGroup = node - nodeIndex;
                break;
            }
            nodeIndex += groups[g];
        }
        
        let currentY = NODE_RADIUS;
        const numGroups = groups.length;
        if (numGroups === 1) {
            currentY = (CANVAS_HEIGHT - groupHeights[0]) / 2;
        } else if (totalHeightNeeded <= availableHeight) {
            const spacing = (availableHeight - totalHeightNeeded) / (numGroups - 1);
            for (let g = 0; g < groupIndex; g++) currentY += groupHeights[g] + spacing;
        } else {
            const scale = availableHeight / totalHeightNeeded;
            for (let g = 0; g < groupIndex; g++) currentY += groupHeights[g] * scale;
        }
        
        return currentY + positionInGroup * (groups[groupIndex] > 1 ? nodeSpacing : 0);
    }

    _getNodePosition(layer, node, numNodes, numLayers, totalNumColumns, columnSpacing) {
        const isHidden = layer > 0 && layer < numLayers - 1;
        const nodesPerColumn = Math.ceil(numNodes / (isHidden ? this.hiddenLayerColumns : 1));
        
        const columnIndex = layer === 0 ? 0 : 
            layer === numLayers - 1 ? 1 + Math.max(0, numLayers - 2) * this.hiddenLayerColumns :
            1 + (layer - 1) * this.hiddenLayerColumns + Math.floor(node / nodesPerColumn);
        
        const x = totalNumColumns > 1 ? columnIndex * columnSpacing : CANVAS_WIDTH / 2;
        
        let y;
        if (layer === 0) {
            y = this._getInputNodeYPosition(node, numNodes);
        } else if (layer === numLayers - 1) {
            // Output layer: top/bottom padding = half of spacing
            // spacing = CANVAS_HEIGHT / numNodes, padding = spacing / 2
            const spacing = CANVAS_HEIGHT / numNodes;
            const padding = spacing / 2;
            y = padding + node * spacing;
        } else {
            const columnNodeIndex = node % nodesPerColumn;
            const startNode = Math.floor(node / nodesPerColumn) * nodesPerColumn;
            const nodesInColumn = Math.min(startNode + nodesPerColumn, numNodes) - startNode;
            const availableHeight = CANVAS_HEIGHT - 2 * NODE_RADIUS;
            const nodeSpacing = nodesInColumn > 1 ? availableHeight / (nodesInColumn - 1) : 0;
            y = nodesInColumn === 1 ? CANVAS_HEIGHT / 2 : NODE_RADIUS + columnNodeIndex * nodeSpacing;
        }
        
        return { x, y: Math.max(NODE_RADIUS, Math.min(CANVAS_HEIGHT - NODE_RADIUS, y)) };
    }

    _calculateWeightedInputSums(sizes, weights, activations) {
        const sums = [new Array(sizes[0]).fill(0)];
        let maxAbsSum = 0;
        for (let l = 0; l < sizes.length - 1; l++) {
            sums[l + 1] = [];
            for (let o = 0; o < sizes[l + 1]; o++) {
                let sum = 0;
                for (let i = 0; i < sizes[l]; i++) sum += activations[l][i] * weights[l][o][i];
                sums[l + 1][o] = sum;
                maxAbsSum = Math.max(maxAbsSum, Math.abs(sum));
            }
        }
        return { sums, maxAbs: maxAbsSum || 1.0 };
    }

    _drawRoundedRectTop(x, y, w, h, r, color, alpha) {
        this.canvas.moveTo(x + r, y);
        this.canvas.arc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
        this.canvas.lineTo(x + w, y + h);
        this.canvas.lineTo(x, y + h);
        this.canvas.lineTo(x, y + r);
        this.canvas.arc(x + r, y + r, r, Math.PI, 0, false);
        this.canvas.fill({ color, alpha });
    }

    _drawRoundedRectBottom(x, y, w, h, r, color, alpha) {
        this.canvas.moveTo(x, y);
        this.canvas.lineTo(x + w, y);
        this.canvas.lineTo(x + w, y + h - r);
        this.canvas.arc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
        this.canvas.lineTo(x + r, y + h);
        this.canvas.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
        this.canvas.fill({ color, alpha });
    }

    _drawNodes(sizes, signals, weightedInputSums, numLayers, totalNumColumns, columnSpacing) {
        for (let layer = 0; layer < numLayers; layer++) {
            const layerSignals = signals.signals[layer] || [];
            const layerWeightedSums = weightedInputSums?.sums[layer] || [];
            const isOutputLayer = layer === numLayers - 1;
            const isInputLayer = layer === 0;
            const rectSize = NODE_RADIUS * 2;
            const inputGroups = isInputLayer ? this._getInputGroups(sizes[layer]) : null;
            
            for (let node = 0; node < sizes[layer]; node++) {
                const pos = this._getNodePosition(layer, node, sizes[layer], numLayers, totalNumColumns, columnSpacing);
                const outputSignal = layerSignals[node];
                const weightedSum = layerWeightedSums[node];
                
                const absSignal = outputSignal !== undefined ? Math.abs(outputSignal) : 0;
                const normalizedOutput = isOutputLayer ? Math.sqrt(absSignal) : 
                    (outputSignal !== undefined ? Math.min(1, absSignal / signals.maxAbs) : 0);
                const normalizedInputSum = weightedSum !== undefined && weightedInputSums ? 
                    Math.min(1, Math.abs(weightedSum) / weightedInputSums.maxAbs) : 0;
                
                const fillAlpha = outputSignal !== undefined ? MIN_NODE_ALPHA + (1 - MIN_NODE_ALPHA) * normalizedOutput * normalizedOutput : 0.2;
                const strokeAlpha = weightedSum !== undefined && weightedInputSums ? MIN_NODE_ALPHA + (1 - MIN_NODE_ALPHA) * normalizedInputSum : 0.3;
                const strokeWidth = MIN_NODE_OUTLINE_WIDTH + (MAX_NODE_OUTLINE_WIDTH - MIN_NODE_OUTLINE_WIDTH) * normalizedInputSum;
                const nodeColor = outputSignal !== undefined ? 0xFFFFFF : 0x888888;
                
                if (isInputLayer) {
                    let nodeIndex = 0, isInGroup = false, positionInGroup = -1, groupSize = 1;
                    for (let g = 0; g < inputGroups.length; g++) {
                        if (node >= nodeIndex && node < nodeIndex + inputGroups[g]) {
                            isInGroup = inputGroups[g] > 1;
                            positionInGroup = node - nodeIndex;
                            groupSize = inputGroups[g];
                            break;
                        }
                        nodeIndex += inputGroups[g];
                    }
                    
                    const x = pos.x - rectSize/2, y = pos.y - rectSize/2;
                    const isTopInGroup = isInGroup && positionInGroup === 0;
                    const isBottomInGroup = isInGroup && positionInGroup === groupSize - 1;
                    
                    if (isTopInGroup) {
                        this._drawRoundedRectTop(x, y, rectSize, rectSize, NODE_RADIUS, nodeColor, fillAlpha);
                    } else if (isBottomInGroup) {
                        this._drawRoundedRectBottom(x, y, rectSize, rectSize, NODE_RADIUS, nodeColor, fillAlpha);
                    } else if (isInGroup) {
                        this.canvas.rect(x, y, rectSize, rectSize);
                        this.canvas.fill({ color: nodeColor, alpha: fillAlpha });
                    } else {
                        this.canvas.circle(pos.x, pos.y, NODE_RADIUS);
                        this.canvas.fill({ color: nodeColor, alpha: fillAlpha });
                        this.canvas.circle(pos.x, pos.y, NODE_RADIUS);
                        this.canvas.stroke({ color: 0xFFFFFF, width: 1, alpha: INPUT_STROKE_ALPHA });
                    }
                } else if (isOutputLayer) {
                    // Output neurons: draw circle with stroke
                    this.canvas.circle(pos.x, pos.y, NODE_RADIUS);
                    this.canvas.fill({ color: nodeColor, alpha: fillAlpha });
                    this.canvas.circle(pos.x, pos.y, NODE_RADIUS);
                    this.canvas.stroke({ color: 0xFFFFFF, width: strokeWidth, alpha: strokeAlpha });
                    
                    // Draw T-shape indicator: horizontal line + vertical line (centered)
                    const horizontalLength = OUTPUT_T_HORIZONTAL_SCALE;
                    const verticalLength = OUTPUT_T_VERTICAL_SCALE;
                    const startX = pos.x + NODE_RADIUS;
                    const endX = startX + horizontalLength;
                    const centerY = pos.y;
                    const topY = centerY - verticalLength / 2;
                    const bottomY = centerY + verticalLength / 2;
                    
                    this.canvas.moveTo(startX, centerY);
                    this.canvas.lineTo(endX, centerY);
                    this.canvas.moveTo(endX, topY);
                    this.canvas.lineTo(endX, bottomY);
                    this.canvas.stroke({ color: 0xFFFFFF, width: 1, alpha: OUTPUT_T_SCALE_ALPHA });
                    
                    // Draw progress bar on vertical line (maps output from -1 to 1 to bottom to top)
                    if (outputSignal !== undefined) {
                        const clampedValue = Math.max(-1, Math.min(1, outputSignal));
                        // Map from [-1, 1] to [bottomY, topY], starting from centerY
                        const progressY = centerY - (clampedValue * verticalLength / 2);
                        const barStartY = centerY;
                        const barEndY = progressY;
                        
                        this.canvas.moveTo(endX, barStartY);
                        this.canvas.lineTo(endX, barEndY);
                        this.canvas.stroke({ color: 0xFFFFFF, width: 2, alpha: 0.8 });
                    }
                } else {
                    // Hidden layers: draw as circles
                    this.canvas.circle(pos.x, pos.y, NODE_RADIUS);
                    this.canvas.fill({ color: nodeColor, alpha: fillAlpha });
                    this.canvas.circle(pos.x, pos.y, NODE_RADIUS);
                    this.canvas.stroke({ color: 0xFFFFFF, width: strokeWidth, alpha: strokeAlpha });
                }
            }
            
            if (isInputLayer && inputGroups) {
                let nodeIndex = 0;
                for (let g = 0; g < inputGroups.length; g++) {
                    const groupSize = inputGroups[g];
                    if (groupSize > 1) {
                        const firstPos = this._getNodePosition(layer, nodeIndex, sizes[layer], numLayers, totalNumColumns, columnSpacing);
                        const lastPos = this._getNodePosition(layer, nodeIndex + groupSize - 1, sizes[layer], numLayers, totalNumColumns, columnSpacing);
                        this.canvas.roundRect(firstPos.x - rectSize/2, Math.min(firstPos.y, lastPos.y) - NODE_RADIUS, 
                            rectSize, Math.max(firstPos.y, lastPos.y) - Math.min(firstPos.y, lastPos.y) + NODE_RADIUS * 2, NODE_RADIUS);
                        this.canvas.stroke({ color: 0xFFFFFF, width: 1, alpha: INPUT_STROKE_ALPHA });
                    }
                    nodeIndex += groupSize;
                }
            }
        }
    }

    _drawConnections(sizes, weights, activations, numLayers, totalNumColumns, columnSpacing) {
        let maxAbsSignal = 0;
        for (let layer = 0; layer < numLayers - 1; layer++) {
            const inputActivations = activations?.[layer];
            for (let o = 0; o < sizes[layer + 1]; o++) {
                for (let i = 0; i < sizes[layer]; i++) {
                    maxAbsSignal = Math.max(maxAbsSignal, Math.abs(inputActivations ? inputActivations[i] * weights[layer][o][i] : weights[layer][o][i]));
                }
            }
        }
        if (maxAbsSignal < 0.001) maxAbsSignal = 1.0;

        for (let layer = 0; layer < numLayers - 1; layer++) {
            const inputActivations = activations?.[layer];
            for (let o = 0; o < sizes[layer + 1]; o++) {
                const outputPos = this._getNodePosition(layer + 1, o, sizes[layer + 1], numLayers, totalNumColumns, columnSpacing);
                for (let i = 0; i < sizes[layer]; i++) {
                    const inputPos = this._getNodePosition(layer, i, sizes[layer], numLayers, totalNumColumns, columnSpacing);
                    const signal = inputActivations ? inputActivations[i] * weights[layer][o][i] : weights[layer][o][i];
                    const normalized = Math.abs(signal) / maxAbsSignal;
                    const normalizedSq = normalized * normalized;
                    
                    const startX = inputPos.x + NODE_RADIUS;
                    const startY = inputPos.y;
                    const endX = outputPos.x - NODE_RADIUS;
                    const endY = outputPos.y;
                    const curveOffset = Math.abs(endX - startX) * 0.3;
                    
                    // Cubic bezier with horizontal tangents at start and end
                    this.canvas.moveTo(startX, startY);
                    this.canvas.bezierCurveTo(
                        startX + curveOffset, startY,  // First control point: horizontal from start
                        endX - curveOffset, endY,      // Second control point: horizontal to end
                        endX, endY                      // End point
                    );
                    this.canvas.stroke({ 
                        color: 0xFFFFFF, 
                        width: 0.4 + normalizedSq * normalizedSq * 1.8,
                        alpha: MIN_CONNECTION_ALPHA + (1 - MIN_CONNECTION_ALPHA) * normalized
                    });
                }
            }
        }
    }
}

export default NetworkPreview;
