import * as PIXI from 'pixi.js';
import RichNetworkPreview from '../ui/RichNetworkPreview';
import InputController from './InputController';


const WIDGETS_V_PADDING = 25;

class NeuralLab extends PIXI.Container {
  constructor(car) {
    super();
    this.car = car;

    this.background = new PIXI.Graphics();
    this.addChild(this.background);

    this.masterContainer = new PIXI.Container();
    this.addChild(this.masterContainer);

    this.inputController = new InputController(this.car.radarBeamAngles);
    this.masterContainer.addChild(this.inputController);
    this.inputController.on('change', () => {
      this.runNetwork();
    });

    this.networkPreview = new RichNetworkPreview();
    this.masterContainer.addChild(this.networkPreview);

    this.networkPreview.y = WIDGETS_V_PADDING;
    this.inputController.y = this.networkPreview.canvasHeight + 2*WIDGETS_V_PADDING;
    if(this.inputController.canvasWidth > this.networkPreview.canvasWidth) {
      this.networkPreview.x = (this.inputController.canvasWidth - this.networkPreview.canvasWidth) / 2;
    } else {
      this.inputController.x = (this.networkPreview.canvasWidth - this.inputController.canvasWidth) / 2;
    }


    this.runNetwork()
  }

  scaleView(width, height) {
    this.background.clear();
    this.background.rect(0, 0, width, height);
    this.background.fill({ color: 0x000000 });

    const masterCanvasWidth = Math.max(this.inputController.canvasWidth, this.networkPreview.canvasWidth);
    const masterCanvasHeight = this.inputController.canvasHeight + this.networkPreview.canvasHeight + 3*WIDGETS_V_PADDING;

    const scaleW = width / masterCanvasWidth;
    const scaleH = height / masterCanvasHeight;
    const scale = Math.min(scaleW, scaleH);
    this.masterContainer.scale.set(scale, scale);
    this.masterContainer.x = (width - masterCanvasWidth * scale) / 2;
    this.masterContainer.y = (height - masterCanvasHeight * scale) / 2;
  }

  runNetwork() {
    const inputValues = this.inputController.getInputValues();
    const inputs = this.car.inputsNormalizer.normalize(
      inputValues.radarBeamValues,
      inputValues.speed,
      inputValues.turn,
      inputValues.throttle,
      inputValues.yawRate,
      inputValues.slipRatio,
      true
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