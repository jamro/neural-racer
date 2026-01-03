import * as PIXI from 'pixi.js';
import NetworkPreview from './networkPreview/NetworkPreview';
import { getUiTurnIconTexture, getUiThrottleIconTexture } from '../loaders/AssetLoader';

class RichNetworkPreview extends PIXI.Container {
  constructor() {
    super();

    this.netDiagram = new NetworkPreview([
      { range: [0, 8], group: true },
      { index: 9, artificialSources: [3, 5] },
      { index: 10, artificialSources: [3, 5] },
      { index: 11, artificialSources: [0,1,2,6,7,8] },
      { index: 12, artificialSources: [0,1,2,3,4,5,6,7,8] },
      { index: 13 },
      { index: 14 },
      { range: [15, 16], group: true }
    ])
    this.addChild(this.netDiagram);

    this.turnIcon = this.addChild(new PIXI.Sprite(getUiTurnIconTexture()));
    this.throttleIcon = this.addChild(new PIXI.Sprite(getUiThrottleIconTexture()));
    this.turnIcon.anchor.set(0, 0.5);
    this.throttleIcon.anchor.set(0, 0.5);
    this.turnIcon.alpha = 0.8;
    this.throttleIcon.alpha = 0.8;
    this.addChild(this.turnIcon);
    this.addChild(this.throttleIcon);

    this.radarLabel = this.addLabel("Radar Beams");
    this.radarLabel.anchor.set(1, 0.5);
    this.turnHistoryLabel = this.addLabel("Turn History");
    this.turnHistoryLabel.anchor.set(1, 0.5);
    this.speedLabel = this.addLabel("Speed");
    this.speedLabel.anchor.set(1, 0.5);
    this.tractionLabel = this.addLabel("Traction");
    this.tractionLabel.anchor.set(1, 0.5);
  }

  addLabel(text, props={}) {
    const label = new PIXI.Text()
    this.addChild(label);
    label.style = {
      fontFamily: 'Exo2',
      fontSize: 10,
      fill: 0xffffff,
      fontStyle: 'normal',
      ...props
    };
    label.x = 10;
    label.y = 10;
    label.text = text;
    this.addChild(label);
    return label;
  }


  renderView(neuralNet, genome, activations) {
    this.netDiagram.renderView(neuralNet, genome, activations);
  }

  fitDiagramToView(width, height) {
    const paddingW = 0;
    const paddingH = 10;
    const scaleW = width / (this.netDiagram.canvasWidth + 2*paddingW);
    const scaleH = height / (this.netDiagram.canvasHeight + 2*paddingH);
    const scale = Math.min(scaleW, scaleH);
    this.netDiagram.scale.set(scale, scale);
    this.netDiagram.x = width/2 - this.netDiagram.canvasWidth * scale / 2
    this.netDiagram.y = height/2 - this.netDiagram.canvasHeight * scale / 2
    return scale
  }

  scaleView(width, height) {
    const scale = this.fitDiagramToView(Math.max(width - 80, 100), height);


    this.turnIcon.x = this.netDiagram.x + this.netDiagram.canvasWidth * scale + 11 * scale
    this.turnIcon.y = this.netDiagram.y + this.netDiagram.canvasHeight * scale * 0.25
    this.turnIcon.scale.set(scale*0.45);
    this.throttleIcon.x = this.netDiagram.x + this.netDiagram.canvasWidth * scale + 11 * scale  
    this.throttleIcon.y = this.netDiagram.y + this.netDiagram.canvasHeight * scale * 0.75
    this.throttleIcon.scale.set(scale*0.45);

    this.radarLabel.x = this.netDiagram.x - 10 * scale
    this.radarLabel.y = this.netDiagram.y + this.netDiagram.canvasHeight * scale * 0.238
    this.radarLabel.scale.set(scale, scale);

    this.turnHistoryLabel.x = this.netDiagram.x - 10 * scale
    this.turnHistoryLabel.y = this.netDiagram.y + this.netDiagram.canvasHeight * scale * 0.54
    this.turnHistoryLabel.scale.set(scale, scale);

    this.speedLabel.x = this.netDiagram.x - 10 * scale
    this.speedLabel.y = this.netDiagram.y + this.netDiagram.canvasHeight * scale * 0.7
    this.speedLabel.scale.set(scale, scale);

    this.tractionLabel.x = this.netDiagram.x - 10 * scale
    this.tractionLabel.y = this.netDiagram.y + this.netDiagram.canvasHeight * scale * 0.88
    this.tractionLabel.scale.set(scale, scale);
  }
}

export default RichNetworkPreview;