import * as PIXI from 'pixi.js';
import SidePanel from './SidePanel';
import CarSensorPreview from '../../ui/CarSensorPreview';
import StaticNetworkPreview from '../../ui/networkPreview/staticPreview/StaticNetworkPreview';

class CarPreviewPanel extends SidePanel {
  constructor(props = {
    carName: '????',
    score: 0,
    progress: 0,
    averageSpeed: 0,
    type: 'parent',
    car: null,
  }) {
    super();
    this._contentBoundaries = {x: 0, y: 0, width: 300, height: 470}

    this.genome = props.car?.genome ?? null;
    
    this.title = new PIXI.Text()
    this.title.style = {
      fontFamily: 'Exo2',
      fontSize: 22,
      fill: 0xffffff,
    }
    this.title.text = 'CAR DETAILS'
    this.title.anchor.set(0.5, 0);
    this.title.x = this._contentBoundaries.width / 2;
    this.title.y = 20;
    this.masterContainer.addChild(this.title);
  }

  addLabel(x, y, text, style={}) {
    const label = new PIXI.Text()
    label.style = {
      fontFamily: 'Exo2',
      fontSize: 12,
      fill: 0x888888,
      ...style,
    }
    label.text = text;
    label.anchor.set(0.5, 0);
    label.x = x;
    label.y = y;
    this.masterContainer.addChild(label);
    return label;
  }

  addCarNetworkPreview(x, y, neuralNet, genome, color=0x888888) {
    this.networkPreview = new StaticNetworkPreview(
      this._contentBoundaries.width * 0.8,
      this._contentBoundaries.width * 0.35,
      neuralNet,
      genome,
      color
    );
    this.networkPreview.x = x;
    this.networkPreview.y = y;
    this.masterContainer.addChild(this.networkPreview);
  }

  addCarPreview(y, carName) {
    this.carPreview = new CarSensorPreview({showRadar: false, showTires: true});
    this.masterContainer.addChild(this.carPreview);
    this.carPreview.x = this._contentBoundaries.width * 0.5
    this.carPreview.y = y;
    this.carPreview.rotation = -Math.PI * 0.4;

    this.carNameLabel = this.addLabel(
      this._contentBoundaries.width * 0.5, 
      y, 
      carName, 
      {
        fontSize: 12,
        fill: 0x888888,
      }
    );
    this.carNameLabel.x = this._contentBoundaries.width * 0.5
    this.carNameLabel.y = y + 40;
  }
  addArrow(x, y) {
    for(let i = 0; i < 2; i++) {
      const arrow = new PIXI.Graphics();
      arrow.moveTo(0, 0);
      arrow.lineTo(10, -10);
      arrow.lineTo(5, -10);
      arrow.lineTo(0, -5);
      arrow.lineTo(-5, -10);
      arrow.lineTo(-10, -10);
      arrow.lineTo(0, 0);
      arrow.fill({ color: 0x888888 });
      arrow.x = x
      arrow.y = y + i*10 - 10;
      this.masterContainer.addChild(arrow);
    }
  }

  emitNeuralTestEvent() {
    if(!this.genome) return;
    this.emit("neuralTest", this.genome);
  }
  emitTestDriveEvent() {
    if(!this.genome) return;
    this.emit("testDrive", this.genome);
  }
}

export default CarPreviewPanel;