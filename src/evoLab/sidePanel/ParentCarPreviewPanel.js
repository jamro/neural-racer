import * as PIXI from 'pixi.js';
import CarPreviewPanel from './CarPreviewPanel';
import { formatTime } from '../../sim/formatters';

class ParentCarPreviewPanel extends CarPreviewPanel {
  constructor(props = {
    score: 0,
    progress: 0,
    averageSpeed: 0,
    topSpeed: 0, 
    lapTimeSec: null,
    type: 'parent',
  }) {
    super(props);

    this.addCarNameLabel(this._contentBoundaries.width / 2, this.title.y + 295, props.carName);
    this.addCarPreview(this._contentBoundaries.width *0.5, this.title.y + 250);

    if(props.car) {
      this.addCarNetworkPreview(
        this._contentBoundaries.width*0.5, 
        65, 
        props.car.neuralNet, 
        props.car.genome,
        props.progress >= 1 ? 0x8888ff : 0xff8800
      );
      this.networkPreview.x -= this.networkPreview.canvasWidth*0.5
      this.addLabel(
        this._contentBoundaries.width*0.5,
        180, 
        "NEURAL NETWORK", 
        {
          fontSize: 10,
          fill: 0x888888,
          align: 'center',
        }
      );
      this.addArrow(this._contentBoundaries.width*0.5, 230);
    }
    
    this.statsInfo = new PIXI.Text()
    this.statsInfo.style = {
      fontFamily: 'Exo2',
      fontSize: 14,
      lineHeight: 22,
      fill: 0xffffff,
    }
    this.statsInfo.text = `- Score: ${(100*props.score).toFixed(2)}\n- Progress: ${Math.round(100*props.progress)}%\n- Lap time: ${props.lapTimeSec ? formatTime(props.lapTimeSec) : "-"}\n- Top Speed: ${Math.round(props.topSpeed*3.6)} km/h\n- Average Speed: ${Math.round(props.averageSpeed*3.6)} km/h`;

    this.statsInfo.anchor.set(0, 0);
    this.statsInfo.x = 30
    this.statsInfo.y = 360;
    this.masterContainer.addChild(this.statsInfo);
  }

}

export default ParentCarPreviewPanel;