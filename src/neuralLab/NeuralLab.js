import * as PIXI from 'pixi.js';
import RichNetworkPreview from '../ui/RichNetworkPreview';
import Slider from '../ui/Slider';
import RadarBeamSlider from '../ui/RadarBeamSlider';

const INPUT_LABELS = [
  "Steering Wheel",
  "Gas Pedal",
  "Yaw Rate",
  "Slip Ratio",
  "Speed",
]

const INPUT_RANGES = [
  [-1, 1],
  [-1, 1],
  [-4, 4],
  [-1.5, 1.5],
  [0, 200],
]

const INPUT_DEFAULTS = [
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

    this.radarBeamSlider = new RadarBeamSlider(this.car.radarBeamAngles);
    this.addChild(this.radarBeamSlider);
    this.radarBeamSlider.x = 400;
    this.radarBeamSlider.y = 500;
    this.radarBeamSlider.on('change', (value) => {
      for (let i = 0; i < 9; i++) {
        this.inputs[i] = value[i];
      }
      this.runNetwork();
    });

    this.inputs =  Array(INPUT_LABELS.length+9).fill(0)
    for (let i = 0; i < 9; i++) {
      const beamValues = this.radarBeamSlider.getValues();
      this.inputs[i] = beamValues[i];
    }
    for(let i = 0; i < INPUT_LABELS.length; i++) {
      this.inputs[i+9] = INPUT_DEFAULTS[i];
    }

    this.networkPreview = new RichNetworkPreview();
    this.addChild(this.networkPreview);
    this.runNetwork()

    for (let i = 0; i < INPUT_LABELS.length; i++) {
      const slider = new Slider();
      this.addChild(slider);
      slider.x = 700;
      slider.y = 200 + i * 45;
      slider.min = INPUT_RANGES[i][0];
      slider.max = INPUT_RANGES[i][1];
      slider.value = INPUT_DEFAULTS[i];
      slider.label = INPUT_LABELS[i];
      slider.on('change', (value) => {
        this.inputs[i+9] = value;
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
      this.inputs[13]/3.6,
      this.inputs[9],
      this.inputs[10],
      this.inputs[11],
      this.inputs[12]
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