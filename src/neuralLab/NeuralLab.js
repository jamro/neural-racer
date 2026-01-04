import * as PIXI from 'pixi.js';
import RichNetworkPreview from '../ui/RichNetworkPreview';
import Slider from '../ui/Slider';

const INPUT_LABELS = [
  "Beam #1 [m]",
  "Beam #2 [m]",
  "Beam #3 [m]",
  "Beam #4 [m]",
  "Beam #5 [m]",
  "Beam #6 [m]",
  "Beam #7 [m]",
  "Beam #8 [m]",
  "Beam #9 [m]",
  "Steering Wheel",
  "Gas Pedal",
  "Yaw Rate",
  "Slip Ratio",
  "Speed",
]

const INPUT_RANGES = [
  [0, 100],
  [0, 100],
  [0, 100],
  [0, 100],
  [0, 100],
  [0, 100],
  [0, 100],
  [0, 100],
  [0, 100],
  [-1, 1],
  [-1, 1],
  [-4, 4],
  [-1.5, 1.5],
  [0, 200],
]

const INPUT_DEFAULTS = [
  100, 
  100,
  100,
  100,
  100,
  100,
  100,
  100,
  100,
  0,
  0.2,
  0,
  0,
  60
]

class NeuralLab extends PIXI.Container {
  constructor(car) {
    super();
    this.car = car;

    this.background = new PIXI.Graphics();
    this.addChild(this.background);

    this.inputs =  Array(INPUT_LABELS.length).fill(0)
    this.networkPreview = new RichNetworkPreview();
    this.addChild(this.networkPreview);
    this.runNetwork()

    for (let i = 0; i < INPUT_LABELS.length; i++) {
      const slider = new Slider();
      this.addChild(slider);
      slider.x = i % 2 === 0 ? 100 : 400;
      slider.y = 300 + Math.floor(i/2) * 40;
      slider.min = INPUT_RANGES[i][0];
      slider.max = INPUT_RANGES[i][1];
      slider.value = INPUT_DEFAULTS[i];
      slider.label = INPUT_LABELS[i];
      slider.on('change', (value) => {
        this.inputs[i] = value;
        this.runNetwork();
      });
    }
  }

  scaleView(width, height) {
    this.background.clear();
    this.background.rect(0, 0, width, height);
    this.background.fill({ color: 0x000000 });
  }

  runNetwork() {
    const inputs = this.car.inputsNormalizer.normalize(
      this.inputs.slice(0, 9),
      this.inputs[13],
      this.inputs[9],
      this.inputs[10],
      this.inputs[11],
      this.inputs[12]/3.6
    )
    this.car.neuralNet.forward(inputs);
  }

  redrawNetworkPreview() {
    this.networkPreview.renderView(
      this.car.neuralNet, 
      this.car.neuralNet.genome, 
      this.car.neuralNet.getLastActivations()
    );
  }

  startRenderLoop() {
    this.renderLoop = () => {
      this.redrawNetworkPreview()
    }
    PIXI.Ticker.shared.add(this.renderLoop);
  }

  stopRenderLoop() {
    PIXI.Ticker.shared.remove(this.renderLoop);
  }
}

export default NeuralLab;