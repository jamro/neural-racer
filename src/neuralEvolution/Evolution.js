import Simulation from '../sim/Simulation';
import { Generation, serializeGeneration, deserializeGeneration } from './Generation';
import Database from '../loaders/Database';
import GenerationHistory from './GenerationHistory';
import { deserializeGenome } from './Genome';
import HallOfFame from './HallOfFame';
import { v4 as uuidv4 } from 'uuid';
import NeuralCarObject from '../sim/car/NeuralCarObject';

const CURRENT_EVOLUTION_FILENAME = 'current-evolution';

class Evolution { 
  constructor(pixiApp, tracks) {
    this.evolutionId = uuidv4();

    this.pixiApp = pixiApp;
    this.tracks = tracks;
    this.currentTrack = null;
    this.completedTracks = [];
    this.generation = null;
    this.simulation = null;
    this.history = new GenerationHistory();

    this.database = new Database(CURRENT_EVOLUTION_FILENAME);

    this.hallOfFame = new HallOfFame();

    this.config = {};
  }

  // store in local storage
  async store() {
    const data = {
      evolutionId: this.evolutionId,
      completedTracks: this.completedTracks,
      currentTrack: this.currentTrack.name,
      generation: serializeGeneration(this.generation, this.currentTrack.name),
      hallOfFame: this.hallOfFame.serialize()
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
      this.completedTracks = loadedData.completedTracks;
      this.currentTrack = this.tracks.find(track => track.name === loadedData.currentTrack);
      if(!this.currentTrack) {
        console.warn(`Current track ${loadedData.currentTrack} not found, using first track`);
        this.currentTrack = this.tracks[0];
      }
      let generationData = await this.database.loadGeneration(loadedData.lastGenerationId);
      if(!generationData) {
        console.warn(`Generation data (${loadedData.lastGenerationId}) not found for evolution ${this.evolutionId}, loading latest generation`);
        generationData = await this.database.findLatestGenerationByEvolutionId(this.evolutionId);
      }
      this.generation = deserializeGeneration(generationData);

      const historyData = await this.database.loadGenerationsByEvolutionId(this.evolutionId);
      for(const historyEntry of historyData) {
        if(historyEntry.overallScore.averageScore === null) {
          continue;
        }
        this.history.addGenerationData(
          historyEntry.trackName, 
          historyEntry.generationId, 
          historyEntry.overallScore, 
          historyEntry.epoch, 
          historyEntry.populationSize, 
          historyEntry.cars ? historyEntry.cars.map(car => ({
            genome: deserializeGenome(car.genome),
            score: car.score,
            stats: car.stats,
          })) : null
        )
      }

      // hall of fame
      for(const hofEntry of loadedData.hallOfFame) {
        const hofGenome = deserializeGenome(hofEntry.genome);
        const hofScore = hofEntry.scoreOnBestTrack;
        const hofTrackName = hofEntry.bestTrackName;
        const car = new NeuralCarObject(hofGenome);
        car.isFinished = true; // Important: set isFinished to true to be considered for hall of fame
        this.hallOfFame.addCar(car, hofScore, hofTrackName);
      }

    } else {
      this.generation = new Generation();
      this.currentTrack = this.tracks[0]
      this.generation.createRandomPopulation(populationSize);
    }
  }

  startSimulation() {
    const { simulationStep = 0.05, simulationSpeed = 1, graphicsQuality = "low", scoreWeights = { trackDistance: 1 } } = this.config;
    this.simulation = new Simulation(this.pixiApp);
    this.simulation.scaleView(this.pixiApp.screen.width, this.pixiApp.screen.height);
    this.pixiApp.stage.addChild(this.simulation.view);
    this.simulation.onComplete = () => this.onEpochComplete();
    this.simulation.setTrack(this.currentTrack);
    this.simulation.addGeneration(this.generation);
    this.simulation.view.setEvolutionHistory(this.history, this.currentTrack.name);
    this.simulation.start(this.generation.epoch, simulationStep, simulationSpeed, graphicsQuality, scoreWeights); // Start simulation loop
    this.simulation.startRender(); // Start render loop
  }

  stopSimulation() {
    if(!this.simulation) return;
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
    let newTrack = null
    if (this.generation.epoch % replayInterval === 0 && this.completedTracks.length >= 2) {
      const randomTrackName = this.completedTracks[Math.floor(Math.random() * this.completedTracks.length)];
      newTrack = this.tracks.find(track => track.name === randomTrackName);
    } else {
      const nextIncompleteTrack = this.tracks.find(track => !this.completedTracks.includes(track.name));
      newTrack = nextIncompleteTrack;
    }
    if(!newTrack) {
      this.completedTracks = [];
      return this.tracks[0];
    }
    return newTrack;
  }

  async onEpochComplete() {
    const { trackPassThreshold = 0.25, populationHistorySize = 10 } = this.config;
    const hallOfFameConfig = this.config.hallOfFame || {};
    const { candidatesPerGeneration = 6 } = hallOfFameConfig;
    // complete simulation and calculate scores
    console.log('== Epoch completed =============');
    const passRate = this.generation.finishedCount / this.generation.totalCount;
    if(passRate >= trackPassThreshold && !this.completedTracks.includes(this.simulation.track.name)) {
      this.completedTracks.push(this.simulation.track.name); // mark as completed
    }

    // evolve generation
    const scoreWeights = this.config.scoreWeights || { trackDistance: 1 };
    this.generation.calculateScores(scoreWeights);
    this.history.addGenerationInstance(this.generation, this.currentTrack.name);
    const [leaders, leadersScores] = this.generation.getLeaders(candidatesPerGeneration);
    for(let i = 0; i < leaders.length; i++) {
      this.hallOfFame.addCar(
        leaders[i], 
        leadersScores[i], 
        this.currentTrack.name
      );
    }
    await this.store();
    this.generation = this.generation.evolve(this.hallOfFame, this.config.evolve);
    this.currentTrack = this.getNextTrack();

    // remove current track from simulation
    this.simulation.removeAndDispose();

    // run new simulation 
    this.generation.resetScores();
    await this.store();
    await this.database.trimGenerationHistory(this.evolutionId, populationHistorySize);

    this.startSimulation();
  }
}

export default Evolution;