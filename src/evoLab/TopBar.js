import * as PIXI from 'pixi.js';
import { getUiFrameHorizontalLineTexture } from '../loaders/AssetLoader';


class TopBar extends PIXI.Container {
  constructor() {
    super();

    this.background = new PIXI.Graphics();
    this.addChild(this.background);

    this.edge = new PIXI.Sprite(getUiFrameHorizontalLineTexture());
    this.addChild(this.edge);

    this.title = new PIXI.Text()
    this.title.text = "NEURAL EVOLUTION";
    this.title.style = {
      fontFamily: 'Exo2',
      fontSize: 32,
      fill: 0xffffff,
      lineHeight: 16,
      align: 'center',
    };
    this.addChild(this.title);
    this.title.anchor.set(0.5, 0.5);

    this.subtitle = new PIXI.Text()
    this.subtitle.text = "GENERATION #? TO #?";
    this.subtitle.style = {
      fontFamily: 'Exo2',
      fontSize: 12,
      fill: 0x888888,
      lineHeight: 16,
      align: 'center',
    };
    this.addChild(this.subtitle);
    this.subtitle.anchor.set(0.5, 0.5);

    this._epoch = null
    this.epoch = 1;
  }

  set epoch(epoch) {
    this._epoch = epoch;
    this.subtitle.text = `GENERATION #${this._epoch} TO #${this._epoch + 1}`;
  }

  get epoch() {
    return this._epoch;
  }

  scaleView(width, height) {

    this.background.clear();
    this.background.rect(0, 0, width, height);
    this.background.fill({ color: 0x000000, alpha: 0.8 });

    this.edge.x = width;
    this.edge.anchor.set(0, 1);
    this.edge.rotation = Math.PI;
    this.edge.y = height;
    this.edge.width = width;

    this.title.x = width/2;
    this.title.y = height/2-10;
    this.subtitle.x = width/2;
    this.subtitle.y = height/2+20;

  }
}

export default TopBar;