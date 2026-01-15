import NeuralCarObject from '../simulation/car/NeuralCarObject';
import { Genome, serializeGenome, deserializeGenome } from './Genome';
import { calculateScore } from './fitness';
import { v4 as uuidv4 } from 'uuid';
import Genealogy from './Genealogy';

function serializeGeneration(generation) {
  return {
    generationId: generation.generationId,
    trackName: generation.trackName, // keep track to restore generation history
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
  generation.trackName = data.trackName;
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
      this.trackName = null;
      this.scores = Array(this.cars.length).fill(null);
      this.stats = Array(this.cars.length).fill(null);

      this.overallScore = {
        averageScore: null,
        medianScore: null,
        percentile25Score: null,
        percentile75Score: null,
        minScore: null,
        maxScore: null,
        completionRate: null,
        averageSpeed: null,
      }
    }

    getLeaders(k=1) {
      // Return consistent format even when empty
      if (this.cars.length === 0 || k <= 0) return [[], []];
      
      // Check if any scores have been calculated
      const hasScores = this.scores.some(score => score !== null);
      if (!hasScores) return [[], []];
      
      const rankedCars = this.sortRankCars();
      const topK = rankedCars.slice(0, Math.min(k, rankedCars.length));
      const leaders = topK.map(item => item.car);
      const leadersScores = topK.map(item => item.score);
      return [leaders, leadersScores];
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
          topSpeed: car.topSpeed,
          lifetimeSeconds: car.lifetimeSeconds,
        }
      }

      this.calculateOverallScore();
    }

    calculateOverallScore() {
      if(!this.scores.every(score => score !== null)) {
        throw new Error('Scores are not calculated yet');
      }
      if(!this.stats.every(stat => stat !== null)) {
        throw new Error('Stats are not calculated yet');
      }
      const sortedScores = [...this.scores].sort((a, b) => a - b);

      this.overallScore = {
        averageScore: this.scores.reduce((a, b) => a + b, 0) / this.cars.length,
        medianScore: sortedScores[Math.floor(this.scores.length / 2)],
        percentile25Score: sortedScores[Math.floor(this.scores.length * 0.25)],
        percentile75Score: sortedScores[Math.floor(this.scores.length * 0.75)],
        minScore: sortedScores[0],
        maxScore: sortedScores[sortedScores.length - 1],
        completionRate: this.finishedCount / this.cars.length,
        averageSpeed: this.stats.reduce((a, b) => a + b.averageSpeed * b.progress, 0) / this.stats.reduce((a, b) => a + b.progress, 0),
      }
    }

    getHallOfFameCarsAndScores(hallOfFame) {
      const hallOfFameGenomeIds = hallOfFame.getAllGenomeIds();
      const hallOfFameGenomeIdMap = new Map(hallOfFameGenomeIds.map(id => [id, true]));
      const result = [];
      for(let i = 0; i < this.cars.length; i++) {
        const car = this.cars[i]; 
        if(hallOfFameGenomeIdMap.has(car.genome.genomeId)) {
          result.push({
            car: car,
            score: this.scores[i],
          });
        }
      }
      return result;
    }

    resetScores() {
      this.scores = Array(this.cars.length).fill(null);
      this.stats = Array(this.cars.length).fill(null);
      this.overallScore = {
        averageScore: null,
        medianScore: null,
        percentile25Score: null,
        percentile75Score: null,
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

    riseOffsprings(count, crossoverConfig, mutationConfig, hallOfFame, genealogy, eliminationRate = 0) {
      const { 
        blendRatio = 0.7, 
        selectionTournamentSize = 5,
        hallOfFameSelectionProbability = 0.10
      } = crossoverConfig;
      const { 
        hiddenRate = 0.03, 
        hiddenSigma = 0.12,
        outputRate = 0.08,
        outputSigma = 0.20,
        clamp = null
      } = mutationConfig;
      const offsprings = [];
      let hofCandidates
      for (let i = 0; i < count; i++) {
        let parent1 = null;
        let parent2 = null;

        if(Math.random() < hallOfFameSelectionProbability) {
          hofCandidates = hallOfFame.pickRandom(1);
          if(hofCandidates.length > 0) {
            parent1 = new NeuralCarObject(hofCandidates[0].clone(true));
          }
        } else if(eliminationRate > 0 && Math.random() < eliminationRate) {
          const randomGenome = new Genome(
            this.cars[0].genome.genes.length
          );
          randomGenome.randomize();
          parent1 = new NeuralCarObject(randomGenome);
          genealogy.storeExtraGenome(randomGenome);
          console.log('Random genome injected as parent');
        }

        // Select two different parents using tournament selection
        if(parent1 === null) {
          parent1 = this.tournamentSelection(selectionTournamentSize);
        }
        parent2 = this.tournamentSelection(selectionTournamentSize);
        
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
        genealogy.add(
          child.genomeId,
          [parent1.genome.genomeId, parent2.genome.genomeId],
          'offspring'
        );
      }
      return offsprings;
    }

    evolve(hallOfFame, config = {}, genealogy = new Genealogy()) {
      const { 
        eliteRatio = 0.02, 
        eliminationEpochs = 5, 
        eliminationRate = 0.10,
        hallOfFameEliteRatio = 0.01
      } = config;
      const crossoverConfig = config.crossover || {};
      const mutationConfig = config.mutation || {};
      
      const populationSize = this.cars.length;
      const eliteCount = Math.ceil(populationSize * eliteRatio);
      const hofEliteCount = Math.ceil(populationSize * hallOfFameEliteRatio);
      
      // Get elite genomes (top performers)
      const indexedCars = this.sortRankCars();
      
      // Keep elite genomes (clone them to avoid mutation)
      const eliteGenomes = [];
      for (let i = 0; i < Math.min(eliteCount, populationSize); i++) {
        const eliteClone = indexedCars[i].genome.clone()
        eliteGenomes.push(eliteClone);
        genealogy.add(
          eliteClone.genomeId,
          [indexedCars[i].genome.genomeId],
          'elite'
        );
      }

      // Get elite genomes from hall of fame
      const hofEliteGenomes = hallOfFame.pickRandom(hofEliteCount).map(genome => genome.clone(true));
      eliteGenomes.push(...hofEliteGenomes);
      for(let i = 0; i < hofEliteGenomes.length; i++) {
        genealogy.add(
          hofEliteGenomes[i].genomeId,
          [hofEliteGenomes[i].genomeId],
          'hallOfFame'
        );
      }
      
      // Fill the rest of the population with crossover offspring
      const newGenomes = [...eliteGenomes];
      let remainingCount = populationSize - eliteGenomes.length

      const offsprings = this.riseOffsprings(remainingCount, crossoverConfig, mutationConfig, hallOfFame, genealogy, this.epoch % eliminationEpochs === 0 ? eliminationRate : 0);
      newGenomes.push(...offsprings);
      
      const newGeneration = new Generation();
      newGeneration.cars = newGenomes.map(genome => new NeuralCarObject(genome));
      newGeneration.epoch = this.epoch + 1
      newGeneration.scores = Array(this.cars.length).fill(null);
      return newGeneration;
    }

    getCarByGenomeId(genomeId) {
      return this.cars.find(car => car.genome.genomeId === genomeId);
    }

    getCarDetailsByGenomeId(genomeId) {
      const car = this.getCarByGenomeId(genomeId);
      if(!car) return null;
      const carIndex = this.cars.indexOf(car);
      return {
        car: car,
        score: this.scores[carIndex],
        stats: this.stats[carIndex],
      };
    }
}

export { serializeGeneration, deserializeGeneration, Generation };