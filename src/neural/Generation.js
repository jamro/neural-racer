import NeuralCarObject from '../car/NeuralCarObject';

class Generation {
    constructor(track, genomes=null) {
      this.track = track;
      if (genomes) {
        this.cars = genomes.map(genome => new NeuralCarObject(track, genome));
      } else {
        this.cars = [];
      }
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