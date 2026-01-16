import { Container, Graphics, Sprite } from 'pixi.js';
import { getUiFrameHorizontalLineTexture } from '../../../resources/Assets';
import TextButton from '../../../presentation/common/TextButton';

class SidePanel extends Container {
  constructor() {
    super();
    this.background = new Graphics();
    this.addChild(this.background);

    this.edge = new Sprite(getUiFrameHorizontalLineTexture());
    this.addChild(this.edge);
    this.edge.anchor.set(1, 1);
    this.edge.rotation = -Math.PI/2;

    this._contentBoundaries = {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    }
    this.masterContainer = new Container();
    this.addChild(this.masterContainer);

    this.neuralTestButton = new TextButton("Neural Test", 16, false);
    this.neuralTestButton.visible = false;
    this.neuralTestButton.on("click", () => {
      this.emitNeuralTestEvent();
    });
    this.addChild(this.neuralTestButton);

    this.testDriveButton = new TextButton("Test Drive", 16, false);
    this.testDriveButton.visible = false;
    this.testDriveButton.on("click", () => {
      this.emitTestDriveEvent();
    });
    this.addChild(this.testDriveButton);
  }

  emitNeuralTestEvent() {
    this.emit("neuralTest");
  }

  emitTestDriveEvent() {
    this.emit("testDrive");
  }

  scaleView(width, height) {
    this.background.clear();
    this.background.rect(0, 0, width, height);
    this.background.fill({ color: 0x000000, alpha: 0.5 });
    this.edge.width = height

    const buttonArreaHeight = 60;

    this.neuralTestButton.x = 25;
    this.neuralTestButton.y = height - buttonArreaHeight
    this.neuralTestButton.buttonWidth = width/2 - 40;

    this.testDriveButton.buttonWidth = this.neuralTestButton.buttonWidth
    this.testDriveButton.x = width - this.testDriveButton.buttonWidth - 25;
    this.testDriveButton.y = height - buttonArreaHeight

    
    const scaleX = width / this._contentBoundaries.width;
    const scaleY = (height-buttonArreaHeight) / this._contentBoundaries.height;
    const scale = Math.min(scaleX, scaleY);
    this.masterContainer.scale.set(scale);
    this.masterContainer.x = width/2 - this._contentBoundaries.width * scale / 2 - this._contentBoundaries.x * scale;
    this.masterContainer.y = height/2 - buttonArreaHeight/2 - this._contentBoundaries.height * scale / 2 - this._contentBoundaries.y * scale;
  }
}

export default SidePanel;