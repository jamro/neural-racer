import * as PIXI from 'pixi.js';
import { getButtonBgOffMiddleTexture, getButtonBgOffSideTexture, getButtonBgOnMiddleTexture, getButtonBgOnSideTexture } from '../../loaders/AssetLoader';

class Button extends PIXI.Container {
  constructor(width = 30, content = null, toggleMode = false, inverted = false) {
    super();

    this._inverted = inverted;
    this._content = content;

    this._buttonWidth = width;

    this._toggleMode = toggleMode;
    this._value = false;
    
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

    this.bgRightOff.y = -8;
    this.bgRightOn.y = -8;
    this.bgRightOff.scale.x = -1;
    this.bgRightOn.scale.x = -1;

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


    this._enabled = true;

    this.refreshAppearance();
  }


  get enabled() {
    return this._enabled;
  }

  set enabled(enabled) {
    this._enabled = enabled;
    this.interactive = enabled;
    this.cursor = enabled ? 'pointer' : 'default';
    this.refreshAppearance();
  }

  get buttonWidth() {
    return this._buttonWidth;
  }

  set buttonWidth(width) {
    this._buttonWidth = width;
    this.refreshAppearance();
  }

  get buttonHeight() {
    return 20
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
    this.bgMiddleOff.visible = this._inverted;
    this.bgMiddleOn.visible = !this._inverted;
    this.bgLeftOff.visible = this._inverted;
    this.bgLeftOn.visible = !this._inverted;
    this.bgRightOff.visible = this._inverted;
    this.bgRightOn.visible = !this._inverted;
  }

  onPointerUp() {
    if(this.toggleMode) {
      this.value = !this.value;
      this.emit('change', this.value);
    }
    this.refreshAppearance();
  }

  refreshAppearance() {
    if(this._value === false) {
      this.bgMiddleOff.visible = !this._inverted;
      this.bgMiddleOn.visible = this._inverted;
      this.bgLeftOff.visible = !this._inverted;
      this.bgLeftOn.visible = this._inverted;
      this.bgRightOff.visible = !this._inverted;
      this.bgRightOn.visible = this._inverted;
      if(this._content !== null) {
        this._content.alpha = 0.7;
      }
    } else {
      this.bgMiddleOff.visible = this._inverted;
      this.bgMiddleOn.visible = !this._inverted;
      this.bgLeftOff.visible = this._inverted;
      this.bgLeftOn.visible = !this._inverted;
      this.bgRightOff.visible = this._inverted;
      this.bgRightOn.visible = !this._inverted;
      if(this._content !== null) {
        this._content.alpha = 1;
      }
    }
    this.bgRightOff.x = this.buttonWidth -7 + 15;
    this.bgRightOn.x = this.buttonWidth-7 + 15;
    this.bgMiddleOff.width = this.buttonWidth - 14;
    this.bgMiddleOn.width = this.buttonWidth - 14;
    if(this._content !== null) {
      this._content.x = this.buttonWidth / 2;
    }
    this.alpha = this._enabled ? 1 : 0.5;
  }

  onPointerUpOutside() {
    this.bgMiddleOff.visible = !this._inverted;
    this.bgMiddleOn.visible = this._inverted;
    this.bgLeftOff.visible = !this._inverted;
    this.bgLeftOn.visible = this._inverted;
    this.bgRightOff.visible = !this._inverted;
    this.bgRightOn.visible = this._inverted;
  }
}

export default Button;
