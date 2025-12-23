import SimulationObject from './SimulationObject';
import TrackView from './TrackView';
import TrackSegments from './TrackSegments';


class TrackObject extends SimulationObject {
    constructor(cellSize = 4) {
        super();
        this.view = new TrackView(this.metersToPixels(0.5));
        this.segments = new TrackSegments(cellSize);
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
      this.segments.addSegment(ax, ay, bx, by);
      this.view.addSegment(
        this.metersToPixels(ax),
        this.metersToPixels(ay),
        this.metersToPixels(bx),
        this.metersToPixels(by)
      );
    }

    render(delta) {
        // nothing to render, tracks are static
    }

    update(delta) {
        // nothing to update, tracks don't move
    }

    rayIntersectionsMinLength(ox, oy, angle) {
        return this.segments.rayIntersectionsMinLength(ox, oy, angle);
    }

    isBoxColliding(ox, oy, width, height, angle) {
        return this.segments.isBoxColliding(ox, oy, width, height, angle);
    }
}

export default TrackObject;