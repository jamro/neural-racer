import ToggleButtonGroup from './ToggleButtonGroup';
import Button from './Button';
import * as PIXI from 'pixi.js';
import { getUiSpeedSlowTexture, getUiSpeedNormalTexture, getUiSpeedFastTexture, getUiSpeedSuperFastTexture } from '../loaders/AssetLoader';

class SpeedSelector extends ToggleButtonGroup {
  constructor() {
    super();
    const slowGraphic = new PIXI.Sprite(getUiSpeedSlowTexture());
    const normalGraphic = new PIXI.Sprite(getUiSpeedNormalTexture());
    const fastGraphic = new PIXI.Sprite(getUiSpeedFastTexture());
    const superFastGraphic = new PIXI.Sprite(getUiSpeedSuperFastTexture());
    slowGraphic.anchor.set(0.5, 0.45);
    normalGraphic.anchor.set(0.5, 0.45);
    fastGraphic.anchor.set(0.5, 0.45);
    superFastGraphic.anchor.set(0.5, 0.4);  

    slowGraphic.scale.set(0.45);
    normalGraphic.scale.set(0.45);
    fastGraphic.scale.set(0.45);
    superFastGraphic.scale.set(0.45);

    this.addButton(new Button(36, slowGraphic),  0.5);
    this.addButton(new Button(36, normalGraphic), 1);
    this.addButton(new Button(36, fastGraphic), 2);
    this.addButton(new Button(36, superFastGraphic), 20);
  }
}

export default SpeedSelector;