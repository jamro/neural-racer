import * as PIXI from 'pixi.js';
import RichNetworkPreview from '../ui/RichNetworkPreview';
import Slider from '../ui/Slider';

const INPUT_LABELS = [
  "Beam #1",
  "Beam #2",
  "Beam #3",
  "Beam #4",
  "Beam #5",
  "Beam #6",
  "Beam #7",
  "Beam #8",
  "Beam #9",
  "TTC Long",
  "TTC Short",
  "Left Right Balance",
  "Safe Direction",
  "Steering Wheel",
  "Gas Pedal",
  "Yaw Rate",
  "Slip Ratio",
  "Speed",
]

const INPUT_RANGES = [
  [0, 1],
  [0, 1],
  [0, 1],
  [0, 1],
  [0, 1],
  [0, 1],
  [0, 1],
  [0, 1],
  [0, 1],
  [0, 1],
  [0, 1],
  [-1, 1],
  [-1, 1],
  [-1, 1],
  [0, 1],
  [-1, 1],
  [-1, 1],
  [0, 1],
]

class NeuralLab extends PIXI.Container {
  constructor(neuralNet) {
    super();
    this.neuralNet = neuralNet;

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
      slider.value = 0;
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
    this.neuralNet.forward(this.inputs);
  }

  redrawNetworkPreview() {
    this.networkPreview.renderView(this.neuralNet, this.neuralNet.genome, this.neuralNet.getLastActivations());
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