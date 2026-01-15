import TrackView from '../../../presentation/simulation/track/TrackView';
import TrackSegments from './TrackSegments';
import Checkpoints from './Checkpoints';
import { metersToPixels } from '../../../presentation/simulation/unitConversion';

class TrackObject {
  constructor(cellSize = 4) {
    this.name = 'Unknown Track';
    this.view = new TrackView(metersToPixels(0.5));
    this.wallSegments = new TrackSegments(cellSize);
    this.checkpoints = new Checkpoints(cellSize);
  }

  addCheckpoint(ax, ay, bx, by) {
    this.checkpoints.addSegment(ax, ay, bx, by);
    this.view.addCheckpoint(
      metersToPixels(ax),
      metersToPixels(ay),
      metersToPixels(bx),
      metersToPixels(by)
    );
  }

  addSegment(ax, ay, bx, by) {
    this.wallSegments.addSegment(ax, ay, bx, by);
    this.view.addSegment(
      metersToPixels(ax),
      metersToPixels(ay),
      metersToPixels(bx),
      metersToPixels(by)
    );
  }

  addTrackShape(shape) {
    const scaledShape = shape.map(segment => {
      return {
        ax: metersToPixels(segment.ax),
        ay: metersToPixels(segment.ay),
        bx: metersToPixels(segment.bx),
        by: metersToPixels(segment.by),
      };
    });
    this.view.addTrackShape(scaledShape);
  }

  addTrackGraphic(filename, x, y, width, height, rotation = 0, scaleX = 1, scaleY = 1) {

    this.view.addTrackGraphic(
      filename, 
      metersToPixels(x),
      metersToPixels(y),
      metersToPixels(width),
      metersToPixels(height),
      rotation,
      scaleX,
      scaleY
    );
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