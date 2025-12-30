import * as PIXI from 'pixi.js';


class FpsCounter extends PIXI.Container {
    constructor() {
        super();

        this.bg = new PIXI.Graphics();
        this.bg.rect(0, 0, 170, 20);
        this.bg.fill({ color: 0x000000, alpha: 0.8 });
        this.addChild(this.bg);

        this.fpsText = new PIXI.Text();
        this.fpsText.style = {
          fontSize: 11,
          fontFamily: 'Courier New',
          fill: 0xffffff,
          align: 'right'
        };
        this.fpsText.x = 10;
        this.fpsText.y = 4;
        this.addChild(this.fpsText);
        this.fpsText.text = 'FPS: ???';

        PIXI.Ticker.shared.add(this.onTick, this);
        this.fps = 0;

        setInterval(() => {
            this.fpsText.text = 'FPS: ' + this.fps;
            this.fps = 0;
        }, 1000);
    }

    onTick(delta) {
        this.fps += 1;
    }

}

export default FpsCounter;