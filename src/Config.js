class Config {
  constructor() {
    this.populationSize = 100; // number of cars in the population
    this.simulationStep = 0.1; // time step in seconds
    this.scoreWeights = {
      avgSpeedAtFinishLine: 1, // weight for the average speed at the finish line. If the car is not at the finish line, this weight is 0.
      trackDistance: 1, // weight for the distance traveled on the track
      speedingPenalty: 0, // weight for the speeding penalty.
      speedingLimitValue: 80/3.6, // value of the speeding limit in meters/second
      avgSpeed: 0, // weight for the average speed of the car.
    };

    this.evolve = {
      crossover: {},
      mutation: {},
    }

    this.setStandardMode();
  }

  setStandardMode() {
    this.evolve.eliteRatio = 0.05; // percentage of top performing genomes to carry over to next generation
    this.evolve.eliminationEpochs = 10; // how often eliminate the weakest genomes and replace with random ones
    this.evolve.eliminationRate = 0.05; // percentage of weakest genomes to eliminate every `eliminationEpochs` epochs 
    this.evolve.crossover.selectionTournamentSize = 6; // size of tournament selection group of genomes to select the best one for crossover
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