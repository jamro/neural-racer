import * as PIXI from 'pixi.js';
import RichNetworkPreview from '../ui/RichNetworkPreview';
import PercentileChart from '../ui/PercentileChart';
import { calculateScore } from '../neuralEvolution/fitness';
import { 
  getUiFrameHorizontalLineTexture,
  getUiTrackIconTexture,
  getUiWarningIconTexture,
} from '../loaders/AssetLoader';
import Frame from '../ui/Frame';
import SpeedSelector from '../ui/SpeedSelector';
import EvolutionModeButton from '../ui/EvolutionModeButton';

const TITLES_HEIGHT = 30;
const WIDGET_HEIGHT = 210;
const WIDGET_BOTTOM_PADDING = 10;

class SimulationDetailsView extends PIXI.Container {

  constructor() {
    super();

    this.bottomContainer = new PIXI.Container();
    this.addChild(this.bottomContainer);

    this.bg = new PIXI.Graphics();
    this.bottomContainer.addChild(this.bg);

    this.topHr = new PIXI.Sprite(getUiFrameHorizontalLineTexture());
    this.bottomContainer.addChild(this.topHr);

    this.bottomHr = new PIXI.Sprite(getUiFrameHorizontalLineTexture());
    this.bottomContainer.addChild(this.bottomHr);

    this.historyChart = new PercentileChart(500, 120);
    this.bottomContainer.addChild(this.historyChart);

    PIXI.Ticker.shared.add(this.onTick, this);
    this.fpsCounter = 0;
    this.fps = 0;

    this.networkPreview = new RichNetworkPreview();
    this.bottomContainer.addChild(this.networkPreview);

    this.sortedScores = null

    this.scoresTitle = new PIXI.Text();
    this.scoresTitle.style = {
      fontFamily: 'Exo2',
      fontSize: 16,
      fill: 0xdedede,
    };
    this.scoresTitle.text = 'Population Evolution';
    this.scoresTitle.anchor.set(0.5, 0.5);
    this.bottomContainer.addChild(this.scoresTitle);

    this.neuralTitle = new PIXI.Text();
    this.neuralTitle.style = {
      fontFamily: 'Exo2',
      fontSize: 16,
      fill: 0xdedede,
    };
    this.neuralTitle.text = 'Neural Network';
    this.neuralTitle.anchor.set(0.5, 0.5);
    this.bottomContainer.addChild(this.neuralTitle);

    this.stagnationWarning = new PIXI.Container();
    this.stagnationWarning.visible = false;
    const stagnationBg = new PIXI.Graphics();
    this.stagnationWarning.addChild(stagnationBg);
    stagnationBg.rect(-2, -12, 100, 22);
    stagnationBg.fill({
      color: 0x000000,
      alpha: 0.3
    });
    const warningIcon = new PIXI.Sprite(getUiWarningIconTexture());
    this.stagnationWarning.addChild(warningIcon);
    warningIcon.x = 10;
    warningIcon.anchor.set(0.5, 0.5);
    warningIcon.scale.set(0.18);
    this.bottomContainer.addChild(this.stagnationWarning);
    const stagnationWarningText = new PIXI.Text();
    stagnationWarningText.style = {
      fontFamily: 'Exo2',
      fontSize: 12,
      fill: 0xdedede,
    };
    stagnationWarningText.text = 'STAGNATION';
    this.stagnationWarning.addChild(stagnationWarningText);
    stagnationWarningText.x = 22;
    stagnationWarningText.anchor.set(0, 0.5);

    this.topContainer = new Frame(180, 180);
    this.addChild(this.topContainer);

    const trackIcon = new PIXI.Sprite(getUiTrackIconTexture());
    this.topContainer.addChild(trackIcon);
    trackIcon.x = 22;
    trackIcon.y = 22;
    trackIcon.anchor.set(0.5, 0.5);
    trackIcon.scale.set(0.3);

    this.trackLabel = new PIXI.Text();
    this.trackLabel.style = {
      fontFamily: 'Exo2',
      fontSize: 14,
      fill: 0xdedede,
    };
    this.trackLabel.text = 'Track: ???';
    this.topContainer.addChild(this.trackLabel);
    this.trackLabel.x = 48;
    this.trackLabel.y = 10;

    this.epochDescriptionLabel = new PIXI.Text();
    this.epochDescriptionLabel.style = {
      fontFamily: 'Exo2',
      fontSize: 10,
      fill: 0x8888ff,
    };
    this.topContainer.addChild(this.epochDescriptionLabel);
    this.epochDescriptionLabel.x = this.trackLabel.x+1;
    this.epochDescriptionLabel.y = 25;

    this.epochLabel = new PIXI.Text();
    this.epochLabel.style = {
      fontFamily: 'Exo2',
      fontSize: 12,
      fill: 0xdedede,
    };
    this.epochLabel.text = 'Epoch: ???';
    this.topContainer.addChild(this.epochLabel);
    this.epochLabel.x = 7;
    this.epochLabel.y = 45;

    this.topContainer.addHorizontalLine(70, 'Speed:');

    this.speedButton = new SpeedSelector();
    this.speedButton.on('valueChanged', (value) => {
      this.emit('speedChanged', value);
    });
    this.speedButton.value = 1;
    this.topContainer.addChild(this.speedButton);
    this.speedButton.x = 15;
    this.speedButton.y = 90;

    this.topContainer.addHorizontalLine(130, 'Evolution:');

    this.evolutionButton = new EvolutionModeButton();
    this.topContainer.addChild(this.evolutionButton);
    this.evolutionButton.x = 15;
    this.evolutionButton.y = 148;
    this.evolutionButton.on('change', (autoMode) => {
      this.emit('evolutionModeChanged', autoMode);
    });

    this.scaleView(500, 200);
    setInterval(() => {
      this.fps = this.fpsCounter;
      this.fpsCounter = 0;
    }, 1000);
  }

  set simulationSpeed(speed) {
    this.speedButton.value = speed;
  }

  get simulationSpeed() {
    return this.speedButton.value;
  }

  update(simulation, leaderCar, scoreWeights) {
    // be sure that memory is supported
    let usedJSHeapSize = 0;
    let jsHeapSizeLimit = 0;
    if(performance.memory) {
      usedJSHeapSize = performance.memory.usedJSHeapSize;
      jsHeapSizeLimit = performance.memory.jsHeapSizeLimit;
    }

    //"FPS: " + (this.fps || '???') + "\n" + 
    //"Memory: " + ((usedJSHeapSize / 1024 / 1024 / 1024).toFixed(2).padStart(4, ' ') + "GB / " + (jsHeapSizeLimit / 1024 / 1024 / 1024).toFixed(2).padStart(4, ' ') + "GB") + "\n\n" +
    //"Epoch: " + simulation.epoch + "\n" +
    //"Track: " + simulation.track.name + "\n" +
    //"Size: ✕ " + crashedCars + ", ▶ " + (totalCars - crashedCars - finishedCars) + ", ✓ " + finishedCars + " (" + totalCars + ")" + "\n\n\n"


    this.trackLabel.text = simulation.track.name;
    this.epochLabel.text = 'Epoch: ' + simulation.epoch;

    if(simulation.cars.length > 0) {
      if(this.sortedScores === null) {
        this.sortedScores = [];
        for(let car of simulation.cars) {
          this.sortedScores.push({
            car: car,
            score: null
          });
        }
      }
      for(let carRecord of this.sortedScores) {
        carRecord.score = calculateScore(carRecord.car, scoreWeights);
      }
      this.sortedScores.sort((a, b) => a.score - b.score);
      const maxScore = this.sortedScores[this.sortedScores.length - 1].score;
      const p75Score = this.sortedScores[Math.floor(this.sortedScores.length * 0.75)].score;
      this.historyChart.updateCurrentPopulation(p75Score, maxScore);
    }
    
    if(leaderCar) {
      const activations = leaderCar.neuralNet ? leaderCar.neuralNet.getLastActivations() : null;
      this.networkPreview.renderView(leaderCar.neuralNet, leaderCar.genome, activations);
    }
  }

  set epochDescription(description) {
    this.epochDescriptionLabel.text = description;
  }
  get epochDescription() {
    return this.epochDescriptionLabel.text;
  }

  set autoEvolve(autoMode) {
    this.evolutionButton.autoMode = autoMode;
  }
  get autoEvolve() {
    return this.evolutionButton.autoMode;
  }

  setEvolutionHistory(evolutionHistory, trackName) {
    const history = evolutionHistory.getScoreHistoryForTrack(
      trackName,
      ['minScore', 'percentile25Score', 'medianScore', 'percentile75Score', 'maxScore']
    )
    .slice(-50)
    .map(h => [h.minScore, h.percentile25Score, h.medianScore, h.percentile75Score, h.maxScore]);

    this.historyChart.updateHistory(history);

    this.stagnationWarning.visible = evolutionHistory.isPopulationStagnated(trackName);
  }

  scaleView(width, height) {
    this.bottomContainer.y = height - WIDGET_HEIGHT - WIDGET_BOTTOM_PADDING;
    this.bg.clear()
    this.bg.rect(0, 0, width, WIDGET_HEIGHT);
    this.bg.fill({
      color: 0x000000,
      alpha: 0.8
    });
    this.bg.rect(0, 0, width, TITLES_HEIGHT);
    this.bg.fill({
      color: 0x000000,
      alpha: 0.5
    });

    this.networkPreview.x = width/2
    this.networkPreview.y = TITLES_HEIGHT
    this.historyChart.y = TITLES_HEIGHT
    this.networkPreview.scaleView(width/2, WIDGET_HEIGHT-TITLES_HEIGHT);
    this.historyChart.scaleView(width/2, WIDGET_HEIGHT-TITLES_HEIGHT);

    this.scoresTitle.x = width*0.25
    this.scoresTitle.y = TITLES_HEIGHT*0.5-2
    this.neuralTitle.x = width*0.75
    this.neuralTitle.y = TITLES_HEIGHT*0.5-2

    this.topHr.x = 0
    this.topHr.y = -this.topHr.height
    this.topHr.width = width

    this.bottomHr.x = 0
    this.bottomHr.y = WIDGET_HEIGHT + this.bottomHr.height
    this.bottomHr.scale.y = -1
    this.bottomHr.width = width

    this.stagnationWarning.x = this.historyChart.x + 45
    this.stagnationWarning.y = this.historyChart.y + this.historyChart.canvasHeight - 42
  }

  onTick(delta) {
    this.fpsCounter += 1;
    this.stagnationWarning.alpha = Math.cos(performance.now()/100)*0.4+0.6;
  }

  destroy() {
    PIXI.Ticker.shared.remove(this.onTick, this);
    this.evolutionButton.off('change');
    this.speedButton.off('valueChanged');
    console.log('SimulationDetailsView destroyed');
    super.destroy();
  }

}

export default SimulationDetailsView;