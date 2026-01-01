import * as PIXI from 'pixi.js';

class SimulationDetailsView extends PIXI.Container {

  constructor() {
    super();
    this.simulation = null
    this.bg = new PIXI.Graphics();
    this.bg.rect(2, 2, 248, 98);
    this.bg.fill({
      color: 0x000000,
      alpha: 0.8
    });
    this.addChild(this.bg);

    this.statusTextField = new PIXI.Text();
    this.statusTextField.style = { 
      fontFamily: 'Courier New',
      fontSize: 12, 
      lineHeight: 16,
      fill: 0xffffff 
    };
    this.statusTextField.x = 10;
    this.statusTextField.y = 8;
    this.addChild(this.statusTextField);

    PIXI.Ticker.shared.add(this.onTick, this);
    this.fpsCounter = 0;
    this.fps = 0;

    setInterval(() => {
        this.fps = this.fpsCounter;
        this.fpsCounter = 0;
    }, 1000);
  }

  renderView(delta) {
    if (!this.simulation) return;

    this.statusTextField.text = "FPS: " + (this.fps || '???') + "\n\n" + 
    "Car processing time:\n" + 
    " - Control: " + (this.simulation.carControlProccessingTime.toFixed(2)) + "ms\n" +
    " - Physics: " + (this.simulation.carPhysicsProccessingTime.toFixed(2)) + "ms\n"
  }

  onTick(delta) {
    this.fpsCounter += 1;
  }

}

export default SimulationDetailsView;