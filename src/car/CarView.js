import * as PIXI from 'pixi.js';

class CarView extends PIXI.Container {
    constructor() {
        super();
        this.body = new PIXI.Graphics();

        // wheels
        this.body.rect(5, -2, 10, 29);
        this.body.rect(35, -2, 10, 29);
        this.body.fill(0x000000);

        // body
        this.body.rect(0, 0, 50, 25);
        this.body.fill(0xaa0000);

        // headlights
        this.body.circle(47, 21, 2);
        this.body.circle(47, 4, 2);
        this.body.fill(0xffff00);

        // windshield
        this.body.rect(22, 2, 10, 21);
        this.body.rect(7, 4, 5, 17);
        this.body.fill(0xddddff);

        this.body.x = -25;
        this.body.y = -12.5;
        this.addChild(this.body);
    }
}

export default CarView;