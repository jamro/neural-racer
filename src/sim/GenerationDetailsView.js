import * as PIXI from 'pixi.js';

class GenerationDetailsView extends PIXI.Container {
  constructor() {
    super();
    this.generation = null
    this.bg = new PIXI.Graphics();
    this.bg.rect(2, 2, 198, 98);
    this.bg.fill({
      color: 0x000000,
      alpha: 0.8
    });
    this.addChild(this.bg);

    this.statusTextField = new PIXI.Text();
    this.statusTextField.style = { 
      fontFamily: 'Courier New',
      fontSize: 12, 
      lineHeight: 16,
      fill: 0xffffff 
    };
    this.statusTextField.x = 10;
    this.statusTextField.y = 10;
    this.addChild(this.statusTextField);
  }

  render() {
    if (!this.generation) return;
    this.statusTextField.text = "Epoch: " + this.generation.epoch + "\n" +
        "Size: " + this.generation.activeCount + " / " + this.generation.totalCount + "\n"
  }
  
}

export default GenerationDetailsView;