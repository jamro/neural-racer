import * as PIXI from 'pixi.js';
import Button from './Button';

class TextButton extends Button {
  constructor(text = '', sidePadding = 20, toggleMode = false, inverted = false) {
    const label = new PIXI.Text()
    label.style = {
      fontFamily: 'Exo2',
      fontSize: 12,
      fill: 0xffffff,
    };
    label.text = text;
    label.anchor.set(0.5, 0.45);
    super(label.width + sidePadding * 2, label, toggleMode, inverted);
    this.label = label;
  }
}

export default TextButton;