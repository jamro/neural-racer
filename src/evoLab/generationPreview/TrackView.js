import * as PIXI from 'pixi.js';

export default class TrackView extends PIXI.Container {
  constructor(maxScore, trackLength, trackWidth, unitRadius) {
    super();
    this.maxScore = maxScore;
    this.trackLength = trackLength;
    this.trackWidth = trackWidth;
    this.unitRadius = unitRadius;

    const linesGraphics = new PIXI.Graphics();
    linesGraphics.moveTo(1/this.maxScore * this.trackLength - this.trackLength/2, -this.trackWidth/2);
    linesGraphics.lineTo(1/this.maxScore * this.trackLength - this.trackLength/2, this.trackWidth/2);
    linesGraphics.moveTo(- this.trackLength/2 - this.unitRadius*1.5, -this.trackWidth/2);
    linesGraphics.lineTo(- this.trackLength/2 - this.unitRadius*1.5, this.trackWidth/2);
    linesGraphics.stroke({ 
      color: 0x888888,
      width: 1,
    });
    this.addChild(linesGraphics);
  }
}