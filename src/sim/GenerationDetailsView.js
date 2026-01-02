import * as PIXI from 'pixi.js';
import ProgressBar from '../ui/ProgressBar';

class GenerationDetailsView extends PIXI.Container {
  constructor() {
    super();
    this.bg = new PIXI.Graphics();
    this.bg.rect(2, 2, 248, 78);
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
    this.statusTextField.y = 10;
    this.addChild(this.statusTextField);

    this.statusProgressBar = new ProgressBar();
    this.addChild(this.statusProgressBar);
    this.statusProgressBar.x = 10;
    this.statusProgressBar.y = 65;
    this.statusProgressBar.controlWidth = 230;
    this.statusProgressBar.colors = [0xff0000, 0xffffff, 0x8888ff];
  }

  update(simulation) {

    let totalCars = 0
    let crashedCars = 0
    let finishedCars = 0
    for (const car of simulation.cars) {
      totalCars++;
      if(car.isCrashed) crashedCars++;
      if(car.isFinished) finishedCars++;
    }

    this.statusProgressBar.max = totalCars;
    this.statusProgressBar.values = [
      crashedCars, 
      totalCars - crashedCars - finishedCars, 
      finishedCars
    ];

    this.statusTextField.text = "Epoch: " + simulation.epoch + "\n" +
        "Track: " + simulation.track.name + "\n" +
        "Size: ✕ " + crashedCars + ", ▶ " + (totalCars - crashedCars - finishedCars) + ", ✓ " + finishedCars + " (" + totalCars + ")"
  }
  
}

export default GenerationDetailsView;