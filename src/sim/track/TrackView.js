import * as PIXI from 'pixi.js';

class TrackView extends PIXI.Graphics {
    constructor(wallWidth) {
        super();
        this.wallWidth = wallWidth;
    }

    addSegment(ax, ay, bx, by) {
      this.moveTo(ax, ay);
      this.lineTo(bx, by);
      this.stroke({ color: 0x000000, width: this.wallWidth });
    }

    addCheckpoint(ax, ay, bx, by) {
      this.moveTo(ax, ay);
      this.lineTo(bx, by);
      this.stroke({ color: 0xffffff, alpha: 0.5, width: 1 });
    }
}

export default TrackView;