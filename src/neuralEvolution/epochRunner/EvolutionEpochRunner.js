import EpochRunner from './EpochRunner';

export default class EvolutionEpochRunner extends EpochRunner {
  constructor(evolution, allTracks) {
    super(evolution);
    this.currentTrack = allTracks[0];
    this.allTracks = allTracks;
    this.simulation = null;
  }

  serialize() {
    return {
      currentTrack: this.currentTrack.name,
    };
  }
  deserialize(data) {
    this.currentTrack = this.allTracks.find(track => track.name === data.currentTrack);

    if(!this.currentTrack) {
      console.warn(`Current track ${data.currentTrack} not found, using first track`);
      this.currentTrack = this.tracks[0];
    }
  }

  async run(simulation) {
    const { 
      simulationStep = 0.05, 
      simulationSpeed = 1, 
      graphicsQuality = "low", 
      scoreWeights = { trackDistance: 1 } 
    } = this.evolution.config;
    const { 
      trackPassThreshold = 0.25, 
      populationHistorySize = 10 
    } = this.evolution.config;

    this.evolution.generation.resetScores();

    // run new simulation 
    this.simulation = simulation;
    this.simulation.setTrack(this.currentTrack);
    this.simulation.addGeneration(this.evolution.generation);
    this.simulation.view.setEvolutionHistory(this.evolution.history, this.currentTrack.name);
    this.simulation.start(this.evolution.generation.epoch, simulationStep, simulationSpeed, graphicsQuality, scoreWeights); // Start simulation loop
    this.simulation.startRender(); // Start render loop

    // wait for simulation to complete
    await new Promise(resolve => {
      this.simulation.onComplete = resolve;
    });

    const hallOfFameConfig = this.evolution.config.hallOfFame || {};
    const { 
      candidatesPerGeneration = 6
    } = hallOfFameConfig;
    // complete simulation and calculate scores
    console.log('== Epoch completed =============');
    const passRate = this.evolution.generation.finishedCount / this.evolution.generation.totalCount;
    if(passRate >= trackPassThreshold && !this.evolution.completedTracks.includes(this.simulation.track.name)) {
      this.evolution.completedTracks.push(this.simulation.track.name); // mark as completed
    }

    // evolve generation
    this.evolution.generation.calculateScores(scoreWeights);
    this.evolution.history.addGenerationInstance(this.evolution.generation, this.currentTrack.name);
    const [leaders, leadersScores] = this.evolution.generation.getLeaders(candidatesPerGeneration);
    for(let i = 0; i < leaders.length; i++) {
      this.evolution.hallOfFame.addCar(
        leaders[i], 
        leadersScores[i], 
        this.currentTrack.name
      );
    }
    const hallOfFameResults = this.evolution.generation.getHallOfFameCarsAndScores(this.evolution.hallOfFame);
    for(const result of hallOfFameResults) {
      this.evolution.hallOfFame.updateCar(result.car, result.score, this.currentTrack.name);
    }

    // store and trim generation history
    await this.evolution.database.trimGenerationHistory(this.evolution.evolutionId, populationHistorySize);
    await this.evolution.store(); // store before evolution to keep scoring for history

    this.evolution.generation = this.evolution.generation.evolve(this.evolution.hallOfFame, this.evolution.config.evolve);
    this.currentTrack = this.getNextTrack();

    await this.evolution.store();

    // remove current track from simulation
    this.evolution.generation.resetScores();
    if(this.simulation) {
      this.simulation.removeAndDispose();
    }
    this.simulation = null
  }

  stop() {
    if(!this.simulation) return;
    this.simulation.stop(); // Stop simulation loop
    this.simulation.stopRender(); // Stop render loop
  }

  scaleView(width, height) {
    if(this.simulation) {
      this.simulation.scaleView(width, height);
    }
  }

  getNextTrack() {
    const { replayInterval = 6 } = this.evolution.config;
    let newTrack = null
    if (this.evolution.generation.epoch % replayInterval === 0 && this.evolution.completedTracks.length >= 2) {
      const randomTrackName = this.evolution.completedTracks[Math.floor(Math.random() * this.evolution.completedTracks.length)];
      newTrack = this.allTracks.find(track => track.name === randomTrackName);
    } else {
      const nextIncompleteTrack = this.allTracks.find(track => !this.evolution.completedTracks.includes(track.name));
      newTrack = nextIncompleteTrack;
    }
    if(!newTrack) {
      this.evolution.completedTracks = [];
      return this.allTracks[0];
    }
    return newTrack;
  }
}