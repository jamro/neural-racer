class Config {
  constructor() {
    this.graphicsQuality = "high"; // "high" or "low"
    this.frameRate = 30; // frame rate in frames per second
    this.populationSize = 200; // number of cars in the population
    this.populationHistorySize = 20; // number of generations to keep in the population history
    this.simulationStep = 0.060; // time step in seconds
    this.simulationSpeed = 5; // number of sim steps per frame
    this.replayInterval = 6; // every how many epochs to run evolution on random, completed track
    this.trackPassThreshold = 0.25; // threshold for the pass rate to promote to the next track
    this.scoreWeights = {
      avgSpeedAtFinishLine: 1, // weight for the average speed at the finish line. If the car is not at the finish line, this weight is 0.
      trackDistance: 1, // weight for the distance traveled on the track
      avgSpeed: 0, // weight for the average speed of the car.
    };

    this.evolve = {
      crossover: {},
      mutation: {
        clamp: 5.0, // clamp values to a range
      },
    }

    this.setStandardMode();
  }

  setStandardMode() {
    this.evolve.eliteRatio = 0.05; // percentage of top performing genomes to carry over to next generation
    this.evolve.eliminationEpochs = 15; // how often eliminate the weakest genomes and replace with random ones
    this.evolve.eliminationRate = 0.05; // percentage of weakest genomes to eliminate every `eliminationEpochs` epochs 
    this.evolve.crossover.selectionTournamentSize = 8; // size of tournament selection group of genomes to select the best one for crossover
    this.evolve.crossover.blendRatio = 0.7; // percentage blend crossovers, the remaining percentage is uniform crossover
    this.evolve.mutation.hiddenRate = 0.02; // probability of mutating a gene (applied to hidden layers of NN)
    this.evolve.mutation.hiddenSigma = 0.05; // standard deviation of the mutation (applied to hidden layers of NN)
    this.evolve.mutation.outputRate = 0.05; // probability of mutating a gene (applied to output layer of NN)
    this.evolve.mutation.outputSigma = 0.12; // standard deviation of the mutation (applied to output layer of NN)
  }

  setExploratoryMode() {
    this.evolve.eliteRatio = 0.03; // percentage of top performing genomes to carry over to next generation
    this.evolve.eliminationEpochs = 5; // how often eliminate the weakest genomes and replace with random ones
    this.evolve.eliminationRate = 0.20; // percentage of weakest genomes to eliminate every `eliminationEpochs` epochs 
    this.evolve.crossover.selectionTournamentSize = 2; // size of tournament selection group of genomes to select the best one for crossover
    this.evolve.crossover.blendRatio = 0.25; // percentage blend crossovers, the remaining percentage is uniform crossover
    this.evolve.mutation.hiddenRate = 0.04; // probability of mutating a gene (applied to hidden layers of NN)
    this.evolve.mutation.hiddenSigma = 0.12; // standard deviation of the mutation (applied to hidden layers of NN)
    this.evolve.mutation.outputRate = 0.12; // probability of mutating a gene (applied to output layer of NN)
    this.evolve.mutation.outputSigma = 0.25; // standard deviation of the mutation (applied to output layer of NN)
  }
}

export default Config;