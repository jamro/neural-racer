import * as PIXI from 'pixi.js';
import { getUiFrameHorizontalLineTexture, getUiFrameCornerTexture } from '../loaders/AssetLoader';

export default class Frame extends PIXI.Container {
  constructor(width, height) {
    super();
    this.width = width;
    this.height = height;

    const topLine = new PIXI.Sprite(getUiFrameHorizontalLineTexture());
    this.addChild(topLine);
    topLine.x = 0;
    topLine.y = 0
    topLine.width = width;
    topLine.anchor.set(0, 1);

    const bottomLine = new PIXI.Sprite(getUiFrameHorizontalLineTexture());
    this.addChild(bottomLine);
    bottomLine.x = 0;
    bottomLine.y = height
    bottomLine.width = width;
    bottomLine.anchor.set(0, 1);
    bottomLine.scale.y = -1;

    const leftLine = new PIXI.Sprite(getUiFrameHorizontalLineTexture());
    this.addChild(leftLine);
    leftLine.x = 0;
    leftLine.y = 0
    leftLine.width = height;
    leftLine.anchor.set(0, 1);
    leftLine.scale.y = -1;
    leftLine.rotation = Math.PI/2;

    const rightLine = new PIXI.Sprite(getUiFrameHorizontalLineTexture());
    this.addChild(rightLine);
    rightLine.x = width;
    rightLine.y = 0
    rightLine.width = height;
    rightLine.anchor.set(1, 1);
    rightLine.scale.y = -1;
    rightLine.rotation = -Math.PI/2;

    const cornerTL = new PIXI.Sprite(getUiFrameCornerTexture());
    this.addChild(cornerTL);
    cornerTL.x = 0;
    cornerTL.y = 0;
    cornerTL.anchor.set(1, 1);

    const cornerTR = new PIXI.Sprite(getUiFrameCornerTexture());
    this.addChild(cornerTR);
    cornerTR.x = width;
    cornerTR.y = 0;
    cornerTR.anchor.set(1, 1);
    cornerTR.scale.x = -1;

    const cornerBL = new PIXI.Sprite(getUiFrameCornerTexture());
    this.addChild(cornerBL);
    cornerBL.x = 0;
    cornerBL.y = height;
    cornerBL.anchor.set(1, 1);
    cornerBL.scale.y = -1;

    const cornerBR = new PIXI.Sprite(getUiFrameCornerTexture());
    this.addChild(cornerBR);
    cornerBR.x = width;
    cornerBR.y = height;
    cornerBR.anchor.set(1, 1);
    cornerBR.scale.x = -1;
    cornerBR.scale.y = -1;



    const bg = new PIXI.Graphics();
    this.addChild(bg);
    bg.rect(0, 0, width, height);
    bg.fill({
      color: 0x000000,
      alpha: 0.8
    });


  }
}