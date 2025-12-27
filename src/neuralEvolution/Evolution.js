import Simulation from '../sim/Simulation';
import Generation from './Generation';

const CURRENT_SNAPSHOT_FILENAME = 'current-population-snapshot';
const CURRENT_EVOLUTION_FILENAME = 'current-evolution';

class Evolution { 
  constructor(pixiApp, tracks, epochLimit=Infinity) {
    this.pixiApp = pixiApp;
    this.simulation = new Simulation(this.pixiApp);
    this.simulation.scaleView(this.pixiApp.screen.width, this.pixiApp.screen.height);
    this.pixiApp.stage.addChild(this.simulation.view);
    this.tracks = tracks;
    this.currentTrackIndex = 0;
    this.simulation.onComplete = () => this.onEpochComplete();
    this.completedTracks = [];
    this.epochLimit = epochLimit;

    this.config = {}
  }

  // store in local storage
  store(filename) {
    const data = {
      currentTrackIndex: this.currentTrackIndex,
      completedTracks: this.completedTracks
    }
    localStorage.setItem(filename, JSON.stringify(data));
  }

  load(filename) {
    const data = localStorage.getItem(filename);
    if (!data) return;
    const { currentTrackIndex, completedTracks } = JSON.parse(data);
    this.currentTrackIndex = currentTrackIndex;
    this.completedTracks = completedTracks;
  }

  initialize(config = {}) {
    this.config = config
    this.load(CURRENT_EVOLUTION_FILENAME);
    const { populationSize = 100 } = this.config;
    const scoreWeights = this.config.scoreWeights || { trackDistance: 1 };
    this.config.evolve = this.config.evolve || {};
    this.simulation.setTrack(this.tracks[this.currentTrackIndex]);
    this.generation = new Generation(this.tracks[this.currentTrackIndex], scoreWeights);
    this.generation.initialize(populationSize);

    this.generation.load(CURRENT_SNAPSHOT_FILENAME);

    this.simulation.setGeneration(this.generation);
  }

  start() {
    const { simulationStep = 0.05 } = this.config;
    this.simulation.start(simulationStep); // Start simulation loop
    this.simulation.startRender(); // Start render loop
  }

  stop() {
    this.simulation.stop(); // Stop simulation loop
    this.simulation.stopRender(); // Stop render loop
  }

  onEpochComplete() {
    // complete simulation and calculate scores
    console.log('== Epoch completed =============');
    const passRate = this.generation.finishedCount / this.generation.totalCount;
    const oldTrack = this.tracks[this.currentTrackIndex];
    // promote to next track if pass rate is high enough
    if(passRate > 0.25) {
      if (!this.completedTracks.includes(this.currentTrackIndex)) {
        this.completedTracks.push(this.currentTrackIndex);
        this.currentTrackIndex = 0
      } else {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
      }
    }
    const newTrack = this.tracks[this.currentTrackIndex];
    
    // evolve generation
    this.generation.calculateScores();
    this.generation.store(CURRENT_SNAPSHOT_FILENAME);
    this.store(CURRENT_EVOLUTION_FILENAME);
    this.generation.setTrack(newTrack);
    this.generation = this.generation.evolve(this.config.evolve);

    if(this.generation.epoch > this.epochLimit) return;

    // remove current track from simulation
    this.simulation.removeObject(oldTrack);
    this.simulation.removeAndDispose();


    // run new simulation 
    this.simulation = new Simulation(this.pixiApp);
    this.simulation.scaleView(this.pixiApp.screen.width, this.pixiApp.screen.height);
    this.pixiApp.stage.addChild(this.simulation.view);
    this.simulation.setTrack(newTrack);
    this.simulation.onComplete = () => this.onEpochComplete();
    this.generation.resetScores();
    this.simulation.setGeneration(this.generation);

    const { simulationStep = 0.05 } = this.config;
    this.simulation.start(simulationStep); // Start simulation loop
    this.simulation.startRender(); // Start render loop
  }
}

export default Evolution;