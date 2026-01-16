import { Container, Sprite, Graphics, Text } from 'pixi.js';
import { getUiFrameHorizontalLineTexture, getUiFrameCornerTexture } from '../../loaders/Assets';

export default class Frame extends Container {
  constructor(width, height) {
    super();
    this.frameWidth = width;
    this.frameHeight = height;

    const topLine = new Sprite(getUiFrameHorizontalLineTexture());
    this.addChild(topLine);
    topLine.x = 0;
    topLine.y = 0
    topLine.width = width;
    topLine.anchor.set(0, 1);

    const bottomLine = new Sprite(getUiFrameHorizontalLineTexture());
    this.addChild(bottomLine);
    bottomLine.x = 0;
    bottomLine.y = height
    bottomLine.width = width;
    bottomLine.anchor.set(0, 1);
    bottomLine.scale.y = -1;

    const leftLine = new Sprite(getUiFrameHorizontalLineTexture());
    this.addChild(leftLine);
    leftLine.x = 0;
    leftLine.y = 0
    leftLine.width = height;
    leftLine.anchor.set(0, 1);
    leftLine.scale.y = -1;
    leftLine.rotation = Math.PI/2;

    const rightLine = new Sprite(getUiFrameHorizontalLineTexture());
    this.addChild(rightLine);
    rightLine.x = width;
    rightLine.y = 0
    rightLine.width = height;
    rightLine.anchor.set(1, 1);
    rightLine.scale.y = -1;
    rightLine.rotation = -Math.PI/2;

    const cornerTL = new Sprite(getUiFrameCornerTexture());
    this.addChild(cornerTL);
    cornerTL.x = 0;
    cornerTL.y = 0;
    cornerTL.anchor.set(1, 1);

    const cornerTR = new Sprite(getUiFrameCornerTexture());
    this.addChild(cornerTR);
    cornerTR.x = width;
    cornerTR.y = 0;
    cornerTR.anchor.set(1, 1);
    cornerTR.scale.x = -1;

    const cornerBL = new Sprite(getUiFrameCornerTexture());
    this.addChild(cornerBL);
    cornerBL.x = 0;
    cornerBL.y = height;
    cornerBL.anchor.set(1, 1);
    cornerBL.scale.y = -1;

    const cornerBR = new Sprite(getUiFrameCornerTexture());
    this.addChild(cornerBR);
    cornerBR.x = width;
    cornerBR.y = height;
    cornerBR.anchor.set(1, 1);
    cornerBR.scale.x = -1;
    cornerBR.scale.y = -1;


    const bg = new Graphics();
    this.addChild(bg);
    bg.rect(0, 0, width, height);
    bg.fill({
      color: 0x000000,
      alpha: 0.8
    });

  }

  addHorizontalLine(y, text = "") {
    const container = new Container();
    const label = new Text();
    label.style = {
      fontFamily: 'Exo2',
      fontSize: 10,
      fill: 0x8888ff,
    };
    label.text = text;
    container.addChild(label);
    this.addChild(container);
    container.x = 0;
    container.y = y;
    label.x = 20;
    label.y = 0;
    label.anchor.set(0, 0.5);

    const leftLineWidth = 12;
    const line = new Graphics();
    this.addChild(line);
    line.moveTo(1, y-1);
    line.lineTo(leftLineWidth, y-1);
    line.moveTo(label.x + label.width + 10, y-1)
    line.lineTo(this.frameWidth-1 , y-1);
    line.stroke({
      color: 0x5c0000,
      width: 1,
    });
    line.moveTo(1, y);
    line.lineTo(leftLineWidth, y);
    line.moveTo(label.x + label.width + 10, y)
    line.lineTo(this.frameWidth-1, y);
    line.stroke({
      color: 0x000000,
      width: 1,
    });
    line.moveTo(1, y+1);
    line.lineTo(leftLineWidth, y+1);
    line.moveTo(label.x + label.width + 10, y+1)
    line.lineTo(this.frameWidth-1, y+1);
    line.stroke({
      color: 0x787eac,
      width: 1,
    });
    return container;
  }
}
