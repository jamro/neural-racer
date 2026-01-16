import TextButton from '../common/TextButton';
import {
  getUiEvoAutoTexture,
} from '../../loaders/Assets';
import { Sprite } from 'pixi.js';

class AutoPlayButton extends TextButton {
  constructor() {
    super('Auto Play', 30, false, true);

    this.autoIcon = new Sprite(getUiEvoAutoTexture());
    this.autoIcon.anchor.set(0.5, 0.5);
    this.autoIcon.scale.set(0.2);
    this.autoIcon.y = this.buttonHeight / 2;
    this.autoIcon.x = 12;
    this.addChild(this.autoIcon);
  }
}

export default AutoPlayButton;
