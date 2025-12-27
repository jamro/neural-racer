import AbstractSimulationObject from '../AbstractSimulationObject';
import TrackView from './TrackView';
import TrackSegments from './TrackSegments';
import Checkpoints from './Checkpoints';

class TrackObject extends AbstractSimulationObject {
    constructor(cellSize = 4) {
        super();
        this.name = 'Unknown Track';
        this.view = new TrackView(this.metersToPixels(0.5));
        this.wallSegments = new TrackSegments(cellSize);
        this.checkpoints = new Checkpoints(cellSize);
    }

    buildTestTrack() {
      this.addSegment(-60, 0, -60, -30)
      this.addSegment(-50, 60, -60, 0)
      this.addSegment(-30, 90, -50, 60)
      this.addSegment(20, 90, -30, 90)
      this.addSegment(50, 80, 20, 90)
      this.addSegment(50, 100, 50, 80)
      this.addSegment(100, 140, 50, 100)
      this.addSegment(160, 140, 100, 140)
      this.addSegment(170, 130, 160, 140)
      this.addSegment(170, 80, 170, 130)
      this.addSegment(150, 20, 170, 80)
      this.addSegment(130, -10, 150, 20)
      this.addSegment(120, -80, 130, -10)
      this.addSegment(110, -90, 120, -80)
      this.addSegment(80, -90, 110, -90)
      this.addSegment(45, -70, 80, -90)
      this.addSegment(40, -55, 45, -70)
      this.addSegment(50, -25, 40, -55)
      this.addSegment(35, -15, 50, -25)
      this.addSegment(-4, -15, 35, -15)
      this.addSegment(-4, -15, -4, 15) // start wall
      this.addSegment(-4, 15, 30, 15)
      this.addSegment(30, 15, 80, 0)
      this.addSegment(80, 0, 80, -35)
      this.addSegment(80, -35, 70, -45)
      this.addSegment(70, -45, 75, -55)
      this.addSegment(75, -55, 90, -55)
      this.addSegment(90, -55, 100, 25)
      this.addSegment(100, 25, 110, 30)
      this.addSegment(110, 30, 120, 40)
      this.addSegment(120, 40, 120, 70)
      this.addSegment(120, 70, 125, 80)
      this.addSegment(125, 80, 125, 90)
      this.addSegment(125, 90, 115, 100)
      this.addSegment(115, 100, 80, 80)
      this.addSegment(80, 80, 70, 50)
      this.addSegment(70, 50, 40, 40)
      this.addSegment(40, 40, 20, 50)
      this.addSegment(20, 50, -10, 50)
      this.addSegment(-10, 50, -20, 0)
      this.addSegment(-20, 0, -20, -30)
      // end wall
      this.addSegment(-20, -30, -60, -30)

      // checkpoints
      this.addCheckpoint(0, -16, 0, 15)
      this.addCheckpoint(4, -17, 4, 15)
      this.addCheckpoint(20, -15, 28, 15)
      this.addCheckpoint(45, -23, 70, 5)
      this.addCheckpoint(40, -60, 70, -45)
      this.addCheckpoint(80, -90, 85, -55)
      this.addCheckpoint(120, -80, 90, -50)
      this.addCheckpoint(92, -35, 127, -35)
      this.addCheckpoint(97, 5, 130, -10)
      this.addCheckpoint(120, 45, 153, 30)
      this.addCheckpoint(125, 85, 170, 85)
      this.addCheckpoint(120, 95, 170, 130)
      this.addCheckpoint(115, 100, 115, 140)
      this.addCheckpoint(100, 90, 80, 125)
      this.addCheckpoint(76, 70, 50, 80)
      this.addCheckpoint(45, 82, 40, 40)
      this.addCheckpoint(-10, 90, -10, 50)
      this.addCheckpoint(-52, 50, -12, 40)
      this.addCheckpoint(-60, 4, -20, 0)
      this.addCheckpoint(-20, -25, -60, -25)
    }

    addCheckpoint(ax, ay, bx, by) {
      this.checkpoints.addSegment(ax, ay, bx, by);
      this.view.addCheckpoint(
        this.metersToPixels(ax),
        this.metersToPixels(ay),
        this.metersToPixels(bx),
        this.metersToPixels(by)
      );
    }


    addSegment(ax, ay, bx, by) {
      this.wallSegments.addSegment(ax, ay, bx, by);
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
        return this.wallSegments.rayIntersectionsMinLength(ox, oy, angle);
    }

    isBoxCollidingWithWall(ox, oy, width, height, angle) {
        return this.wallSegments.isBoxColliding(ox, oy, width, height, angle);
    }

    isBoxCollidingWithCheckpoint(ox, oy, width, height, angle) {
        return this.checkpoints.isBoxColliding(ox, oy, width, height, angle);
    }

    getStartPosition() {
        return this.checkpoints.getStartPosition();
    }
}

export default TrackObject;