class GridMap {
    constructor(cellSize = 4) {
        this.cellSize = cellSize;
        this.grid = new Map(); // Map<cellKey, segmentIndices[]>
    }

    getCellKey(cellX, cellY) {
      // pack into 32-bit int (signed is fine)
      return (cellX << 16) ^ (cellY & 0xffff);
    }

    worldToCell(x, y) {
        return {
            x: Math.floor(x / this.cellSize),
            y: Math.floor(y / this.cellSize)
        };
    }

    getCellsForSegment(ax, ay, bx, by) {
        const cells = new Set();
        
        // Get bounding box of segment
        const minX = Math.min(ax, bx);
        const maxX = Math.max(ax, bx);
        const minY = Math.min(ay, by);
        const maxY = Math.max(ay, by);
        
        // Get cell coordinates for bounding box
        const startCell = this.worldToCell(minX, minY);
        const endCell = this.worldToCell(maxX, maxY);
        
        // Add all cells in bounding box
        for (let cellX = startCell.x; cellX <= endCell.x; cellX++) {
            for (let cellY = startCell.y; cellY <= endCell.y; cellY++) {
                cells.add(this.getCellKey(cellX, cellY));
            }
        }
        
        return cells;
    }

    addSegmentToGrid(segmentIndex, ax, ay, bx, by) {
        const cells = this.getCellsForSegment(ax, ay, bx, by);
        
        for (const cellKey of cells) {
            if (!this.grid.has(cellKey)) {
                this.grid.set(cellKey, []);
            }
            this.grid.get(cellKey).push(segmentIndex);
        }
    }

    getCellsForRay(ox, oy, angle, maxLength = 1000) {
        const cells = new Set();
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        
        // Start cell
        const startCell = this.worldToCell(ox, oy);
        cells.add(this.getCellKey(startCell.x, startCell.y));
        
        if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10) {
            return cells; // Zero-length ray
        }
        
        // Use DDA algorithm to traverse cells
        const cellSize = this.cellSize;
        let currentCellX = startCell.x;
        let currentCellY = startCell.y;
        
        // Calculate step direction
        const stepX = dx > 0 ? 1 : -1;
        const stepY = dy > 0 ? 1 : -1;
        
        // Calculate distances to next cell boundaries
        let tMaxX, tMaxY;
        if (Math.abs(dx) < 1e-10) {
            tMaxX = Infinity;
        } else {
            const nextBoundaryX = stepX > 0 
                ? (currentCellX + 1) * cellSize
                : currentCellX * cellSize;
            tMaxX = (nextBoundaryX - ox) / dx;
        }
        
        if (Math.abs(dy) < 1e-10) {
            tMaxY = Infinity;
        } else {
            const nextBoundaryY = stepY > 0
                ? (currentCellY + 1) * cellSize
                : currentCellY * cellSize;
            tMaxY = (nextBoundaryY - oy) / dy;
        }
        
        // Calculate step sizes (distance along ray to move one cell)
        const tDeltaX = Math.abs(dx) < 1e-10 ? Infinity : cellSize / Math.abs(dx);
        const tDeltaY = Math.abs(dy) < 1e-10 ? Infinity : cellSize / Math.abs(dy);
        
        // Traverse cells
        let t = 0;
        while (t < maxLength) {
            if (tMaxX < tMaxY) {
                t = tMaxX;
                currentCellX += stepX;
                tMaxX += tDeltaX;
            } else {
                t = tMaxY;
                currentCellY += stepY;
                tMaxY += tDeltaY;
            }
            
            if (t > maxLength) break;
            cells.add(this.getCellKey(currentCellX, currentCellY));
        }
        
        return cells;
    }

    getCellsForBox(ox, oy, width, height, angle) {
        const cells = new Set();
        
        // Box's local coordinate system axes
        const ux = Math.cos(angle);
        const uy = Math.sin(angle);
        const vx = -Math.sin(angle);
        const vy = Math.cos(angle);
        
        // Box half-dimensions
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        // Calculate all four corners of the rotated box
        const corners = [
            { x: ox + ux * halfWidth + vx * halfHeight, y: oy + uy * halfWidth + vy * halfHeight },
            { x: ox + ux * halfWidth - vx * halfHeight, y: oy + uy * halfWidth - vy * halfHeight },
            { x: ox - ux * halfWidth + vx * halfHeight, y: oy - uy * halfWidth + vy * halfHeight },
            { x: ox - ux * halfWidth - vx * halfHeight, y: oy - uy * halfWidth - vy * halfHeight }
        ];
        
        // Get axis-aligned bounding box (AABB) of the rotated box
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const corner of corners) {
            minX = Math.min(minX, corner.x);
            maxX = Math.max(maxX, corner.x);
            minY = Math.min(minY, corner.y);
            maxY = Math.max(maxY, corner.y);
        }
        
        // Get cell coordinates for AABB
        const startCell = this.worldToCell(minX, minY);
        const endCell = this.worldToCell(maxX, maxY);
        
        // Add all cells in AABB
        for (let cellX = startCell.x; cellX <= endCell.x; cellX++) {
            for (let cellY = startCell.y; cellY <= endCell.y; cellY++) {
                cells.add(this.getCellKey(cellX, cellY));
            }
        }
        
        return cells;
    }

    getSegmentIndices(cellKey) {
        return this.grid.get(cellKey);
    }
}

export default GridMap;

