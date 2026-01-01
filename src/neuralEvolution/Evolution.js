import Simulation from '../sim/Simulation';
import { Generation, serializeGeneration, deserializeGeneration } from './Generation';
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
    this.simulation.onComplete = () => this.onEpochComplete();
    this.completedTracks = [];
    this.epochLimit = epochLimit;

    this.database = new Database(CURRENT_EVOLUTION_FILENAME);

    this.config = {}
  }

  // store in local storage
  async store() {
    const data = {
      evolutionId: this.evolutionId,
      completedTracks: this.completedTracks,
      generation: serializeGeneration(this.generation)
    }
    this.database.storeEvolution(data);
  }

  async initialize(config = {}) {
    this.config = config
    const { populationSize = 100 } = this.config;
    this.config.evolve = this.config.evolve || {};

    let loadedData = await this.database.loadEvolution();

    if(loadedData) {
      this.evolutionId = loadedData.evolutionId;
      this.completedTracks = loadedData.completedTracks;
      const generationData = await this.database.loadGeneration(loadedData.lastGenerationId);
      this.generation = deserializeGeneration(generationData, this.tracks);
    } else {
      this.generation = new Generation(this.tracks[0]);
      this.generation.createRandomPopulation(populationSize);
    }
    this.simulation.setTrack(this.generation.track);
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

  getNextTrack() {
    const { replayInterval = 6 } = this.config;
    let newTrack
    if (this.generation.epoch % replayInterval === 0 && this.completedTracks.length >= 2) {
      const randomTrackName = this.completedTracks[Math.floor(Math.random() * this.completedTracks.length)];
      newTrack = this.tracks.find(track => track.name === randomTrackName);
      console.log(`Replaying on completed track ${newTrack.name}`);
    } else {
      const nextIncompleteTrack = this.tracks.find(track => !this.completedTracks.includes(track.name));
      newTrack = nextIncompleteTrack;
      console.log(`Replaying on next incomplete track ${newTrack.name}`);
    }
    return newTrack;
  }

  async onEpochComplete() {
    const { trackPassThreshold = 0.25, populationHistorySize = 10 } = this.config;
    // complete simulation and calculate scores
    console.log('== Epoch completed =============');
    const passRate = this.generation.finishedCount / this.generation.totalCount;
    if(passRate >= trackPassThreshold && !this.completedTracks.includes(this.simulation.track.name)) {
      this.completedTracks.push(this.simulation.track.name); // mark as completed
    }

    const newTrack = this.getNextTrack();

    // evolve generation
    const scoreWeights = this.config.scoreWeights || { trackDistance: 1 };
    this.generation.calculateScores(scoreWeights);
    await this.store();
    this.generation.setTrack(newTrack);
    this.generation = this.generation.evolve(this.config.evolve);

    if(this.generation.epoch > this.epochLimit) return;

    // remove current track from simulation
    this.simulation.removeObject(this.simulation.track);
    this.simulation.removeAndDispose();

    // run new simulation 
    this.simulation = new Simulation(this.pixiApp);
    this.simulation.scaleView(this.pixiApp.screen.width, this.pixiApp.screen.height);
    this.pixiApp.stage.addChild(this.simulation.view);
    this.simulation.setTrack(newTrack);
    this.simulation.onComplete = async () => await this.onEpochComplete();
    this.generation.resetScores();
    await this.store();
    await this.database.trimGenerationHistory(this.evolutionId, populationHistorySize);
    this.simulation.setGeneration(this.generation);

    const { simulationStep = 0.05, simulationSpeed = 1, graphicsQuality = "low" } = this.config;
    this.simulation.start(simulationStep, simulationSpeed, graphicsQuality); // Start simulation loop
    this.simulation.startRender(); // Start render loop
  }
}

export default Evolution;