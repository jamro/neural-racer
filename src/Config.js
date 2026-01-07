class Config {
  constructor() {
    this.graphicsQuality = "high"; // "high" or "low"
    this.frameRate = 30; // frame rate in frames per second
    this.populationSize = 200; // number of cars in the population
    this.populationHistorySize = 30; // number of full generations (with genomes) to keep in the population history
    this.simulationStep = 0.060; // time step in seconds
    this.simulationSpeed = 0.5; // number of sim steps per frame
    this.replayInterval = 8; // every how many epochs to run evolution on random, completed track
    this.trackPassThreshold = 0.25; // threshold for the pass rate to promote to the next track
    this.scoreWeights = {
      avgSpeedAtFinishLine: 2, // weight for the average speed at the finish line. If the car is not at the finish line, this weight is 0.
      trackDistance: 1, // weight for the distance traveled on the track
      avgSpeed: 0.05, // weight for the average speed of the car.
    };
    this.evolve = {
      crossover: {},
      mutation: {
        clamp: 5.0, // clamp values to a range
      },
    };
    this.hallOfFame = {
      perTrackSize: 30,          // max genomes stored per track
      candidatesPerGeneration: 6, // how many top genomes to consider per generation
      minFitnessDistance: 0.001, // minimal fitness distance to be considered for hall of fame
    }

    this.setStandardMode();
  }

  setStandardMode() {
    this.evolve.eliteRatio = 0.03; // percentage of top performing genomes to carry over to next generation
    this.evolve.hallOfFameEliteRatio = 0.01; // percentage of genomes from the hall of fame to carry over to next generation
    this.evolve.eliminationEpochs = 10; // how often eliminate the weakest genomes and replace with random ones
    this.evolve.eliminationRate = 0.08; // percentage of weakest genomes to eliminate every `eliminationEpochs` epochs 
    this.evolve.crossover.selectionTournamentSize = 5; // size of tournament selection group of genomes to select the best one for crossover
    this.evolve.crossover.blendRatio = 0.65; // percentage blend crossovers, the remaining percentage is uniform crossover
    this.evolve.crossover.hallOfFameSelectionProbability = 0.15; // probability of selecting a parent from the hall of fame for crossover
    this.evolve.mutation.hiddenRate = 0.03; // probability of mutating a gene (applied to hidden layers of NN)
    this.evolve.mutation.hiddenSigma = 0.07; // standard deviation of the mutation (applied to hidden layers of NN)
    this.evolve.mutation.outputRate = 0.05; // probability of mutating a gene (applied to output layer of NN)
    this.evolve.mutation.outputSigma = 0.12; // standard deviation of the mutation (applied to output layer of NN)
  }

}

export default Config;