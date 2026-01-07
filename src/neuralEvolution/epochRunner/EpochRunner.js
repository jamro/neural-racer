

export default class EpochRunner {
  
  constructor(evolution, allTracks) {
    this.evolution = evolution;
    this.allTracks = allTracks;
  }

  async run(generation, simulation) {
    throw new Error('Not implemented! must return generation');
  }

  serialize() {
    throw new Error('Not implemented! must return serialized data');
  }

  deserialize(data) {
    throw new Error('Not implemented! must deserialize data');
  }

  stop() {

  }

  scaleView(width, height) {

  }
}