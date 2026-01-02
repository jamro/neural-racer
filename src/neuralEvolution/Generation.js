import NeuralCarObject from '../sim/car/NeuralCarObject';
import { Genome, serializeGenome, deserializeGenome } from './Genome';
import { calculateScore } from './fitness';
import { v4 as uuidv4 } from 'uuid';

function serializeGeneration(generation, trackName) {
  return {
    generationId: generation.generationId,
    trackName: trackName, // keep track to restore generation history
    cars: generation.cars.map((car, index) => ({
      score: generation.scores[index],
      stats: generation.stats[index],
      genome: serializeGenome(car.genome),
    })),
    epoch: generation.epoch,
    overallScore: generation.overallScore,
  }
}

function deserializeGeneration(data) {
  const generation = new Generation();
  generation.generationId = data.generationId;
  generation.setPopulation(data.cars.map(car => deserializeGenome(car.genome)));
  for (let i = 0; i < data.cars.length; i++) {
    generation.scores[i] = data.cars[i].score;
    generation.stats[i] = data.cars[i].stats;
  }
  generation.epoch = data.epoch;
  generation.overallScore = data.overallScore;
  return generation;
}

class Generation {
    constructor() {
      this.generationId = uuidv4();
      this.cars = [];
      this.epoch = 1
      this.scores = Array(this.cars.length).fill(null);
      this.stats = Array(this.cars.length).fill(null);

      this.overallScore = {
        averageScore: null,
        medianScore: null,
        minScore: null,
        maxScore: null,
        completionRate: null,
        averageSpeed: null,
      }
    }

    createRandomPopulation(populationSize=100) {
      this.cars = [];
      for (let i = 0; i < populationSize; i++) {
        this.cars.push(new NeuralCarObject());
      }
    }

    setPopulation(genomes) {
      this.cars = genomes.map(genome => new NeuralCarObject(genome));
    }

    get activeCount() {
      return this.cars.filter(car => !car.isCrashed && !car.isFinished).length;
    }

    get finishedCount() {
      return this.cars.filter(car => car.isFinished).length;
    }

    get crashedCount() {
      return this.cars.filter(car => car.isCrashed).length;
    }

    get totalCount() {
      return this.cars.length;
    }

    calculateScores(scoreWeights) {
      this.scores = Array(this.cars.length).fill(null);
      this.stats = Array(this.cars.length).fill(null);
      for (let i = 0; i < this.cars.length; i++) {
        const car = this.cars[i];
        this.scores[i] = calculateScore(car, scoreWeights);
        this.stats[i] = {
          progress: car.checkpointsProgress,
          averageSpeed: car.calculateAverageSpeed(),
        }
      }

      this.overallScore = {
        averageScore: this.scores.reduce((a, b) => a + b, 0) / this.cars.length,
        medianScore: [...this.scores].sort((a, b) => a - b)[Math.floor(this.scores.length / 2)],
        minScore: Math.min(...this.scores),
        maxScore: Math.max(...this.scores),
        completionRate: this.finishedCount / this.cars.length,
        averageSpeed: this.stats.reduce((a, b) => a + b.averageSpeed * b.progress, 0) / this.stats.reduce((a, b) => a + b.progress, 0),
      }
    }

    resetScores() {
      this.scores = Array(this.cars.length).fill(null);
      this.stats = Array(this.cars.length).fill(null);
      this.overallScore = {
        averageScore: null,
        medianScore: null,
        minScore: null,
        maxScore: null,
        completionRate: null,
        averageSpeed: null,
      }
    }

    tournamentSelection(k=2) {
      if(this.cars.length === 0) throw new Error('No cars in generation to select from');
      // Randomly select k individuals for the tournament
      const tournamentIndices = [];
      for (let i = 0; i < k; i++) {
        tournamentIndices.push(Math.floor(Math.random() * this.cars.length));
      }
      
      // Find the individual with the highest score in the tournament
      let winnerIndex = tournamentIndices[0];
      let winnerScore = this.scores[winnerIndex] ?? -Infinity;
      
      for (let i = 1; i < tournamentIndices.length; i++) {
        const idx = tournamentIndices[i];
        const score = this.scores[idx] ?? -Infinity;
        if (score > winnerScore) {
          winnerScore = score;
          winnerIndex = idx;
        }
      }
      
      return this.cars[winnerIndex];
    }

    sortRankCars() {
      const indexedCars = this.cars.map((car, index) => ({
        car: car,
        genome: car.genome,
        score: this.scores[index] ?? -Infinity,
        index
      }));
      indexedCars.sort((a, b) => b.score - a.score);
      return indexedCars;
    }

    riseOffsprings(count, crossoverConfig, mutationConfig) {
      const { blendRatio = 0.7, selectionTournamentSize = 5 } = crossoverConfig;
      const { 
        hiddenRate = 0.03, 
        hiddenSigma = 0.12,
        outputRate = 0.08,
        outputSigma = 0.20,
        clamp = null
      } = mutationConfig;
      const offsprings = [];
      for (let i = 0; i < count; i++) {
        // Select two different parents using tournament selection
        let parent1 = this.tournamentSelection(selectionTournamentSize);
        let parent2 = this.tournamentSelection(selectionTournamentSize);
        
        // Ensure parents are different (avoid self-crossover)
        let attempts = 0;
        while (parent1 === parent2 && attempts < 10) {
          parent2 = this.tournamentSelection(selectionTournamentSize);
          attempts++;
        }
        
        // Create child through crossover
        const child = Genome.crossoverHybrid(parent1.genome, parent2.genome, blendRatio);
        
        // Apply mutation with different rates for hidden vs output layers
        // Output layer gets higher mutation rate and strength to encourage exploration
        const layerLengths = parent1.neuralNet.layerGenomeLength();
        const outputGenes = layerLengths[layerLengths.length - 1]; // Last layer is output
        const allGenes = child.genes.length;
        
        // Mutate hidden layer genes (all layers except output)
        // Lower mutation rate/strength to preserve learned features
        const hiddenEnd = allGenes - outputGenes - 1;
        child.mutate({
          rate: hiddenRate,
          sigma: hiddenSigma,
          clamp: clamp,
          start: 0,
          end: hiddenEnd
        });

        // Mutate output layer genes (last layer)
        // Higher mutation rate/strength to explore different action strategies
        child.mutate({
          rate: outputRate,
          sigma: outputSigma,
          clamp: clamp,
          start: allGenes - outputGenes,
          end: allGenes - 1
        });
      
        offsprings.push(child);
      }
      return offsprings;
    }

    createRandomGenomes(count) {
      if(this.cars.length === 0) throw new Error('No cars in generation to create random genomes from. Unknown genome length.');
      const randomGenomes = [];
      for (let i = 0; i < count; i++) {
        const randomGenome = new Genome(
          this.cars[0].genome.genes.length
        );
        randomGenome.randomize();
        randomGenomes.push(randomGenome);
      }
      return randomGenomes;
    }

    evolve(config = {}) {
      const { 
        eliteRatio = 0.02, 
        eliminationEpochs = 5, 
        eliminationRate = 0.10 
      } = config;
      const crossoverConfig = config.crossover || {};
      const mutationConfig = config.mutation || {};
      
      const populationSize = this.cars.length;
      const eliteCount = Math.ceil(populationSize * eliteRatio);
      
      // Get elite genomes (top performers)
      const indexedCars = this.sortRankCars();
      
      // Keep elite genomes (clone them to avoid mutation)
      const eliteGenomes = [];
      for (let i = 0; i < Math.min(eliteCount, populationSize); i++) {
        eliteGenomes.push(indexedCars[i].genome.clone());
      }
      
      // Fill the rest of the population with crossover offspring
      const newGenomes = [...eliteGenomes];
      let remainingCount = populationSize - eliteGenomes.length;

      if (this.epoch > 0 && this.epoch % eliminationEpochs === 0) {
        console.log(`Eliminating ${(100*eliminationRate).toFixed(2)}% of genomes`);
        remainingCount -= Math.ceil(remainingCount * eliminationRate);
      }
      
      const offsprings = this.riseOffsprings(remainingCount, crossoverConfig, mutationConfig);
      newGenomes.push(...offsprings);

      // Fill the rest of the population with random genomes
      if (newGenomes.length < populationSize) {
        const randomGenomes = this.createRandomGenomes(populationSize - newGenomes.length);
        newGenomes.push(...randomGenomes);        
      }
      
      const newGeneration = new Generation();
      newGeneration.cars = newGenomes.map(genome => new NeuralCarObject(genome));
      newGeneration.epoch = this.epoch + 1
      newGeneration.scores = Array(this.cars.length).fill(null);
      return newGeneration;
    }
}

export { serializeGeneration, deserializeGeneration, Generation };