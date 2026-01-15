import { Container } from 'pixi.js';

class SidePanelController extends Container {
  constructor() {
    super();
    this.currentPanel = null;
    this.viewWidth = 100;
    this.viewHeight = 100;
  }

  showPanel(panelClass, props = {}) {
    if(this.currentPanel) {
      this.currentPanel.off("neuralTest", this.onNeuralTest);
      this.currentPanel.off("testDrive", this.onTestDrive);
      this.removeChild(this.currentPanel);
      // Pixi v8: ensure GraphicsContext is destroyed (prevents _gpuContextHash growth)
      this.currentPanel.destroy({children: true, texture: false, baseTexture: false, context: true});
      this.currentPanel = null;
    }
    this.currentPanel = new panelClass(props);
    this.addChild(this.currentPanel);
    this.currentPanel.scaleView(this.viewWidth, this.viewHeight);
    this.currentPanel.on("neuralTest", (...args) => this.onNeuralTest(...args));
    this.currentPanel.on("testDrive", (...args) => this.onTestDrive(...args));
  }

  onNeuralTest(...args) {
    this.emit("neuralTest", ...args);
  }
  onTestDrive(...args) {
    this.emit("testDrive", ...args);
  }

  scaleView(width, height) {
    this.viewWidth = width;
    this.viewHeight = height;
    if(this.currentPanel) {
      this.currentPanel.scaleView(this.viewWidth, this.viewHeight);
    }
  }
}

export default SidePanelController;