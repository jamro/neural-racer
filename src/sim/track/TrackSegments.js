import GridMap from './GridMap';

class TrackSegments {
    constructor(cellSize = 4) {
        this.ax = []
        this.ay = []
        this.bx = []
        this.by = []
        this.gridMap = new GridMap(cellSize);
    }

    addSegment(ax, ay, bx, by) {
        const segmentIndex = this.ax.length;
        this.ax.push(ax)
        this.ay.push(ay)
        this.bx.push(bx)
        this.by.push(by)
        this.gridMap.addSegmentToGrid(segmentIndex, ax, ay, bx, by);
    }

    rayIntersectionsMinLength(ox, oy, angle) {
        let minLength = null;
        
        // Get cells that the ray passes through
        const cells = this.gridMap.getCellsForRay(ox, oy, angle);
        const testedSegments = new Set(); // Avoid testing same segment multiple times
        
        // Check segments in relevant cells
        for (const cellKey of cells) {
            const segmentIndices = this.gridMap.getSegmentIndices(cellKey);
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
        const cells = this.gridMap.getCellsForBox(ox, oy, width, height, angle);
        const testedSegments = new Set(); // Avoid testing same segment multiple times
        
        // Check segments in relevant cells
        for (const cellKey of cells) {
            const segmentIndices = this.gridMap.getSegmentIndices(cellKey);
            if (segmentIndices) {
                for (const i of segmentIndices) {
                    if (!testedSegments.has(i)) {
                        testedSegments.add(i);
                        if (this.isBoxCollidingSegment(ox, oy, width, height, angle, this.ax[i], this.ay[i], this.bx[i], this.by[i])) {
                            return i; // Return segment index from ax,ay,bx,by arrays
                        }
                    }
                }
            }
        }
        return false;
    }

    getSegment(index) {
        return {
            ax: this.ax[index],
            ay: this.ay[index],
            bx: this.bx[index],
            by: this.by[index]
        }
    }
}

export default TrackSegments;

