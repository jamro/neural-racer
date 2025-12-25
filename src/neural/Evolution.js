import Simulation from '../sim/Simulation';
import Generation from './Generation';

const CURRENT_SNAPSHOT_FILENAME = 'current-snapshot';

class Evolution { 
  constructor(pixiApp, track, epochLimit=Infinity) {
    this.pixiApp = pixiApp;
    this.simulation = new Simulation(this.pixiApp);
    this.simulation.scaleView(this.pixiApp.screen.width, this.pixiApp.screen.height);
    this.pixiApp.stage.addChild(this.simulation.view);
    this.track = track;
    this.simulation.setTrack(this.track);
    this.simulation.onComplete = () => this.onEpochComplete();
    this.epochLimit = epochLimit;

    this.evolveConfig = {}
  }

  initialize(config = {}) {
    const { populationSize = 100 } = config;
    this.evolveConfig = config.evolve || {};
    this.generation = new Generation(this.track);
    this.generation.initialize(populationSize);
    this.generation.load(CURRENT_SNAPSHOT_FILENAME);
    this.simulation.setGeneration(this.generation);
  }

  start() {
    this.simulation.start(); // Start simulation loop
    this.simulation.startRender(); // Start render loop
  }

  stop() {
    this.simulation.stop(); // Stop simulation loop
    this.simulation.stopRender(); // Stop render loop
  }

  onEpochComplete() {
    // complete simulation and calculate scores
    console.log('== Epoch completed =============');

    // evolve generation
    this.generation.calculateScores();
    this.generation.store(CURRENT_SNAPSHOT_FILENAME);
    this.generation = this.generation.evolve(this.evolveConfig);

    if(this.generation.epoch > this.epochLimit) return;

    // run new simulation
    this.simulation.removeObject(this.track);
    this.simulation.removeAndDispose();

    this.simulation = new Simulation(this.pixiApp);
    this.simulation.scaleView(this.pixiApp.screen.width, this.pixiApp.screen.height);
    this.pixiApp.stage.addChild(this.simulation.view);
    this.simulation.setTrack(this.track);
    this.simulation.onComplete = () => this.onEpochComplete();
    this.generation.resetScores();
    this.simulation.setGeneration(this.generation);

    this.simulation.start(); // Start simulation loop
    this.simulation.startRender(); // Start render loop
  }
}

export default Evolution;