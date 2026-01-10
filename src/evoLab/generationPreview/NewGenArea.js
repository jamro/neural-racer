import * as PIXI from 'pixi.js';

const MAIN_COLOR = 0x333333;
const LABEL_STYLE = {
  fontFamily: 'Exo2',
  fontSize: 10,
  fill: 0x666666,
  lineHeight: 16,
  align: 'center',
};

class NewGenArea extends PIXI.Container {
  constructor(width, height) {
    super();

    const label = new PIXI.Text();
    label.text = "NEXT GENERATION";
    label.style = LABEL_STYLE;
    label.x = width/2;
    label.y = -height/2;
    label.anchor.set(0.5, 0.5);
    this.addChild(label);

    this.canvas = new PIXI.Graphics();
    this.addChild(this.canvas);


    this.canvas.moveTo(0, -height/2);
    this.canvas.lineTo(label.x - 10 - label.width/2, -height/2);
    this.canvas.moveTo(label.x + 10 + label.width/2, -height/2);
    this.canvas.lineTo(width,-height/2);
    this.canvas.moveTo(0, height/2);
    this.canvas.lineTo(width,height/2);
    
    this.canvas.stroke({ color: MAIN_COLOR, width: 1.3 });


  }
}

export default NewGenArea;