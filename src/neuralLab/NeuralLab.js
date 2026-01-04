import * as PIXI from 'pixi.js';
import RichNetworkPreview from '../ui/RichNetworkPreview';
import Slider from '../ui/Slider';
import RadarBeamSlider from '../ui/RadarBeamSlider';

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
      this.runNetwork();
    });

    this.speedSlider = new Slider({
      min: 0,
      max: 200,
      value: 60,
      label: 'Speed',
      width: 200,
      height: 20,
      rightScaleLabel: 'MAX',
      leftScaleLabel: 'STOP',
      formatter: (value) => Math.round(value) + ' km/h',
    });
    this.addChild(this.speedSlider);
    this.speedSlider.on('change', (value) => this.runNetwork());
    this.speedSlider.x = 100;
    this.speedSlider.y = 320;

    this.throttleSlider = new Slider({
      min: -1,
      max: 1,
      value: 0.5,
      label: 'Throttle',
      width: 200,
      height: 20,
      rightScaleLabel: 'Gas',
      leftScaleLabel: 'Break',
      formatter: (value) => Math.round(value * 100) + '%',
    });
    this.addChild(this.throttleSlider);
    this.throttleSlider.on('change', (value) => this.runNetwork());
    this.throttleSlider.x = 100;
    this.throttleSlider.y = 370;

    this.slipRatioSlider = new Slider({
      min: -0.5,
      max: 0.5,
      value: 0,
      label: 'Slip Ratio',
      width: 200,
      height: 20,
      rightScaleLabel: 'Left',
      leftScaleLabel: 'Right',
      formatter: (value) => Math.round(value * 200) + '%',
    });
    this.addChild(this.slipRatioSlider);
    this.slipRatioSlider.on('change', (value) => this.runNetwork());
    this.slipRatioSlider.x = 100;
    this.slipRatioSlider.y = 470;

    this.yawRateSlider = new Slider({
      min: -2,
      max: 2,
      value: 0,
      label: 'Yaw Rate',
      width: 200,
      height: 20,
      rightScaleLabel: 'CCW',
      leftScaleLabel: 'CW',
      formatter: (value) => Math.round(value * 180 / Math.PI,) + '°/s',
    });
    this.addChild(this.yawRateSlider);
    this.yawRateSlider.on('change', (value) => this.runNetwork());
    this.yawRateSlider.x = 100;
    this.yawRateSlider.y = 580;
    
    this.turnSlider = new Slider({
      min: -1,
      max: 1,
      value: 0,
      label: 'Steering Wheel',
      width: 200,
      height: 20,
      rightScaleLabel: 'Right',
      leftScaleLabel: 'Left',
    });
    this.addChild(this.turnSlider);
    this.turnSlider.on('change', (value) => this.runNetwork());
    this.turnSlider.x = 100;
    this.turnSlider.y = 630;

    this.networkPreview = new RichNetworkPreview();
    this.addChild(this.networkPreview);
    this.runNetwork()
  }

  scaleView(width, height) {
    this.background.clear();
    this.background.rect(0, 0, width, height);
    this.background.fill({ color: 0x000000 });
  }

  runNetwork() {
    const inputs = this.car.inputsNormalizer.normalize(
      this.radarBeamSlider.getValues(),
      this.speedSlider.value/3.6,
      this.turnSlider.value,
      this.throttleSlider.value,
      this.yawRateSlider.value,
      this.slipRatioSlider.value,
      true
    )

    console.log(inputs.map(input => input.toFixed(2)));

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