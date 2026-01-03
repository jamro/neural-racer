import { CANVAS_WIDTH, CANVAS_HEIGHT, NODE_RADIUS } from './NetworkPreviewConstants.js';

/**
 * Calculates node positions for neural network visualization
 */
export class NodePositionCalculator {
    constructor(inputConfig) {
        this.inputConfig = inputConfig;
        this._cachedInputLayout = null;
        this._cachedInputLayoutSize = null;
        this._layerOrderMap = new Map(); // layerIndex -> Array(originalIndex -> visualRank)
    }

    /**
     * Set a visual ordering for nodes within a given layer.
     * The orderMap is an array where orderMap[originalNodeIndex] = visualRank (0..n-1).
     */
    setLayerOrder(layerIndex, orderMap) {
        if (!orderMap) {
            this._layerOrderMap.delete(layerIndex);
            return;
        }
        this._layerOrderMap.set(layerIndex, orderMap);
    }

    clearLayerOrders() {
        this._layerOrderMap.clear();
    }

    getVisualNodeIndex(layerIndex, nodeIndex) {
        const map = this._layerOrderMap.get(layerIndex);
        return map ? (map[nodeIndex] ?? nodeIndex) : nodeIndex;
    }

    /**
     * Build a mapping-aware input layout.
     * The preview has two "input" columns:
     * - layer 0: artificial input (grouped + can hide some inputs)
     * - layer -1 (isIntermediate=true): actual network input (always full, 1:1 with real inputs)
     *
     * @returns {{
     *   inputSize: number,
     *   visibleInputIndices: number[],
     *   actualToVisible: number[],
     *   groupSizes: number[],
     * }}
     */
    getInputLayout(inputSize) {
        // Use cache if available
        if (this._cachedInputLayout && this._cachedInputLayoutSize === inputSize) {
            return this._cachedInputLayout;
        }

        const cfg = this.inputConfig;

        // New mode: segment config (supports skipping + grouping).
        const segments = Array.isArray(cfg) ? cfg : [];
        const visibleInputIndices = [];
        const groupSizes = [];
        const skippedSources = new Map(); // skippedActualIdx -> Array<number> of source actual indices

        const addIndex = (idx, inGroupedSegment) => {
            if (idx < 0 || idx >= inputSize) return;
            visibleInputIndices.push(idx);
            groupSizes.push(inGroupedSegment ? -1 : 1); // -1 => "belongs to current group run"
        };

        for (const seg of segments) {
            if (!seg) continue;
            const group = !!seg.group;
            const hasIndex = Number.isInteger(seg.index);
            const hasRange = Array.isArray(seg.range) && seg.range.length === 2 &&
                Number.isInteger(seg.range[0]) && Number.isInteger(seg.range[1]);

            // Support both the typo and the corrected spelling.
            const sources = Array.isArray(seg.artificialSources)
                ? seg.artificialSources
                : (Array.isArray(seg.artificalSources) ? seg.artificalSources : null);
            // Simplified rule: if sources are provided, that input is skipped in the artificial layer.
            // (We also keep `skip: true` as backward-compatible.)
            const skip = !!seg.skip || (sources && sources.length > 0);

            if (hasIndex) {
                if (skip) {
                    if (sources && sources.length) skippedSources.set(seg.index, sources.slice());
                } else {
                    addIndex(seg.index, group);
                }
                continue;
            }

            if (hasRange) {
                const start = Math.min(seg.range[0], seg.range[1]);
                const end = Math.max(seg.range[0], seg.range[1]);
                if (skip) {
                    if (sources && sources.length) {
                        for (let i = start; i <= end; i++) skippedSources.set(i, sources.slice());
                    }
                    continue;
                }
                for (let i = start; i <= end; i++) addIndex(i, group);
                continue;
            }
        }

        // If config is empty or produced nothing, default to identity (no skip, no grouping).
        if (visibleInputIndices.length === 0) {
            for (let i = 0; i < inputSize; i++) visibleInputIndices.push(i);
            for (let i = 0; i < inputSize; i++) groupSizes.push(1);
        } else {
            // Convert groupSizes markers (-1s) into actual group runs:
            // - grouped runs become a single entry with run length (>=2)
            // - individual entries remain size=1
            const sizes = [];
            let run = 0;
            for (let i = 0; i < groupSizes.length; i++) {
                const isGrouped = groupSizes[i] === -1;
                if (isGrouped) {
                    run++;
                } else {
                    if (run > 0) sizes.push(run);
                    run = 0;
                    sizes.push(1);
                }
            }
            if (run > 0) sizes.push(run);
            groupSizes.length = 0;
            groupSizes.push(...sizes);
        }

        const actualToVisible = new Array(inputSize).fill(-1);
        for (let v = 0; v < visibleInputIndices.length; v++) {
            actualToVisible[visibleInputIndices[v]] = v;
        }

        // Build extra "artificial edges" from visible artificial nodes to skipped real input neurons.
        // Sources are interpreted as *actual input indices* (0..inputSize-1).
        const extraEdges = [];
        for (const [toActual, sources] of skippedSources.entries()) {
            if (!Number.isInteger(toActual) || toActual < 0 || toActual >= inputSize) continue;
            for (const srcActual of sources) {
                if (!Number.isInteger(srcActual) || srcActual < 0 || srcActual >= inputSize) continue;
                const fromVisible = actualToVisible[srcActual];
                if (fromVisible < 0) continue; // can't draw from a skipped/hidden artificial node
                extraEdges.push({ fromVisible, fromActual: srcActual, toActual });
            }
        }

        const layout = {
            inputSize,
            visibleInputIndices,
            actualToVisible,
            groupSizes,
            extraEdges
        };

        this._cachedInputLayout = layout;
        this._cachedInputLayoutSize = inputSize;
        return layout;
    }

    /**
     * Calculates Y position for an input node based on its group
     */
    getInputNodeYPosition(node, numNodes, groups) {
        const nodeSpacing = 2 * NODE_RADIUS;
        const groupHeights = groups.map(size => size > 1 ? (size - 1) * nodeSpacing : 0);
        const totalHeightNeeded = groupHeights.reduce((sum, h) => sum + h, 0);
        const availableHeight = CANVAS_HEIGHT - 2 * NODE_RADIUS;
        
        // Find which group this node belongs to
        let nodeIndex = 0;
        let groupIndex = 0;
        let positionInGroup = 0;
        
        for (let g = 0; g < groups.length; g++) {
            if (node < nodeIndex + groups[g]) {
                groupIndex = g;
                positionInGroup = node - nodeIndex;
                break;
            }
            nodeIndex += groups[g];
        }
        
        // Calculate Y position
        let currentY = NODE_RADIUS;
        const numGroups = groups.length;
        
        if (numGroups === 1) {
            currentY = (CANVAS_HEIGHT - groupHeights[0]) / 2;
        } else if (totalHeightNeeded <= availableHeight) {
            // We want symmetric padding above the first group and below the last group.
            // Requirement: top and bottom padding must equal half of the spacing between groups.
            // If spacingBetweenGroups = S, then total slack = (numGroups - 1) * S + 2 * (S/2) = numGroups * S.
            // So we compute S over numGroups (not numGroups - 1).
            const spacingBetweenGroups = (availableHeight - totalHeightNeeded) / numGroups;
            const padding = spacingBetweenGroups / 2;
            currentY = NODE_RADIUS + padding;
            for (let g = 0; g < groupIndex; g++) {
                currentY += groupHeights[g] + spacingBetweenGroups;
            }
        } else {
            const scale = availableHeight / totalHeightNeeded;
            for (let g = 0; g < groupIndex; g++) {
                currentY += groupHeights[g] * scale;
            }
        }
        
        return currentY + positionInGroup * (groups[groupIndex] > 1 ? nodeSpacing : 0);
    }

    /**
     * Calculates the position of a node in the network
     * @param {number} layer - Layer index (0 = input, -1 = intermediate, 1+ = hidden/output)
     * @param {number} node - Node index within the layer
     * @param {number} numNodes - Total nodes in this layer
     * @param {number} numLayers - Total number of actual network layers
     * @param {number} totalNumColumns - Total number of visual columns
     * @param {number} columnSpacing - Spacing between columns
     * @param {Array} inputGroups - Input neuron groups (for the artificial input column)
     * @param {boolean} isIntermediate - Whether this is the intermediate layer
     */
    getNodePosition(layer, node, numNodes, numLayers, totalNumColumns, columnSpacing, inputGroups, isIntermediate = false) {
        // Apply optional ordering to hidden layers (not input/output)
        const isHidden = !isIntermediate && layer > 0 && layer < numLayers - 1;
        const visualNode = isHidden ? this.getVisualNodeIndex(layer, node) : node;

        // Calculate column index
        // Layout: input (col 0) -> intermediate (col 1) -> hidden layers -> output (last col)
        let columnIndex;
        if (isIntermediate) {
            // Intermediate layer is always at column 1
            columnIndex = 1;
        } else if (layer === 0) {
            // Input layer is at column 0
            columnIndex = 0;
        } else if (layer === numLayers - 1) {
            // Output layer is at the last column
            columnIndex = totalNumColumns - 1;
        } else {
            // Hidden layers start from column 2 (after input and intermediate), one column per layer.
            columnIndex = 2 + (layer - 1);
        }
        
        // Calculate X position
        let x = totalNumColumns > 1 ? columnIndex * columnSpacing : CANVAS_WIDTH / 2;
        
        // Calculate Y position based on layer type
        let y;
        if (isIntermediate) {
            // Intermediate layer: evenly spaced like output layer, no grouping
            const spacing = CANVAS_HEIGHT / numNodes;
            const padding = spacing / 2;
            y = padding + node * spacing;
        } else if (layer === 0) {
            // Input layer: use grouped positioning
            y = this.getInputNodeYPosition(node, numNodes, inputGroups);
        } else if (layer === numLayers - 1) {
            // Output layer: evenly spaced with padding
            const spacing = CANVAS_HEIGHT / numNodes;
            const padding = spacing / 2;
            y = padding + node * spacing;
        } else {
            // Hidden layer: evenly spaced within the layer column.
            const nodesInColumn = numNodes;
            const availableHeight = CANVAS_HEIGHT - 2 * NODE_RADIUS;
            const nodeSpacing = nodesInColumn > 1 ? availableHeight / (nodesInColumn - 1) : 0;
            y = nodesInColumn === 1 ? CANVAS_HEIGHT / 2 : NODE_RADIUS + visualNode * nodeSpacing;
            
            // Offset X for visual variety
            if (visualNode % 2 === 0) {
                x -= NODE_RADIUS;
            } else {
                x += NODE_RADIUS;
            }
        }
        
        return { 
            x, 
            y: Math.max(NODE_RADIUS, Math.min(CANVAS_HEIGHT - NODE_RADIUS, y)) 
        };
    }
}

