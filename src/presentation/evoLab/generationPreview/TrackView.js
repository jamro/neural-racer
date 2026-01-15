import * as PIXI from 'pixi.js';

const LABEL_STYLE = {
  fontFamily: 'Exo2',
  fontSize: 10,
  fill: 0x666666,
  lineHeight: 16,
  align: 'center',
};

const MAIN_COLOR = 0x333333;

export default class TrackView extends PIXI.Container {
  constructor(maxScore, trackLength, trackWidth, unitRadius) {
    super();
    this.maxScore = maxScore;
    this.trackLength = trackLength;
    this.trackWidth = trackWidth;
    this.unitRadius = unitRadius;

    this.drawTrackScale(- this.trackLength/2 - this.unitRadius*1.5, 1/this.maxScore * this.trackLength - this.trackLength/2, this.trackWidth);  
  }

  drawTrackScale(startX, finishX, height) {
    const boxSize = this.unitRadius*1.5;
    this.drawFinishLine(startX, height, boxSize, "0%\nSTART");
    this.drawFinishLine(finishX, height, boxSize, "100%\nFINISH");

    for(let i=1; i<10; i++) {
      const x = startX + (finishX - startX) * i/10;
      this.drawScaleLine(x, height, boxSize, `${i*10}%`);
    }

    const label = new PIXI.Text();
    label.text = "RACE TRACK PROGRESS";
    label.style = {...LABEL_STYLE, fontSize: 12, fill: 0x666666 };
    label.x = (startX + finishX)/2;
    label.y = height/2 + 40
    label.anchor.set(0.5, 0.5);
    this.addChild(label);
  }

  drawScaleLine(x, height, boxSize = 10, labelText = '') {
    const linesGraphics = new PIXI.Graphics();
    linesGraphics.moveTo(x, +height/2-boxSize*2);
    linesGraphics.lineTo(x, +height/2);
    linesGraphics.moveTo(x, -height/2+boxSize*2);
    linesGraphics.lineTo(x, -height/2);
    linesGraphics.stroke({ color: 0x444444, width: boxSize/4 });
    this.addChild(linesGraphics);

    if(labelText) {
      const label = new PIXI.Text()
      label.text = labelText;
      label.style = LABEL_STYLE;
      label.x = x;
      label.y = height/2 + boxSize*1.5;
      label.anchor.set(0.5, 0);
      this.addChild(label);
    }
  }

  drawFinishLine(x, height, boxSize = 10, labelText = '') {
    const linesGraphics = new PIXI.Graphics();

    for(let y=-height/2; y<=height/2; y+=boxSize*2) {
      linesGraphics.rect(x, y, boxSize, Math.min(boxSize, height/2-y));
      if(y+boxSize*2 <= height/2) {
        linesGraphics.rect(x+boxSize, y+boxSize, boxSize, Math.min(boxSize, height/2-y));
      }
    }
    linesGraphics.fill({ color: MAIN_COLOR });

    linesGraphics.moveTo(x + boxSize*2.5, -height/2);
    linesGraphics.lineTo(x + boxSize*2.5, +height/2);
    linesGraphics.stroke({ color: MAIN_COLOR, width: boxSize/4 });
    this.addChild(linesGraphics);

    if(labelText) {
      const label = new PIXI.Text()
      label.text = labelText;
      label.style = LABEL_STYLE;
      label.x = x + boxSize*2.5 - boxSize*1.25
      label.y = height/2 + boxSize*1.5
      label.anchor.set(0.5, 0);
      this.addChild(label);
    }
  }
}