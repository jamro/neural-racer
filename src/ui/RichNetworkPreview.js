import * as PIXI from 'pixi.js';
import NetworkPreview from './NetworkPreview';

class RichNetworkPreview extends PIXI.Container {
  constructor() {
    super();

    this.netDiagram = new NetworkPreview();
    this.addChild(this.netDiagram);

    this.turnLabel = this.addLabel("Turn");
    this.turnLabel.anchor.set(0, 0.5);
    this.throttleLabel = this.addLabel("Throttle");
    this.throttleLabel.anchor.set(0, 0.5);
    this.radarLabel = this.addLabel("Radar Beams");
    this.radarLabel.anchor.set(1, 0.5);
    this.ttcLable = this.addLabel("Time to Collision");
    this.ttcLable.anchor.set(1, 0.5);
    this.sideBalanceLabel = this.addLabel("Side Balance");
    this.sideBalanceLabel.anchor.set(1, 0.5);
    this.safeDirectionLabel = this.addLabel("Safe Direction");
    this.safeDirectionLabel.anchor.set(1, 0.5);
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

    this.turnLabel.x = this.netDiagram.x + this.netDiagram.canvasWidth * scale + 15
    this.turnLabel.y = this.netDiagram.y + this.netDiagram.canvasHeight * scale * 0.25
    this.turnLabel.scale.set(scale, scale);

    this.throttleLabel.x = this.netDiagram.x + this.netDiagram.canvasWidth * scale + 15
    this.throttleLabel.y = this.netDiagram.y + this.netDiagram.canvasHeight * scale * 0.75
    this.throttleLabel.scale.set(scale, scale);

    this.radarLabel.x = this.netDiagram.x - 10
    this.radarLabel.y = this.netDiagram.y + this.netDiagram.canvasHeight * scale * 0.18
    this.radarLabel.scale.set(scale, scale);

    this.ttcLable.x = this.netDiagram.x - 10
    this.ttcLable.y = this.netDiagram.y + this.netDiagram.canvasHeight * scale * 0.45
    this.ttcLable.scale.set(scale, scale);

    this.sideBalanceLabel.x = this.netDiagram.x - 10
    this.sideBalanceLabel.y = this.netDiagram.y + this.netDiagram.canvasHeight * scale * 0.567
    this.sideBalanceLabel.scale.set(scale, scale);

    this.safeDirectionLabel.x = this.netDiagram.x - 10
    this.safeDirectionLabel.y = this.netDiagram.y + this.netDiagram.canvasHeight * scale * 0.658
    this.safeDirectionLabel.scale.set(scale, scale);

    this.turnHistoryLabel.x = this.netDiagram.x - 10
    this.turnHistoryLabel.y = this.netDiagram.y + this.netDiagram.canvasHeight * scale * 0.75
    this.turnHistoryLabel.scale.set(scale, scale);

    this.speedLabel.x = this.netDiagram.x - 10
    this.speedLabel.y = this.netDiagram.y + this.netDiagram.canvasHeight * scale * 0.842
    this.speedLabel.scale.set(scale, scale);

    this.tractionLabel.x = this.netDiagram.x - 10
    this.tractionLabel.y = this.netDiagram.y + this.netDiagram.canvasHeight * scale * 0.96
    this.tractionLabel.scale.set(scale, scale);
  }
}

export default RichNetworkPreview;