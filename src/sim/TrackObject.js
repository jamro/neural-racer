import SimulationObject from './SimulationObject';
import TrackView from './TrackView';


class TrackObject extends SimulationObject {
    constructor(cellSize = 4) {
        super();
        this.view = new TrackView(this.metersToPixels(0.5));
        this.ax = []
        this.ay = []
        this.bx = []
        this.by = []
        this.cellSize = cellSize;
        this.grid = new Map(); // Map<cellKey, segmentIndices[]>
    }

    buildTestTrack() {
      this.addSegment(0, -15, 10, 0)
      this.addSegment(10, 0, 8, 20)
      this.addSegment(8, 20, -20, 25)
      this.addSegment(-20, 25, -25, 20)
      this.addSegment(-25, 20, -40, 20)
      this.addSegment(-40, 20, -35, 0)
      this.addSegment(-35, 0, -40, -15)
      this.addSegment(-40, -15, -20, -20)
      this.addSegment(-20, -20, -20, -10)
      this.addSegment(-20, -10, 0, -15)

      this.addSegment(-14, 5, -14, 15)
    }

    addSegment(ax, ay, bx, by) {
      const segmentIndex = this.ax.length;
      this.ax.push(ax)
      this.ay.push(ay)
      this.bx.push(bx)
      this.by.push(by)
      this.view.addSegment(
        this.metersToPixels(ax),
        this.metersToPixels(ay),
        this.metersToPixels(bx),
        this.metersToPixels(by)
      )
      this.addSegmentToGrid(segmentIndex, ax, ay, bx, by);
    }

    // Grid helper methods
    getCellKey(cellX, cellY) {
      return `${cellX},${cellY}`;
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

    render(delta) {
        // nothing to render, tracks are static
    }

    update(delta) {
        // nothing to update, tracks don't move
    }

    rayIntersectionsMinLength(ox, oy, angle) {
      let minLength = null;
      
      // Get cells that the ray passes through
      const cells = this.getCellsForRay(ox, oy, angle);
      const testedSegments = new Set(); // Avoid testing same segment multiple times
      
      // Check segments in relevant cells
      for (const cellKey of cells) {
        const segmentIndices = this.grid.get(cellKey);
        if (segmentIndices) {
          for (const i of segmentIndices) {
            if (!testedSegments.has(i)) {
              testedSegments.add(i);
              const length = this.raySegmentIntersectionLength(ox, oy, angle, this.ax[i], this.ay[i], this.bx[i], this.by[i]);
              if (length !== null) {
                if (minLength === null || length < minLength) {
                  minLength = length;
                }
              }
            }
          }
        }
      }
      
      return minLength;
    }

    raySegmentIntersectionLength(ox, oy, angle, x1, y1, x2, y2) {
        // ray direction
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        // segment vector
        const ex = x2 - x1;
        const ey = y2 - y1;

        // cross products
        const rxs = dx * ey - dy * ex;
        if (Math.abs(rxs) < 1e-8) return null; // parallel, no intersection

        const qpx = x1 - ox;
        const qpy = y1 - oy;

        const t = (qpx * ey - qpy * ex) / rxs; // ray parameter
        if (t < 0) return null; // behind ray origin

        const u = (qpx * dy - qpy * dx) / rxs; // ray parameter
        if (u < 0 || u > 1) return null; // not on segment

        return t; // length of intersection
    }

    // ox - center of the box
    // oy - center of the box
    // width - width of the box
    // height - height of the box
    // angle - angle of the box
    // ax - x of the start of the segment
    // ay - y of the start of the segment
    // bx - x of the end of the segment
    // by - y of the end of the segment
    isBoxCollidingSegment(ox, oy, width, height, angle, ax, ay, bx, by) {
        // Box's local coordinate system axes
        const ux = Math.cos(angle);
        const uy = Math.sin(angle);
        const vx = -Math.sin(angle);
        const vy = Math.cos(angle);
        
        // Box half-dimensions
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        // Box corners in world space
        const boxCorners = [
            { x: ox + ux * halfWidth + vx * halfHeight, y: oy + uy * halfWidth + vy * halfHeight },
            { x: ox + ux * halfWidth - vx * halfHeight, y: oy + uy * halfWidth - vy * halfHeight },
            { x: ox - ux * halfWidth + vx * halfHeight, y: oy - uy * halfWidth + vy * halfHeight },
            { x: ox - ux * halfWidth - vx * halfHeight, y: oy - uy * halfWidth - vy * halfHeight }
        ];
        
        // Potential separating axes: box axes and segment normal
        const axes = [
            { x: ux, y: uy },           // Box's local x-axis
            { x: vx, y: vy },           // Box's local y-axis
        ];
        
        // Segment direction and normal
        const segDx = bx - ax;
        const segDy = by - ay;
        const segLength = Math.sqrt(segDx * segDx + segDy * segDy);
        if (segLength > 1e-8) {
            // Normal to segment (perpendicular, normalized)
            axes.push({ x: -segDy / segLength, y: segDx / segLength });
        }
        
        // Project box and segment onto each axis and check for separation
        for (const axis of axes) {
            // Project box corners onto axis
            let boxMin = Infinity;
            let boxMax = -Infinity;
            for (const corner of boxCorners) {
                const projection = corner.x * axis.x + corner.y * axis.y;
                boxMin = Math.min(boxMin, projection);
                boxMax = Math.max(boxMax, projection);
            }
            
            // Project segment endpoints onto axis
            const segProj1 = ax * axis.x + ay * axis.y;
            const segProj2 = bx * axis.x + by * axis.y;
            const segMin = Math.min(segProj1, segProj2);
            const segMax = Math.max(segProj1, segProj2);
            
            // Check for separation (no overlap)
            if (boxMax < segMin || segMax < boxMin) {
                return false; // Separating axis found, no collision
            }
        }
        
        // All axes have overlapping projections, collision detected
        return true;
    }

    isBoxColliding(ox, oy, width, height, angle) {

      // Get cells that the box overlaps with
      const cells = this.getCellsForBox(ox, oy, width, height, angle);
      const testedSegments = new Set(); // Avoid testing same segment multiple times
      
      // Check segments in relevant cells
      for (const cellKey of cells) {
        const segmentIndices = this.grid.get(cellKey);
        if (segmentIndices) {
          for (const i of segmentIndices) {
            if (!testedSegments.has(i)) {
              testedSegments.add(i);
              if (this.isBoxCollidingSegment(ox, oy, width, height, angle, this.ax[i], this.ay[i], this.bx[i], this.by[i])) {
                return true;
              }
            }
          }
        }
      }
      return false;
    }
}

export default TrackObject;