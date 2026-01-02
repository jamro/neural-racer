import * as PIXI from 'pixi.js';
import ProgressBar from '../ui/ProgressBar';

class GenerationDetailsView extends PIXI.Container {
  constructor() {
    super();
    this.generation = null
    this.bg = new PIXI.Graphics();
    this.bg.rect(2, 2, 248, 78);
    this.bg.fill({
      color: 0x000000,
      alpha: 0.8
    });
    this.addChild(this.bg);

    this.statusTextField = new PIXI.Text();
    this.statusTextField.style = { 
      fontFamily: 'Courier New',
      fontSize: 12, 
      lineHeight: 16,
      fill: 0xffffff 
    };
    this.statusTextField.x = 10;
    this.statusTextField.y = 10;
    this.addChild(this.statusTextField);

    this.statusProgressBar = new ProgressBar();
    this.addChild(this.statusProgressBar);
    this.statusProgressBar.x = 10;
    this.statusProgressBar.y = 65;
    this.statusProgressBar.controlWidth = 230;
    this.statusProgressBar.colors = [0xff0000, 0xffffff, 0x8888ff];
  }

  renderView(delta) {
    if (!this.generation) return;

    this.statusProgressBar.max = this.generation.totalCount;
    this.statusProgressBar.values = [
      this.generation.crashedCount,
      this.generation.activeCount,
      this.generation.finishedCount
    ]

    this.statusTextField.text = "Epoch: " + this.generation.epoch + "\n" +
        "Track: " + this.generation.trackName + "\n" +
        "Size: ✕ " + this.generation.crashedCount + ", ▶ " + this.generation.activeCount + ", ✓ " + this.generation.finishedCount + " (" + this.generation.totalCount + ")"
  }
  
}

export default GenerationDetailsView;