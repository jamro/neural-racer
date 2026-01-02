import * as PIXI from 'pixi.js';

class SimulationDetailsView extends PIXI.Container {

  constructor() {
    super();
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

  update(simulation) {
    // be sure that memory is supported
    let usedJSHeapSize = 0;
    let jsHeapSizeLimit = 0;
    if(performance.memory) {
      usedJSHeapSize = performance.memory.usedJSHeapSize;
      jsHeapSizeLimit = performance.memory.jsHeapSizeLimit;
    }

    this.statusTextField.text = "FPS: " + (this.fps || '???') + "\n" + 
    "Memory: " + (Math.round(usedJSHeapSize / 1024 / 1024) + "MB / " + Math.round(jsHeapSizeLimit / 1024 / 1024) + "MB") + "\n" +
    "Car processing time:\n" + 
    " - Control: " + (simulation.carControlProccessingTime.toFixed(2)) + "ms\n" +
    " - Physics: " + (simulation.carPhysicsProccessingTime.toFixed(2)) + "ms\n"
  }

  onTick(delta) {
    this.fpsCounter += 1;
  }

}

export default SimulationDetailsView;