import EpochRunner from './EpochRunner';

export default class EvolutionEpochRunner extends EpochRunner {
  constructor(evolution, allTracks) {
    super(evolution, allTracks);
    this.currentTrack = allTracks[0];
    this.simulation = null;
    this.completedTracks = [];
    this.allTracksCompleted = false;
  }

  serialize() {
    return {
      currentTrack: this.currentTrack.name,
      completedTracks: this.completedTracks,
      allTracksCompleted: this.allTracksCompleted,
    };
  }
  deserialize(data) {
    this.currentTrack = this.allTracks.find(track => track.name === data.currentTrack);
    this.completedTracks = data.completedTracks;
    this.allTracksCompleted = data.allTracksCompleted;
    if(!this.currentTrack) {
      console.warn(`Current track ${data.currentTrack} not found, using first track`);
      this.currentTrack = this.tracks[0];
    }
  }

  async run(latestGeneration, simulation) {
    const { 
      simulationStep = 0.05, 
      simulationSpeed = 1, 
      graphicsQuality = "low", 
      scoreWeights = { trackDistance: 1 },
      trackPassThreshold = 0.25, 
      populationHistorySize = 10,
      replayInterval = 6
    } = this.evolution.config;
    const hallOfFameConfig = this.evolution.config.hallOfFame || {};
    const { 
      candidatesPerGeneration = 6
    } = hallOfFameConfig;

    latestGeneration.resetScores();

    const isReplay = this.completedTracks.includes(this.currentTrack.name);

    // run new simulation 
    this.simulation = simulation;
    this.simulation.setTrack(this.currentTrack);
    this.simulation.addGeneration(latestGeneration);
    this.simulation.view.setEvolutionHistory(this.evolution.history, this.currentTrack.name);
    this.simulation.view.epochDescription = isReplay ? "Replay track" : "Single track evolution";
    this.simulation.start(latestGeneration.epoch, simulationStep, simulationSpeed, graphicsQuality, scoreWeights); // Start simulation loop
    this.simulation.startRender(); // Start render loop

    // wait for simulation to complete
    await new Promise(resolve => {
      this.simulation.onComplete = resolve;
    });

    // complete simulation and calculate scores
    console.log('== Epoch completed =============');
    const passRate = latestGeneration.finishedCount / latestGeneration.totalCount;
    if(passRate >= trackPassThreshold && !this.completedTracks.includes(this.simulation.track.name)) {
      this.completedTracks.push(this.simulation.track.name); // mark as completed
      console.log(`Track completed: ${this.simulation.track.name} at epoch ${latestGeneration.epoch}`);
    }

    // evolve generation
    latestGeneration.calculateScores(scoreWeights);
    this.evolution.history.addGenerationInstance(latestGeneration, this.currentTrack.name);
    const [leaders, leadersScores] = latestGeneration.getLeaders(candidatesPerGeneration);
    for(let i = 0; i < leaders.length; i++) {
      this.evolution.hallOfFame.addCar(
        leaders[i], 
        leadersScores[i], 
        this.currentTrack.name
      );
    }
    const hallOfFameResults = latestGeneration.getHallOfFameCarsAndScores(this.evolution.hallOfFame);
    for(const result of hallOfFameResults) {
      this.evolution.hallOfFame.updateCar(result.car, result.score, this.currentTrack.name);
    }

    // store and trim generation history
    await this.evolution.database.trimGenerationHistory(this.evolution.evolutionId, populationHistorySize);
    latestGeneration.trackName = this.currentTrack.name;
    await this.evolution.store(); // store before evolution to keep scoring for history

    const newGeneration = latestGeneration.evolve(this.evolution.hallOfFame, this.evolution.config.evolve);
    newGeneration.resetScores();
    this.currentTrack = this.getNextTrack(newGeneration.epoch, replayInterval);
    newGeneration.trackName = this.currentTrack.name;

    // remove current track from simulation
    if(this.simulation) {
      this.simulation.removeAndDispose();
    }
    this.simulation = null

    await this.evolution.store();

    return newGeneration;
  }

  stop() {
    if(!this.simulation) return;
    this.simulation.stop(); // Stop simulation loop
    this.simulation.stopRender(); // Stop render loop
  }

  scaleView(width, height) {
    if(!this.simulation) return;
    this.simulation.scaleView(width, height);
  }

  getNextTrack(epoch, replayInterval) {
    let newTrack = null
    if (epoch % replayInterval === 0 && this.completedTracks.length >= 2) {
      const randomTrackName = this.completedTracks[Math.floor(Math.random() * this.completedTracks.length)];
      newTrack = this.allTracks.find(track => track.name === randomTrackName);
    } else {
      const nextIncompleteTrack = this.allTracks.find(track => !this.completedTracks.includes(track.name));
      newTrack = nextIncompleteTrack;
    }
    if(!newTrack) {
      this.allTracksCompleted = true;
      this.completedTracks = [];
      return this.allTracks[0];
    }
    return newTrack;
  }
}