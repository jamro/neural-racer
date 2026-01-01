import Simulation from '../sim/Simulation';
import Generation from './Generation';
import { serializeGenome, deserializeGenome } from './Genome';
import Database from '../loaders/Database';
import { v4 as uuidv4 } from 'uuid';

const CURRENT_EVOLUTION_FILENAME = 'current-evolution';

class Evolution { 
  constructor(pixiApp, tracks, epochLimit=Infinity) {
    this.evolutionId = uuidv4();
    this.pixiApp = pixiApp;
    this.simulation = new Simulation(this.pixiApp);
    this.simulation.scaleView(this.pixiApp.screen.width, this.pixiApp.screen.height);
    this.pixiApp.stage.addChild(this.simulation.view);
    this.tracks = tracks;
    this.currentTrackIndex = 0;
    this.simulation.onComplete = () => this.onEpochComplete();
    this.completedTracks = [];
    this.epochLimit = epochLimit;

    this.database = new Database(CURRENT_EVOLUTION_FILENAME);

    this.config = {}
  }

  // store in local storage
  async store(filename) {
    const data = {
      currentTrackIndex: this.currentTrackIndex,
      completedTracks: this.completedTracks,
      epoch: this.generation.epoch,
      genomes: this.generation.cars.map(car => serializeGenome(car.genome))
    }
    this.database.storeEvolution(data);
  }

  async initialize(config = {}) {
    this.config = config
    const { populationSize = 100 } = this.config;
    this.config.evolve = this.config.evolve || {};

    let loadedData = await this.database.loadEvolution();

    if(loadedData) {
      this.currentTrackIndex = loadedData.currentTrackIndex;
      this.completedTracks = loadedData.completedTracks;
      this.generation = new Generation(this.tracks[this.currentTrackIndex]);
    }

    this.simulation.setTrack(this.tracks[this.currentTrackIndex]);
    this.generation = new Generation(this.tracks[this.currentTrackIndex]);
    if(loadedData) {
      this.generation.setPopulation(loadedData.genomes.map(genome => deserializeGenome(genome)));
      this.generation.epoch = loadedData.epoch;
    } else {
      this.generation.createRandomPopulation(populationSize);
    }

    this.simulation.setGeneration(this.generation);
  }

  start() {
    const { simulationStep = 0.05, simulationSpeed = 1, graphicsQuality = "low" } = this.config;
    this.simulation.start(simulationStep, simulationSpeed, graphicsQuality); // Start simulation loop
    this.simulation.startRender(); // Start render loop
  }

  stop() {
    this.simulation.stop(); // Stop simulation loop
    this.simulation.stopRender(); // Stop render loop
  }
  scaleView(width, height) {
    if(this.simulation) {
      this.simulation.scaleView(width, height);
    }
  }

  getViewWidth() {
    return this.simulation.view.width;
  }

  getViewHeight() {
    return this.simulation.view.height;
  }

  async onEpochComplete() {
    const { replayInterval = 6, trackPassThreshold = 0.25 } = this.config;
    // complete simulation and calculate scores
    console.log('== Epoch completed =============');
    const passRate = this.generation.finishedCount / this.generation.totalCount;
    // promote to next track if pass rate is high enough
    if(passRate >= trackPassThreshold && this.simulation.track === this.tracks[this.currentTrackIndex]) { // make sure the promotion does not happen afte replaying on a completed track
      if (!this.completedTracks.includes(this.currentTrackIndex)) {
        this.completedTracks.push(this.currentTrackIndex);
      }
      this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    }
    let newTrack = this.tracks[this.currentTrackIndex];
    // replay on random, completed track
    if(this.generation.epoch % replayInterval === 0 && this.completedTracks.length >= 2) {
      const randomCompletedTrackIndex = this.completedTracks[Math.floor(Math.random() * this.completedTracks.length)];
      newTrack = this.tracks[randomCompletedTrackIndex];
      console.log(`Replaying on completed track ${newTrack.name}`);
    }
    
    // evolve generation
    const scoreWeights = this.config.scoreWeights || { trackDistance: 1 };
    this.generation.calculateScores(scoreWeights);
    this.generation.setTrack(newTrack);
    this.generation = this.generation.evolve(this.config.evolve);

    if(this.generation.epoch > this.epochLimit) return;

    // remove current track from simulation
    this.simulation.removeObject(this.simulation.track);
    this.simulation.removeAndDispose();

    // run new simulation 
    await this.store(CURRENT_EVOLUTION_FILENAME);
    this.simulation = new Simulation(this.pixiApp);
    this.simulation.scaleView(this.pixiApp.screen.width, this.pixiApp.screen.height);
    this.pixiApp.stage.addChild(this.simulation.view);
    this.simulation.setTrack(newTrack);
    this.simulation.onComplete = async () => await this.onEpochComplete();
    this.generation.resetScores();
    this.simulation.setGeneration(this.generation);

    const { simulationStep = 0.05, simulationSpeed = 1, graphicsQuality = "low" } = this.config;
    this.simulation.start(simulationStep, simulationSpeed, graphicsQuality); // Start simulation loop
    this.simulation.startRender(); // Start render loop
  }
}

export default Evolution;