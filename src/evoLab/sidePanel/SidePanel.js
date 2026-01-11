import * as PIXI from 'pixi.js';
import { getUiFrameHorizontalLineTexture } from '../../loaders/AssetLoader';

class SidePanel extends PIXI.Container {
  constructor() {
    super();
    this.background = new PIXI.Graphics();
    this.addChild(this.background);

    this.edge = new PIXI.Sprite(getUiFrameHorizontalLineTexture());
    this.addChild(this.edge);
    this.edge.anchor.set(1, 1);
    this.edge.rotation = -Math.PI/2;

    this._contentBoundaries = {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    }
    this.masterContainer = new PIXI.Container();
    this.addChild(this.masterContainer);
  }

  scaleView(width, height) {
    this.background.clear();
    this.background.rect(0, 0, width, height);
    this.background.fill({ color: 0x000000, alpha: 0.5 });
    this.edge.width = height

    const scaleX = width / this._contentBoundaries.width;
    const scaleY = height / this._contentBoundaries.height;
    const scale = Math.min(scaleX, scaleY);
    this.masterContainer.scale.set(scale);
    this.masterContainer.x = width/2 - this._contentBoundaries.width * scale / 2 - this._contentBoundaries.x * scale;
    this.masterContainer.y = height/2 - this._contentBoundaries.height * scale / 2 - this._contentBoundaries.y * scale;

  }
}

export default SidePanel;