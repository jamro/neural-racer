import * as PIXI from 'pixi.js';
import ProgressBar from '../ui/ProgressBar';

class CarDetailsView extends PIXI.Container {

  constructor() {
    super();
    this.bg = new PIXI.Graphics();
    this.bg.rect(2, 2, 248, 158);
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
  }

  update(car) {
    if(!car) return;
    this.statusTextField.text = "Distance: " + (100*car.checkpointsProgress).toFixed(1) + "%\n" +
        "Speed: " + (car.model.speed*3.6).toFixed(1) + " km/h\n\n" +
        "Throttle: " + (100*car.model.throttleValue).toFixed(1) + "%\n" +
        "Brake: " + (100*car.model.brakeValue).toFixed(1) + "%\n" +
        "Turn: " + (100*car.model.turnValue).toFixed(1) + "%\n\n" +
        "DEBUG:\n" + (car.debug || '-none-') + "\n";
  }

}

export default CarDetailsView;