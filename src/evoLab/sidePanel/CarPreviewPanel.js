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
    this._contentBoundaries = {x: 0, y: 0, width: 300, height: 500}

    const title = new PIXI.Text()
    title.style = {
      fontFamily: 'Exo2',
      fontSize: 22,
      fill: 0xffffff,
    }
    title.text = 'CAR DETAILS'
    title.anchor.set(0.5, 0);
    title.x = this._contentBoundaries.width / 2;
    title.y = 20;
    this.masterContainer.addChild(title);

    this.carNameLabel = new PIXI.Text()
    this.carNameLabel.style = {
      fontFamily: 'Exo2',
      fontSize: 12,
      fill: 0x888888,
    }
    this.carNameLabel.text = props.carName;
    this.carNameLabel.anchor.set(0.5, 0);
    this.carNameLabel.x = this._contentBoundaries.width / 2;
    this.carNameLabel.y = title.y + 120
    this.masterContainer.addChild(this.carNameLabel);

    this.carPreview = new CarSensorPreview({showRadar: false, showTires: true});
    this.masterContainer.addChild(this.carPreview);
    this.carPreview.x = this._contentBoundaries.width *0.5;
    this.carPreview.y = title.y + 75
    this.carPreview.rotation = -Math.PI * 0.4;

    if(props.car) {
      this.networkPreview = new StaticNetworkPreview(
        this._contentBoundaries.width * 0.8,
        this._contentBoundaries.width * 0.35,
        props.car.neuralNet,
        props.car.genome
      );
      this.networkPreview.x = this._contentBoundaries.width*0.5 - this.networkPreview.canvasWidth*0.5;
      this.networkPreview.y = 170
      this.masterContainer.addChild(this.networkPreview);
    }
  }

}

export default CarPreviewPanel;