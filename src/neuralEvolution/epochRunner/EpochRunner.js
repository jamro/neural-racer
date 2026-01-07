

export default class EpochRunner {
  
  constructor(evolution) {
    this.evolution = evolution;
  }

  async run(generation, simulation) {
    throw new Error('Not implemented! must return generation');
  }


  stop() {

  }

  scaleView(width, height) {

  }
}