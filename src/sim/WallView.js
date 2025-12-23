import * as PIXI from 'pixi.js';

class WallView extends PIXI.Container {
    constructor(w, h) {
        super();
        this.wall = new PIXI.Graphics();
        this.wall.rect(-w/2, -h/2, w, h);
        this.wall.fill(0x000000);
        this.addChild(this.wall);
    }
}

export default WallView;