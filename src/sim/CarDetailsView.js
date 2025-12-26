import * as PIXI from 'pixi.js';
import ProgressBar from '../ui/ProgressBar';

class CarDetailsView extends PIXI.Container {

  constructor() {
    super();
    this.car = null
    this.bg = new PIXI.Graphics();
    this.bg.rect(2, 2, 248, 233);
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
    this.statusTextField.y = 35;
    this.addChild(this.statusTextField);

    this.scoreProgressBar = new ProgressBar();
    this.scoreProgressBar.x = 10;
    this.scoreProgressBar.y = 5;
    this.scoreProgressBar.controlWidth = 230;
    this.scoreProgressBar.label = "Score Sources:";
    this.scoreProgressBar.max = 100;
    this.scoreProgressBar.values = [20, 10, 20, 100];
    this.addChild(this.scoreProgressBar);
  }

  render() {
    if (!this.car) return;

    const scoreComponents = this.car.calculateScoreComponents();
    const scoreValues = Object.values(scoreComponents);
    const scoreTotal = scoreValues.reduce((a, b) => a + b, 0);
    this.scoreProgressBar.values = scoreValues;
    this.scoreProgressBar.max = scoreTotal;

    this.statusTextField.text = "SCORE: " + (this.car.calculateScore()).toFixed(2) + "\n\n" +
        "Distance: " + (100*this.car.calculateCheckpointProgress()).toFixed(1) + "%\n" +
        "Speed: " + (this.car.speed*3.6).toFixed(1) + " km/h\n\n" +
        "Throttle: " + (100*this.car.throttleValue).toFixed(1) + "%\n" +
        "Brake: " + (100*this.car.brakeValue).toFixed(1) + "%\n" +
        "Turn: " + (100*this.car.turnValue).toFixed(1) + "%\n\n" +
        "DEBUG:\n" + (this.car.debug || '-none-') + "\n";
  }

}

export default CarDetailsView;