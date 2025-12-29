import * as PIXI from 'pixi.js';
import ProgressBar from '../ui/ProgressBar';

class CarDetailsView extends PIXI.Container {

  constructor() {
    super();
    this.car = null
    this.bg = new PIXI.Graphics();
    this.bg.rect(2, 2, 248, 333);
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

  renderView(delta) {
    if (!this.car) return;

    const scoreComponents = this.car.calculateScoreComponents();
    const scoreValues = Object.values(scoreComponents);
    const scoreTotal = scoreValues.reduce((a, b) => a + b, 0);
    this.scoreProgressBar.values = scoreValues;
    this.scoreProgressBar.max = scoreTotal;

    let neuralNetStatsText = ""
    const neuralNetStats = this.car.neuralNet.getStats();
    const neuralNetOutputStats = neuralNetStats.params[neuralNetStats.params.length - 1];

    let negativeDominanceSum = 0;
    let reluLayerCount = 0;

    for (const layerParamStats of neuralNetStats.params) {
      neuralNetStatsText += "#" + layerParamStats.layer + ": " +
        "𝑾 " + layerParamStats.weights.mean.toFixed(1).padStart(4) + " ±" + layerParamStats.weights.std.toFixed(1).padStart(4) + "  " +
        "𝑩 " + layerParamStats.biases.mean.toFixed(1).padStart(4) + " ±" + layerParamStats.biases.std.toFixed(1).padStart(4) + "\n";

      if (layerParamStats.activation === "leaky_relu") {
        reluLayerCount++;
        negativeDominanceSum += layerParamStats.negativeDominanceRate.mean;
      }
    }

    const negativeDominance = negativeDominanceSum / reluLayerCount

    neuralNetStatsText += "Output Sat: " + (100*neuralNetOutputStats.saturation.mean).toFixed(4) + " ±" + (100*neuralNetOutputStats.saturation.std).toFixed(4) + "%\n";
    neuralNetStatsText += "Neg. Domin.: " + (100*negativeDominance).toFixed(2) + "%\n";

    this.statusTextField.text = "SCORE: " + (this.car.calculateScore()).toFixed(2) + "\n\n" +
        "Distance: " + (100*this.car.calculateCheckpointProgress()).toFixed(1) + "%\n" +
        "Speed: " + (this.car.speed*3.6).toFixed(1) + " km/h\n\n" +
        "Throttle: " + (100*this.car.throttleValue).toFixed(1) + "%\n" +
        "Brake: " + (100*this.car.brakeValue).toFixed(1) + "%\n" +
        "Turn: " + (100*this.car.turnValue).toFixed(1) + "%\n\n" +
        "Neural Net:\n" + neuralNetStatsText + "\n" +
        "DEBUG:\n" + (this.car.debug || '-none-') + "\n";
  }

}

export default CarDetailsView;