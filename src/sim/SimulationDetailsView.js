import * as PIXI from 'pixi.js';
import ProgressBar from '../ui/ProgressBar';
import NetworkPreview from '../ui/NetworkPreview';

class SimulationDetailsView extends PIXI.Container {

  constructor() {
    super();
    this.bg = new PIXI.Graphics();
    this.addChild(this.bg);
    this.scaleView(500, 250);

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

    this.historyTextField = new PIXI.Text();
    this.historyTextField.style = { 
      fontFamily: 'Courier New',
      fontSize: 12, 
      lineHeight: 16,
      fill: 0xffffff 
    };
    this.historyTextField.x = 300;
    this.historyTextField.y = 8;
    this.addChild(this.historyTextField);

    PIXI.Ticker.shared.add(this.onTick, this);
    this.fpsCounter = 0;
    this.fps = 0;

    this.statusProgressBar = new ProgressBar();
    this.addChild(this.statusProgressBar);
    this.statusProgressBar.x = 10;
    this.statusProgressBar.y = 108;
    this.statusProgressBar.controlWidth = 230;
    this.statusProgressBar.colors = [0xff0000, 0xffffff, 0x8888ff];

    this.networkPreview = new NetworkPreview();
    this.networkPreview.x = 600;
    this.networkPreview.y = 10;
    this.addChild(this.networkPreview);

    setInterval(() => {
        this.fps = this.fpsCounter;
        this.fpsCounter = 0;
    }, 1000);
  }

  update(simulation, leaderCar) {
    // be sure that memory is supported
    let usedJSHeapSize = 0;
    let jsHeapSizeLimit = 0;
    if(performance.memory) {
      usedJSHeapSize = performance.memory.usedJSHeapSize;
      jsHeapSizeLimit = performance.memory.jsHeapSizeLimit;
    }

    let totalCars = 0
    let crashedCars = 0
    let finishedCars = 0
    for (const car of simulation.cars) {
      totalCars++;
      if(car.isCrashed) crashedCars++;
      if(car.isFinished) finishedCars++;
    }

    this.statusProgressBar.max = totalCars;
    this.statusProgressBar.values = [
      crashedCars, 
      totalCars - crashedCars - finishedCars, 
      finishedCars
    ];

    this.statusTextField.text = "FPS: " + (this.fps || '???') + "\n" + 
    "Memory: " + ((usedJSHeapSize / 1024 / 1024 / 1024).toFixed(2).padStart(4, ' ') + "GB / " + (jsHeapSizeLimit / 1024 / 1024 / 1024).toFixed(2).padStart(4, ' ') + "GB") + "\n\n" +
    "Epoch: " + simulation.epoch + "\n" +
    "Track: " + simulation.track.name + "\n" +
    "Size: ✕ " + crashedCars + ", ▶ " + (totalCars - crashedCars - finishedCars) + ", ✓ " + finishedCars + " (" + totalCars + ")" + "\n\n\n"

    if(leaderCar) {
      this.statusTextField.text += "Leader: \n" + 
      " - Distance: " + (100*leaderCar.checkpointsProgress).toFixed(1) + "%\n" + 
      " - Speed: " + (leaderCar.model.speed*3.6).toFixed(1) + " km/h"

      const activations = leaderCar.neuralNet ? leaderCar.neuralNet.getLastActivations() : null;
      this.networkPreview.renderView(leaderCar.neuralNet, leaderCar.genome, activations);
    }
  }


  setEvolutionHistory(evolutionHistory, trackName) {
    const history = evolutionHistory.getScoreHistoryForTrack(
      trackName,
      ['maxScore', 'medianScore', 'completionRate']
    ).slice(-8);

    this.historyTextField.text = "History:\n" + (history.map(h => h.epoch.toString().padStart(3, ' ') + ": ★ " + ((100*h.maxScore).toFixed(1).padStart(5, ' ')) + ", ≈ " + ((100*h.medianScore).toFixed(1).padStart(5, ' ')) + ", ✓ " + Math.round(100*h.completionRate).toString().padStart(3, ' ') + "%" ).join("\n") || "-")
  }

  scaleView(width, height) {
    this.bg.clear()
    this.bg.rect(0, 0, width, 200);
    this.bg.fill({
      color: 0x000000,
      alpha: 0.8
    });
  }

  onTick(delta) {
    this.fpsCounter += 1;
  }

}

export default SimulationDetailsView;