import { Container } from 'pixi.js';

class ToggleButtonGroup extends Container {
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
    // PixiJS v8: 'click' is mouse-oriented; use pointertap for touch + mouse
    button.on('pointertap', () => {
      this.value = value
      this.emit('valueChanged', value);
    });
    this._nextButtonX += button.buttonWidth + this._spacing;
    this.refreshAppearance();
  }

  refreshAppearance() {
    for(let i = 0; i < this._buttons.length; i++) {
      if(this._values[i] == this.value) {
        this._buttons[i].value = true;
      } else {
        this._buttons[i].value = false;
      }
    }
  }
}

export default ToggleButtonGroup;
