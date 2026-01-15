import * as PIXI from 'pixi.js';

class WinnerZone extends PIXI.Container {
  constructor(width, height) {
    super();
    this.canvas = new PIXI.Graphics();
    this.addChild(this.canvas);

    const cornerLength = 20;

    this.canvas.moveTo(-width/2, -height/2 + cornerLength);
    this.canvas.lineTo(-width/2, -height/2)
    this.canvas.lineTo(-width/2 + cornerLength, -height/2)

    this.canvas.moveTo(width/2, -height/2 + cornerLength);
    this.canvas.lineTo(width/2, -height/2)
    this.canvas.lineTo(width/2 - cornerLength, -height/2)

    this.canvas.moveTo(-width/2 + cornerLength, height/2);
    this.canvas.lineTo(-width/2, height/2)
    this.canvas.lineTo(-width/2, height/2 - cornerLength)

    this.canvas.moveTo(width/2 - cornerLength, height/2);
    this.canvas.lineTo(width/2, height/2)
    this.canvas.lineTo(width/2, height/2 - cornerLength)
    
    this.canvas.stroke({ color: 0x333333, width: 1.3 });


    const label = new PIXI.Text();
    label.text = "WINNER ZONE";
    label.style = { fontFamily: 'Exo2', fontSize: 10, fill: 0x666666 };
    label.x = 0;
    label.y = height/2;
    label.anchor.set(0.5, 0.5);
    this.addChild(label);
  }
}

export default WinnerZone;