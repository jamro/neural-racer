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
}

export default TrackObject;