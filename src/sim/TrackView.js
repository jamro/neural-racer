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
      this.stroke({ color: 0xffff00, alpha: 0.3, width: this.wallWidth });
    }
}

export default TrackView;