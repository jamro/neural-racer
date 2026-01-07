import EpochRunner from './EpochRunner';
import {Generation} from '../Generation';

export default class HallOfFameEpochRunner extends EpochRunner {
  constructor(evolution, allTracks) {
    super(evolution, allTracks);
  }

  serialize() {
    return {}
  }

  deserialize(data) {
    return;
  }

  async run(latestGeneration, simulation) {
    const {
      populationSize = 100,
    } = this.evolution.config;
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
      candidatesPerGeneration = 6,
      perTrackSize = 10,
    } = hallOfFameConfig;

    // create new generation with evaluation candidates
    const evaluationCandidates = this.evolution.hallOfFame.getEvaluationCandidates(perTrackSize, populationSize);
    if(!evaluationCandidates) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      throw new Error('No evaluation candidates found');
    }

    const track = this.allTracks.find(track => track.name === evaluationCandidates.trackName);
    const hofGeneration = new Generation();
    hofGeneration.setPopulation(evaluationCandidates.candidates)
    hofGeneration.epoch = latestGeneration.epoch;
    hofGeneration.trackName = track.name;

    // run new simulation 
    
    this.simulation = simulation;
    this.simulation.setTrack(track); 
    this.simulation.addGeneration(hofGeneration); // @TODO: use Hall of Fame cars and create new generation to not alter the lates one
    this.simulation.view.setEvolutionHistory(this.evolution.history, track.name);
    this.simulation.start(hofGeneration.epoch, simulationStep, simulationSpeed, graphicsQuality, scoreWeights); // Start simulation loop
    this.simulation.startRender(); // Start render loop


    // wait for simulation to complete
    await new Promise(resolve => {
      this.simulation.onComplete = resolve;
    });

    hofGeneration.calculateScores(scoreWeights);

    const hallOfFameResults = hofGeneration.getHallOfFameCarsAndScores(this.evolution.hallOfFame);
    for(const result of hallOfFameResults) {
      this.evolution.hallOfFame.updateCar(result.car, result.score, track.name);
    }

    this.evolution.store();

    return latestGeneration;
  }
}