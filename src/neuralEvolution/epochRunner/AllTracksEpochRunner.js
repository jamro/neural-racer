import EpochRunner from './EpochRunner';
import {Generation} from '../Generation';

const ALL_TRACKS_NAME = 'All Tracks';


function consolidateScores(carScores, consolidatedStats, k=0.3) {
  const meanScore = carScores.reduce((acc, score) => acc + score, 0) / carScores.length;
  const worstThreshold = Math.ceil(carScores.length * k);

  const sortedScores = carScores.sort((a, b) => a - b);
  const worstScores = sortedScores.slice(0, worstThreshold);
  const worstScore = worstScores.reduce((acc, score) => acc + score, 0) / worstScores.length;

  const score = (0.9 * worstScore + 0.1 * meanScore)

  if(consolidatedStats.progress < 1.0) {
    // penalize for not completing the track
    return Math.min(score, 1.0) * consolidatedStats.progress
  } else {
    return score;
  }

}

export default class AllTracksEpochRunner extends EpochRunner {

  constructor(evolution, allTracks) {
    super(evolution, allTracks);
    this.isRunning = false;
  }

  serialize() {
    return {};
  }

  deserialize(data) {
    // nothing to do
  }

  async run(initialGeneration, simulation) {
    const { 
      simulationStep = 0.05, 
      simulationSpeed = 1, 
      graphicsQuality = "low", 
      scoreWeights = { trackDistance: 1 },
      populationHistorySize = 10,
    } = this.evolution.config;
    const hallOfFameConfig = this.evolution.config.hallOfFame || {};
    const { 
      candidatesPerGeneration = 6
    } = hallOfFameConfig;


    // adjust evolve config if stagnation detected
    const isStagnated = this.evolution.history.isPopulationStagnated(ALL_TRACKS_NAME);
    if(isStagnated) {
      const history = this.evolution.history.getScoreHistoryForTrack(ALL_TRACKS_NAME);
      const lastEpoch = history[history.length - 1];
      const leaderScore = lastEpoch.maxScore;
      if(leaderScore > 1.0) {
        this.requestFinetuningConfigMode();
      } else {
        this.requestExplorationConfigMode();
      }
    } else {
      this.requestStandardConfigMode();
    }
    this.applyConfigMode();

    let latestGeneration = initialGeneration;
    this.isRunning = true;
    this.simulation = simulation
    const allScoresMap = {}
    const allScores = [];
    const allStats = [];
    for(let i = 0; i < this.allTracks.length && this.isRunning; i++) {
      const track = this.allTracks[i];
      console.log(`[AllTracksEpochRunner] Running for ${track.name} (${i + 1}/${this.allTracks.length})`);
      latestGeneration.resetScores();

      // run new simulation 
      if(!this.simulation) {
        this.simulation = this.evolution.createSimulation();
      }
      this.simulation.setTrack(track);
      this.simulation.addGeneration(latestGeneration);
      this.simulation.view.setEvolutionHistory(this.evolution.history, ALL_TRACKS_NAME);
      this.simulation.view.epochDescription = `All tracks evolution (${i + 1}/${this.allTracks.length})`;
      this.simulation.start(latestGeneration.epoch, simulationStep, simulationSpeed, graphicsQuality, scoreWeights); // Start simulation loop
      this.simulation.startRender(); // Start render loop

      // wait for simulation to complete
      await new Promise(resolve => {
        this.simulation.onComplete = resolve;
      });

      latestGeneration.calculateScores(scoreWeights);
      allScores.push(latestGeneration.scores);
      allStats.push(latestGeneration.stats);
      for(let j = 0; j < latestGeneration.cars.length; j++) {
        if(!allScoresMap[latestGeneration.cars[j].genome.genomeId]) {
          allScoresMap[latestGeneration.cars[j].genome.genomeId] = [];
        }
        allScoresMap[latestGeneration.cars[j].genome.genomeId].push({
          trackName: track.name, 
          score: latestGeneration.scores[j] 
        });
      }

      // remove current track from simulation
      if(this.simulation) {
        this.simulation.removeAndDispose();
      }
      this.simulation = null

      // recreate generation
      const refreshedGeneration = new Generation()
      refreshedGeneration.epoch = latestGeneration.epoch;
      refreshedGeneration.setPopulation(latestGeneration.cars.map(car => car.genome));
      latestGeneration = refreshedGeneration;

    }
    this.isRunning = false;

    // calculate consolidated scores and stats
    const consolidatedStats = []
    for (let i = 0; i < allStats[0].length; i++) {
      consolidatedStats.push({
        progress: allStats.reduce((acc, stats) => acc + stats[i].progress, 0) / allStats.length,
        averageSpeed: allStats.reduce((acc, stats) => acc + stats[i].averageSpeed, 0) / allStats.length,
      })
    }
    const consolidatedScores = []
    for (let i = 0; i < allScores[0].length; i++) {
      const carScores = allScores.map(scores => scores[i]);
      consolidatedScores.push(consolidateScores(carScores, consolidatedStats[i]));
      initialGeneration.cars[i].isFinished = (consolidatedStats[i].progress >= 1.0);
    }

    initialGeneration.scores = consolidatedScores;
    initialGeneration.stats = consolidatedStats;
    initialGeneration.calculateOverallScore();

    // update history and hall of fame
    this.evolution.history.addGenerationInstance(initialGeneration, ALL_TRACKS_NAME);
    const [leaders, leadersScores] = initialGeneration.getLeaders(candidatesPerGeneration);
    for(let i = 0; i < leaders.length; i++) {
      const leaderEvaluations = allScoresMap[leaders[i].genome.genomeId]; 
      const mainEvaluationIndex = Math.floor(Math.random() * leaderEvaluations.length);
      const mainEvaluation = leaderEvaluations[mainEvaluationIndex];
      this.evolution.hallOfFame.addCar(
        leaders[i], 
        mainEvaluation.score, 
        mainEvaluation.trackName,
        leaderEvaluations
      );
    }
    const hallOfFameResults = latestGeneration.getHallOfFameCarsAndScores(this.evolution.hallOfFame);
    for(const result of hallOfFameResults) {
      const hofEvaluations = allScoresMap[result.car.genome.genomeId];
      hofEvaluations.forEach(evaluation => this.evolution.hallOfFame.updateCar(
        result.car, 
        evaluation.score, 
        evaluation.trackName
      ));
    }
    
    // store and trim generation history
    await this.evolution.database.trimGenerationHistory(this.evolution.evolutionId, populationHistorySize);
    initialGeneration.trackName = ALL_TRACKS_NAME;
    await this.evolution.store(); // store before evolution to keep scoring for history

    const newGeneration = initialGeneration.evolve(this.evolution.hallOfFame, this.evolution.config.evolve);
    newGeneration.resetScores();
    newGeneration.trackName = ALL_TRACKS_NAME;

    await this.evolution.store();

    return newGeneration;
  }

  stop() {
    this.isRunning = false;
  }

  scaleView(width, height) {

  }
}