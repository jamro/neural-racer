import { Container, Graphics, Rectangle, Text, Ticker } from 'pixi.js';
import RichNetworkPreview from '../common/RichNetworkPreview';
import InputController from './InputController';
import NeuralCarObject from '../../engine/simulation/car/NeuralCarObject';

const WIDGETS_V_PADDING = 25;

class NeuralLab extends Container {
  constructor(genome) {
    super();
    this.car = new NeuralCarObject(genome);

    this.background = new Graphics();
    this.addChild(this.background);

    this.masterContainer = new Container();
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

    this.closeButton = new Container();
    this.closeButton.eventMode = 'static';
    this.closeButton.interactive = true; // legacy
    this.closeButton.cursor = 'pointer';
    this.closeButton.on('pointertap', () => {
      this.stopRenderLoop();
      if(this.parent) {
        this.parent.removeChild(this);
      }
    });
    const cross = new Graphics();
    cross.rect(-80, -15, 100, 30);
    cross.fill({ color: 0, alpha: 0 });
    // Ensure the close button is tappable even though it is transparent
    this.closeButton.hitArea = new Rectangle(-80, -15, 100, 30);
    cross.moveTo(-10, -10);
    cross.lineTo(10, 10);
    cross.moveTo(10, -10);
    cross.lineTo(-10, 10);
    cross.stroke({ color: 0xffffff });
    this.closeButton.addChild(cross);
    this.addChild(this.closeButton);
    const closeLabel = new Text()
    closeLabel.style = {
      fontFamily: 'Exo2',
      fontSize: 16,
      fill: 0xffffff,
    }
    closeLabel.text = 'CLOSE';
    closeLabel.x = -20;
    closeLabel.anchor.set(1, 0.5)
    this.closeButton.addChild(closeLabel);


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

    this.closeButton.x = width - 20;
    this.closeButton.y = 20;
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
    Ticker.shared.add(this.renderLoop);
  }

  stopRenderLoop() {
    Ticker.shared.remove(this.renderLoop);
  }
}

export default NeuralLab;