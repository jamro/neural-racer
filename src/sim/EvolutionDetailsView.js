import * as PIXI from 'pixi.js';

class EvolutionDetailsView extends PIXI.Container {

  constructor() {
    super();
    this.evolution = null
    this.bg = new PIXI.Graphics();
    this.bg.rect(2, 2, 248, 188);
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
    this.statusTextField.y = 8;
    this.addChild(this.statusTextField);

    PIXI.Ticker.shared.add(this.onTick, this);
    this.fpsCounter = 0;
    this.fps = 0;

    setInterval(() => {
        this.fps = this.fpsCounter;
        this.fpsCounter = 0;
    }, 1000);
  }

  renderView(delta) {
    if (!this.evolution || !this.evolution.simulation) return;

    // take last 10
    const history = this.evolution.history.getScoreHistoryForTrack(
      this.evolution.simulation.track.name,
      ['maxScore', 'medianScore', 'completionRate']
    ).slice(-10);

    

    this.statusTextField.text = "History:\n" + (history.map(h => h.epoch.toString().padStart(3, ' ') + ": ★ " + ((100*h.maxScore).toFixed(1).padStart(5, ' ')) + ", ≈ " + ((100*h.medianScore).toFixed(1).padStart(5, ' ')) + ", ✓ " + Math.round(100*h.completionRate).toString().padStart(3, ' ') + "%" ).join("\n") || "-")
  }

  onTick(delta) {
    this.fpsCounter += 1;
  }

}

export default EvolutionDetailsView;