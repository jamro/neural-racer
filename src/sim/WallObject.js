import SimulationObject from './SimulationObject';
import WallView from './WallView';

class WallObject extends SimulationObject {
    constructor(x, y, w, h, r=0) {
        super();
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.r = r;
        this.view = new WallView(
          this.metersToPixels(w),
          this.metersToPixels(h)
        );
        this.view.x = this.metersToPixels(this.x);
        this.view.y = this.metersToPixels(this.y);
        this.view.rotation = this.r;
    }

    render(delta) {
        // nothing to render, walls are static
    }

    update(delta) {
        // nothing to update, walls don't move
    }
}

export default WallObject;