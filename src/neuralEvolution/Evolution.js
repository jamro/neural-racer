import Simulation from '../sim/Simulation';
import { Generation, serializeGeneration, deserializeGeneration } from './Generation';
import Database from '../loaders/Database';
import GenerationHistory from './GenerationHistory';
import HallOfFame from './HallOfFame';
import { v4 as uuidv4 } from 'uuid';
import EvolutionEpochRunner from './epochRunner/EvolutionEpochRunner';
import HallOfFameEpochRunner from './epochRunner/HallOfFameEpochRunner';
import AllTracksEpochRunner from './epochRunner/AllTracksEpochRunner';

const CURRENT_EVOLUTION_FILENAME = 'current-evolution';

class Evolution { 
  constructor(pixiApp, tracks) {
    this.evolutionId = uuidv4();

    this.pixiApp = pixiApp;
    this.tracks = tracks;
    this.latestGeneration = null;
    this.history = new GenerationHistory();

    this.database = new Database(CURRENT_EVOLUTION_FILENAME);
    this.hallOfFame = new HallOfFame();
    this.evolutionEpochRunner = new EvolutionEpochRunner(this, tracks);
    this.hallOfFameEpochRunner = new HallOfFameEpochRunner(this, tracks);
    this.allTracksEpochRunner = new AllTracksEpochRunner(this, tracks);
    this.currentEpochRunner = this.evolutionEpochRunner;

    this.isRunning = false;
    this.config = {};
  }

  get generation() {
    return this.latestGeneration;
  }

  set generation(generation) {
    this.latestGeneration = generation;
  }

  // store in local storage
  async store() {
    const data = {
      evolutionId: this.evolutionId,
      generation: serializeGeneration(this.latestGeneration, this.evolutionEpochRunner.currentTrack.name),
      hallOfFame: this.hallOfFame.serialize(),
      epochRunners: {
        evolution: this.evolutionEpochRunner.serialize(),
        hallOfFame: this.hallOfFameEpochRunner.serialize(),
        allTracks: this.allTracksEpochRunner.serialize(),
      }
    }
    this.database.storeEvolution(data);
  }

  async initialize(config = {}) {
    this.config = config
    const { populationSize = 100 } = this.config;
    this.config.evolve = this.config.evolve || {};
    this.config.hallOfFame = this.config.hallOfFame || {};
    this.config.scoreWeights = this.config.scoreWeights || { trackDistance: 1 };

    const { perTrackSize = 30, minFitnessDistance = 0.001 } = this.config.hallOfFame;
    this.hallOfFame.perTrackSize = perTrackSize;
    this.hallOfFame.minFitnessDistance = minFitnessDistance;

    let loadedData = await this.database.loadEvolution();

    if(loadedData) {
      this.evolutionId = loadedData.evolutionId;
      let generationData = await this.database.loadGeneration(loadedData.lastGenerationId);
      if(!generationData) {
        console.warn(`Generation data (${loadedData.lastGenerationId}) not found for evolution ${this.evolutionId}, loading latest generation`);
        generationData = await this.database.findLatestGenerationByEvolutionId(this.evolutionId);
      }
      this.latestGeneration = deserializeGeneration(generationData);

      const historyData = await this.database.loadGenerationsByEvolutionId(this.evolutionId);
      this.history.deserialize(historyData);

      if(loadedData.epochRunners && loadedData.epochRunners.evolution) {
        this.evolutionEpochRunner.deserialize(loadedData.epochRunners.evolution);
      }
      if(loadedData.epochRunners && loadedData.epochRunners.hallOfFame) {
        this.hallOfFameEpochRunner.deserialize(loadedData.epochRunners.hallOfFame);
      }
      if(loadedData.epochRunners && loadedData.epochRunners.allTracks) {
        this.allTracksEpochRunner.deserialize(loadedData.epochRunners.allTracks);
      }

      // hall of fame
      this.hallOfFame.deserialize(loadedData.hallOfFame);

    } else {
      this.latestGeneration = new Generation();
      this.latestGeneration.createRandomPopulation(populationSize);
    }
  }

  createSimulation() {
    const simulation = new Simulation(this.pixiApp);
    simulation.scaleView(this.pixiApp.screen.width, this.pixiApp.screen.height);
    this.pixiApp.stage.addChild(simulation.view);

    return simulation;
  }

  async runInLoop() {
    const {
      populationSize = 100,
    } = this.config;
    const hallOfFameConfig = this.config.hallOfFame || {};
    const { 
      perTrackSize = 10,
    } = hallOfFameConfig;

    this.isRunning = true;
    let generation = this.latestGeneration;
    let simulation
    while(this.isRunning) {
      if(!this.evolutionEpochRunner.allTracksCompleted) { // standard mode, run track after track to learn step by step
        const evaluationCandidates = this.hallOfFame.getEvaluationCandidates(perTrackSize, populationSize);
        if(evaluationCandidates) {
          console.log('Evaluating hall of fame');
        }
        this.currentEpochRunner = evaluationCandidates ? this.hallOfFameEpochRunner : this.evolutionEpochRunner;

        simulation = this.createSimulation();
        generation = await this.currentEpochRunner.run(generation, simulation);
        this.latestGeneration = generation;
        simulation.removeAndDispose();
      } else { // all tracks completed, run all tracks at once to find generalists
        this.currentEpochRunner = this.allTracksEpochRunner;

        simulation = this.createSimulation();
        generation = await this.currentEpochRunner.run(generation, simulation);
        this.latestGeneration = generation;
        simulation.removeAndDispose();
      }
    }
    this.isRunning = false;
  }

  stopSimulation() {
    this.isRunning = false;
    if(this.currentEpochRunner) {
      this.currentEpochRunner.stop();
    }
  }
  
  scaleView(width, height) {
    if(this.currentEpochRunner) {
      this.currentEpochRunner.scaleView(width, height);
    }
  }

}

export default Evolution;