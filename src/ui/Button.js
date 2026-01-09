import * as PIXI from 'pixi.js';
import { getButtonBgOffMiddleTexture, getButtonBgOffSideTexture, getButtonBgOnMiddleTexture, getButtonBgOnSideTexture } from '../loaders/AssetLoader';

class Button extends PIXI.Container {
  constructor(width = 30, content = null, toggleMode = false) {
    super();

    this._content = content;

    this._buttonWidth = width;

    this._toggleMode = toggleMode;
    this._value = 0;
    
    this.bgMiddleOff = new PIXI.Sprite(getButtonBgOffMiddleTexture());
    this.bgMiddleOn = new PIXI.Sprite(getButtonBgOnMiddleTexture());
    this.bgLeftOff = new PIXI.Sprite(getButtonBgOffSideTexture());
    this.bgLeftOn = new PIXI.Sprite(getButtonBgOnSideTexture());
    this.bgRightOff = new PIXI.Sprite(getButtonBgOffSideTexture());
    this.bgRightOn = new PIXI.Sprite(getButtonBgOnSideTexture());

    this.bgLeftOff.x = -8;
    this.bgLeftOn.x = -8;
    this.bgLeftOff.y = -8;
    this.bgLeftOn.y = -8;

    this.bgRightOff.x = width-7 + 15;
    this.bgRightOn.x = width-7 + 15;
    this.bgRightOff.y = -8;
    this.bgRightOn.y = -8;
    this.bgRightOff.scale.x = -1;
    this.bgRightOn.scale.x = -1;

    this.bgMiddleOff.width = width - 14;
    this.bgMiddleOn.width = width - 14;
    this.bgMiddleOff.x = 7;
    this.bgMiddleOff.y = -8;
    this.bgMiddleOn.y = -8;
    this.bgMiddleOn.x = 7;
    this.addChild(this.bgMiddleOff);
    this.addChild(this.bgMiddleOn);
    this.addChild(this.bgLeftOff);
    this.addChild(this.bgLeftOn);
    this.addChild(this.bgRightOff);
    this.addChild(this.bgRightOn);
    this.bgMiddleOff.visible = true;
    this.bgMiddleOn.visible = false;
    this.bgLeftOff.visible = true;
    this.bgLeftOn.visible = false;
    this.bgRightOff.visible = true;
    this.bgRightOn.visible = false;

    if(content !== null) {
      content.x = this._buttonWidth / 2;
      content.y = 10
      this.addChild(content);
    }

    this.interactive = true;
    this.cursor = 'pointer';
    this.on('pointerdown', this.onPointerDown, this);
    this.on('pointerup', this.onPointerUp, this);
    this.on('pointerupoutside', this.onPointerUpOutside, this);
  }

  get buttonWidth() {
    return this._buttonWidth;
  }

  get value() {
    return this._value;
  }

  set value(value) {
    this._value = value;
    this.refreshAppearance();
  }

  get toggleMode() {
    return this._toggleMode;
  }

  set toggleMode(toggleMode) {
    this._toggleMode = toggleMode;
    this.refreshAppearance();
  }



  onPointerDown() {
    this.bgMiddleOff.visible = false;
    this.bgMiddleOn.visible = true;
    this.bgLeftOff.visible = false;
    this.bgLeftOn.visible = true;
    this.bgRightOff.visible = false;
    this.bgRightOn.visible = true;
  }

  onPointerUp() {
    if(this.toggleMode) {
      this.value = !this.value;
    }
    this.refreshAppearance();
  }

  refreshAppearance() {
    if(this.value == 0) {
      this.bgMiddleOff.visible = true;
      this.bgMiddleOn.visible = false;
      this.bgLeftOff.visible = true;
      this.bgLeftOn.visible = false;
      this.bgRightOff.visible = true;
      this.bgRightOn.visible = false;
      if(this._content !== null) {
        this._content.alpha = 0.7;
      }
    } else {
      this.bgMiddleOff.visible = false;
      this.bgMiddleOn.visible = true;
      this.bgLeftOff.visible = false;
      this.bgLeftOn.visible = true;
      this.bgRightOff.visible = false;
      this.bgRightOn.visible = true;
      if(this._content !== null) {
        this._content.alpha = 1;
      }
    }
  }

  onPointerUpOutside() {
    this.bgMiddleOff.visible = true;
    this.bgMiddleOn.visible = false;
    this.bgLeftOff.visible = true;
    this.bgLeftOn.visible = false;
    this.bgRightOff.visible = true;
    this.bgRightOn.visible = false;
  }
}

export default Button;