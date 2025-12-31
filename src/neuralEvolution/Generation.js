import NeuralCarObject from '../sim/car/NeuralCarObject';
import Genome from './Genome';
import { calculateScore } from './fitness';

class Generation {
    constructor(track) {
      this.track = track;
      this.cars = [];
      this.epoch = 1
      this.parent = null;
      this.scores = Array(this.cars.length).fill(null);
    }

    store(filename) {
      try {
        // Serialize genomes (convert Float32Array to regular array)
        const serializedGenomes = this.cars.map(car => 
          Array.from(car.genome.genes)
        );
        
        const data = {
          genomes: serializedGenomes,
          epoch: this.epoch,
          scores: this.scores
        };
        
        localStorage.setItem(filename, JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Failed to store generation:', error);
        return false;
      }
    }

    load(filename) {
      try {
        const storedData = localStorage.getItem(filename);
        if (!storedData) {
          return false;
        }
        
        const data = JSON.parse(storedData);
        
        // Deserialize genomes (convert arrays back to Float32Array and create Genome objects)
        const genomes = data.genomes.map(genesArray => 
          new Genome(genesArray.length, new Float32Array(genesArray))
        );
        
        // Restore epoch and scores
        this.epoch = data.epoch;
        this.scores = data.scores;
        
        // Restore cars
        this.cars = genomes.map(genome => new NeuralCarObject(this.track, genome));
        
        return true;
      } catch (error) {
        console.error('Failed to load generation:', error);
        return false;
      }
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

    setTrack(track) {
      this.track = track;
    }

    initialize(populationSize=100) {
      this.cars = [];
      for (let i = 0; i < populationSize; i++) {
        this.cars.push(new NeuralCarObject(this.track));
      }
    }

    calculateScores(scoreWeights) {
      this.scores = Array(this.cars.length).fill(null);
      for (let i = 0; i < this.cars.length; i++) {
        const car = this.cars[i];
        this.scores[i] = calculateScore(car, scoreWeights);
      }
    }

    resetScores() {
      this.scores = Array(this.cars.length).fill(null);
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
      
      const newGeneration = new Generation(this.track);
      newGeneration.cars = newGenomes.map(genome => new NeuralCarObject(this.track, genome));
      newGeneration.epoch = this.epoch + 1
      newGeneration.parent = this;
      newGeneration.scores = Array(this.cars.length).fill(null);
      return newGeneration;
    }
}

export default Generation;