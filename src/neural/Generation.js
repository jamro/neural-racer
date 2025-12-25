import NeuralCarObject from '../car/NeuralCarObject';
import Genome from './Genome';

class Generation {
    constructor(track, genomes=null, parent=null) {
      this.track = track;
      if (genomes) {
        this.cars = genomes.map(genome => new NeuralCarObject(track, genome));
      } else {
        this.cars = [];
      }
      this.genomes = this.cars.map(car => car.genome);
      this.epoch = parent ? parent.epoch + 1 : 0;
      this.parent = parent;
      this.scores = Array(this.cars.length).fill(null);
    }

    get activeCount() {
      return this.cars.filter(car => !car.isCrashed).length;
    }

    get totalCount() {
      return this.cars.length;
    }

    initialize(populationSize=100) {
      this.cars = [];
      for (let i = 0; i < populationSize; i++) {
        this.cars.push(new NeuralCarObject(this.track));
      }
      this.genomes = this.cars.map(car => car.genome);
    }

    findLeader() {
      let leader = this.cars.length > 0 ? this.cars[0] : null;
      let leaderScore = 0;
      for (const car of this.cars) {
        const score = car.calculateScore();
        if (score > leaderScore) {
          leader = car;
          leaderScore = score;
        }
      }
      return leader;
    }

    calculateScores() {
      this.scores = Array(this.cars.length).fill(null);
      for (let i = 0; i < this.cars.length; i++) {
        const car = this.cars[i];
        this.scores[i] = car.calculateScore();
      }
    }

    resetScores() {
      this.scores = Array(this.cars.length).fill(null);
    }

    tournamentSelection(k=2) {
      // Randomly select k individuals for the tournament
      const tournamentIndices = [];
      for (let i = 0; i < k; i++) {
        tournamentIndices.push(Math.floor(Math.random() * this.genomes.length));
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
      
      return this.genomes[winnerIndex];
    }

    sortGenomes() {
      const indexedGenomes = this.genomes.map((genome, index) => ({
        genome,
        score: this.scores[index] ?? -Infinity,
        index
      }));
      indexedGenomes.sort((a, b) => b.score - a.score);
      return indexedGenomes;
    }

    riseOffsprings(count) {
      const offsprings = [];
      for (let i = 0; i < count; i++) {
        // Select two different parents using tournament selection
        let parent1 = this.tournamentSelection();
        let parent2 = this.tournamentSelection();
        
        // Ensure parents are different (avoid self-crossover)
        let attempts = 0;
        while (parent1 === parent2 && attempts < 10) {
          parent2 = this.tournamentSelection();
          attempts++;
        }
        
        // Create child through crossover
        const child = Genome.crossoverHybrid(parent1, parent2);
        
        // Apply mutation
        child.mutate();
        
        offsprings.push(child);
      }
      return offsprings;
    }

    createRandomGenomes(count) {
      const randomGenomes = [];
      for (let i = 0; i < count; i++) {
        const randomGenome = new Genome(
          this.genomes[0].genes.length
        );
        randomGenome.randomize();
        randomGenomes.push(randomGenome);
      }
      return randomGenomes;
    }

    evolve(eliteRatio=0.02, eliminationEpochs=5, eliminationRate=0.10) {
      const populationSize = this.genomes.length;
      const eliteCount = Math.ceil(populationSize * eliteRatio);
      
      // Get elite genomes (top performers)
      const indexedGenomes = this.sortGenomes();
      
      // Keep elite genomes (clone them to avoid mutation)
      const eliteGenomes = [];
      for (let i = 0; i < Math.min(eliteCount, populationSize); i++) {
        eliteGenomes.push(indexedGenomes[i].genome.clone());
      }
      
      // Fill the rest of the population with crossover offspring
      const newGenomes = [...eliteGenomes];
      let remainingCount = populationSize - eliteGenomes.length;

      if (this.epoch > 0 && this.epoch % eliminationEpochs === 0) {
        console.log(`Eliminating ${(100*eliminationRate).toFixed(2)}% of genomes`);
        remainingCount -= Math.ceil(remainingCount * eliminationRate);
      }
      
      const offsprings = this.riseOffsprings(remainingCount);
      newGenomes.push(...offsprings);

      // Fill the rest of the population with random genomes
      if (newGenomes.length < populationSize) {
        const randomGenomes = this.createRandomGenomes(populationSize - newGenomes.length);
        newGenomes.push(...randomGenomes);        
      }
      
      const newGeneration = new Generation(this.track, newGenomes, this);
      return newGeneration;
    }
}

export default Generation;