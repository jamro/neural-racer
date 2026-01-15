import ToggleButtonGroup from '../../common/ToggleButtonGroup';
import Button from '../../common/Button';
import { Sprite } from 'pixi.js';
import { getUiSpeedSlowTexture, getUiSpeedNormalTexture, getUiSpeedFastTexture, getUiSpeedSuperFastTexture } from '../../../loaders/AssetLoader';

class SpeedSelector extends ToggleButtonGroup {
  constructor() {
    super();
    const slowGraphic = new Sprite(getUiSpeedSlowTexture());
    const normalGraphic = new Sprite(getUiSpeedNormalTexture());
    const fastGraphic = new Sprite(getUiSpeedFastTexture());
    const superFastGraphic = new Sprite(getUiSpeedSuperFastTexture());
    slowGraphic.anchor.set(0.5, 0.45);
    normalGraphic.anchor.set(0.5, 0.45);
    fastGraphic.anchor.set(0.5, 0.45);
    superFastGraphic.anchor.set(0.5, 0.4);  

    slowGraphic.scale.set(0.45);
    normalGraphic.scale.set(0.45);
    fastGraphic.scale.set(0.45);
    superFastGraphic.scale.set(0.45);

    this.addButton(new Button(34, slowGraphic),  0.5);
    this.addButton(new Button(34, normalGraphic), 1);
    this.addButton(new Button(34, fastGraphic), 2);
    this.addButton(new Button(34, superFastGraphic), 20);
  }
}

export default SpeedSelector;