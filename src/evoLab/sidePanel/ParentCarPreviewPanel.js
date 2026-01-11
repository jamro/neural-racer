import * as PIXI from 'pixi.js';
import CarPreviewPanel from './CarPreviewPanel';

class ParentCarPreviewPanel extends CarPreviewPanel {
  constructor(props = {
    score: 0,
    progress: 0,
    averageSpeed: 0,
    type: 'parent',
  }) {
    super(props);
    
    this.statsInfo = new PIXI.Text()
    this.statsInfo.style = {
      fontFamily: 'Exo2',
      fontSize: 14,
      fill: 0xffffff,
    }
    this.statsInfo.text = `- Score: ${(100*props.score).toFixed(2)}\n- Progress: ${Math.round(100*props.progress)}%\n- Average Speed: ${Math.round(props.averageSpeed*3.6)} km/h`;

    this.statsInfo.anchor.set(0, 0);
    this.statsInfo.x = 30
    this.statsInfo.y = this.carPreview.y + 100;
    this.masterContainer.addChild(this.statsInfo);
  }

}

export default ParentCarPreviewPanel;