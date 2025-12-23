import SimulationObject from './SimulationObject';
import TrackView from './TrackView';


class TrackObject extends SimulationObject {
    constructor() {
        super();
        this.view = new TrackView(this.metersToPixels(0.5));
        this.ax = []
        this.ay = []
        this.bx = []
        this.by = []
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
    }

    render(delta) {
        // nothing to render, tracks are static
    }

    update(delta) {
        // nothing to update, tracks don't move
    }

    rayIntersectionsMinLength(ox, oy, angle) {
      let minLength = null;
      for (let i = 0; i < this.ax.length; i++) {
        const length = this.raySegmentIntersectionLength(ox, oy, angle, this.ax[i], this.ay[i], this.bx[i], this.by[i]);
        if (length !== null) {
          if (minLength === null || length < minLength) {
            minLength = length;
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
}

export default TrackObject;