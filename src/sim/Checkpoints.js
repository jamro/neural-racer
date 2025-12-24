import TrackSegments from './TrackSegments';


function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

class Checkpoints extends TrackSegments {
    constructor(cellSize = 4) {
        super(cellSize);
    }

    get checkpointCount() {
      return this.ax.length;
    }


    projectionBetweenGates(gateIndex, x, y) {
      if (gateIndex < 0 || gateIndex >= this.checkpointCount - 1) {
        return 0;
      }

      // midpoint of the gate
      const pkx = (this.ax[gateIndex] + this.bx[gateIndex]) / 2;
      const pky = (this.ay[gateIndex] + this.by[gateIndex]) / 2;
      // midpoint of the gate + 1
      const pk1x = (this.ax[gateIndex + 1] + this.bx[gateIndex + 1]) / 2;
      const pk1y = (this.ay[gateIndex + 1] + this.by[gateIndex + 1]) / 2;

      // vector from midpoint of the gate to the point
      const vx = pk1x - pkx;
      const vy = pk1y - pky;
      const len2 = vx*vx + vy*vy || 1e-9;

      // vector from midpoint of the gate to the point
      const px = x - pkx;
      const py = y - pky;

      const t = (px*vx + py*vy) / len2;
      return clamp(t, 0, 1); 
    }


}

export default Checkpoints;