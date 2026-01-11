import * as PIXI from 'pixi.js';

class SidePanelController extends PIXI.Container {
  constructor() {
    super();
    this.currentPanel = null;
    this.viewWidth = 100;
    this.viewHeight = 100;
  }

  showPanel(panelClass, props = {}) {
    if(this.currentPanel) {
      this.removeChild(this.currentPanel);
      this.currentPanel.destroy({children: true, texture: false, baseTexture: false});
      this.currentPanel = null;
    }
    this.currentPanel = new panelClass(props);
    this.addChild(this.currentPanel);
    this.currentPanel.scaleView(this.viewWidth, this.viewHeight);
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