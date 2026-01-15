import { Container, Graphics, Text } from 'pixi.js';

class ProgressBar extends Container {
  constructor() {
    super();
    this._controlWidth = 200;
    this.bg = new Graphics();
    this.addChild(this.bg);

    this._colors = [0xffffff, 0xff0000, 0x6666ff, 0xffff00];

    this._max = 100;
    this._values = [0];

    this.labelTextField = new Text();
    this.labelTextField.style = {
      fontFamily: 'Courier New',
      fontSize: 12,
      lineHeight: 16,
      fill: 0xffffff,
    };
    this.addChild(this.labelTextField);
    this.labelTextField.text = "";

    this.valueTextField = new Text();
    this.valueTextField.style = {
      fontFamily: 'Courier New',
      fontSize: 12,
      lineHeight: 16,
      align: 'right',
      fill: 0xffffff,
    };
    this.addChild(this.valueTextField);
    this.valueTextField.text = "";

    this.redraw();
  }

  get colors() {
    return this._color;
  }

  set colors(colors) {
    this._colors = colors;
    this.redraw();
  }

  get max() {
    return this._max;
  }

  set max(max) {
    this._max = max;
    this.redraw();
  }

  get values() {
    return this._values;
  }

  set values(values) {
    this._values = values;
    this.redraw();
  }
  get label() {
    return this.labelTextField.text;
  }

  set label(label) {
    this.labelTextField.text = label;
    this.redraw();
  }

  get valueText() {
    return this.valueTextField.text;
  }

  set valueText(value) {
    this.valueTextField.text = value;
    this.redraw();
  }

  get controlWidth() {
    return this._controlWidth;
  }

  set controlWidth(width) {
    this._controlWidth = width;
    this.redraw();
  }

  redraw() {
    this.bg.clear();
    this.bg.rect(0, 0, this._controlWidth, 2);
    this.bg.fill(0x333333); // background color

    let xOffset = 0;
    for (let index = 0; index < this._values.length; index++) {
      const value = this._values[index];
      this.bg.rect(xOffset, 0, Math.min(this._controlWidth - xOffset, this._controlWidth * value / this._max), 2);
      this.bg.fill(this._colors[index]); // background color
      xOffset += this._controlWidth * value / this._max;
    }

    this.valueTextField.x = this._controlWidth - this.valueTextField.width;
    if (!this.labelTextField.text && !this.valueTextField.text) {
      this.bg.y = 0;
    } else {
      this.bg.y = 16;
    }
  }
}

export default ProgressBar;
