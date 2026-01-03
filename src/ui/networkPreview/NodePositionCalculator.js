import { CANVAS_WIDTH, CANVAS_HEIGHT, NODE_RADIUS } from './NetworkPreviewConstants.js';

/**
 * Calculates node positions for neural network visualization
 */
export class NodePositionCalculator {
    constructor(hiddenLayerColumns, inputNeuronGroups) {
        this.hiddenLayerColumns = hiddenLayerColumns;
        this.inputNeuronGroups = inputNeuronGroups;
        this._cachedInputGroups = null;
        this._cachedInputGroupsSize = null;
    }

    /**
     * Gets input neuron groups, adjusting to match the actual number of nodes
     */
    getInputGroups(numNodes) {
        // Use cache if available
        if (this._cachedInputGroups && this._cachedInputGroupsSize === numNodes) {
            return this._cachedInputGroups;
        }
        
        const groups = [...this.inputNeuronGroups];
        let total = groups.reduce((sum, g) => sum + g, 0);
        
        while (total < numNodes) {
            groups.push(1);
            total++;
        }
        
        while (total > numNodes) {
            const last = groups[groups.length - 1];
            if (last > 1) {
                groups[groups.length - 1] = last - 1;
                total--;
            } else {
                groups.pop();
                total--;
            }
        }
        
        // Cache the result
        this._cachedInputGroups = groups;
        this._cachedInputGroupsSize = numNodes;
        return groups;
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
            const spacing = (availableHeight - totalHeightNeeded) / (numGroups - 1);
            for (let g = 0; g < groupIndex; g++) {
                currentY += groupHeights[g] + spacing;
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
     */
    getNodePosition(layer, node, numNodes, numLayers, totalNumColumns, columnSpacing, inputGroups) {
        const isHidden = layer > 0 && layer < numLayers - 1;
        const nodesPerColumn = Math.ceil(numNodes / (isHidden ? this.hiddenLayerColumns : 1));
        
        // Calculate column index
        const columnIndex = layer === 0 ? 0 : 
            layer === numLayers - 1 ? 1 + Math.max(0, numLayers - 2) * this.hiddenLayerColumns :
            1 + (layer - 1) * this.hiddenLayerColumns + Math.floor(node / nodesPerColumn);
        
        // Calculate X position
        let x = totalNumColumns > 1 ? columnIndex * columnSpacing : CANVAS_WIDTH / 2;
        
        // Calculate Y position based on layer type
        let y;
        if (layer === 0) {
            y = this.getInputNodeYPosition(node, numNodes, inputGroups);
        } else if (layer === numLayers - 1) {
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
            
            // Offset X for visual variety
            if (node % 2 === 0) {
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

