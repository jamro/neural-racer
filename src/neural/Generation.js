import NeuralCarObject from '../car/NeuralCarObject';

class Generation {
    constructor(track, genomes=null, epoch=0) {
      this.track = track;
      if (genomes) {
        this.cars = genomes.map(genome => new NeuralCarObject(track, genome));
      } else {
        this.cars = [];
      }
      this.genomes = this.cars.map(car => car.genome);
      this.epoch = epoch;
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
}

export default Generation;