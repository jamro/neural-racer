import * as PIXI from 'pixi.js';

class ToggleButtonGroup extends PIXI.Container {
  constructor(spacing = 5) {
    super();
    
    this._spacing = spacing;
    this._buttons = [];
    this._nextButtonX = 0;
    this._values = []
    this._value = null
  }

  get value() {
    return this._value;
  }
  set value(value) {
    this._value = value;
    this.refreshAppearance();
  }

  addButton(button, value) {
    if(this._value === null) {
      this._value = value;
    }
    this._values.push(value);
    this.addChild(button);
    this._buttons.push(button);
    button.x = this._nextButtonX;
    button.toggleMode = true;
    button.on('click', () => {
      this.value = value
      this.emit('valueChanged', value);
    });
    this._nextButtonX += button.buttonWidth + this._spacing;
    this.refreshAppearance();
  }

  refreshAppearance() {
    for(let i = 0; i < this._buttons.length; i++) {
      if(this._values[i] == this.value) {
        this._buttons[i].value = 1;
      } else {
        this._buttons[i].value = 0;
      }
    }
  }
}

export default ToggleButtonGroup;