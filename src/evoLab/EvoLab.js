import * as PIXI from 'pixi.js';
import EvolutionScreen from './EvolutionScreen';

class EvoLab extends PIXI.Container {
  constructor() {
    super();

    this.evoScreen = null
    this.screenWidth = 100;
    this.screenHeight = 100;
  }

  async evolve(generation, hallOfFame, config) {
    if(!this.parent)  {
      throw new Error('EvoLab must be added to the stage');
    }
    this.parent.setChildIndex(this, this.parent.children.length - 1);
    if(this.evoScreen) {
      this.removeChild(this.evoScreen);
    }
    this.evoScreen = new EvolutionScreen(generation, hallOfFame, config);
    this.addChild(this.evoScreen);
    this.evoScreen.scaleView(this.screenWidth, this.screenHeight);

    return await new Promise(resolve => this.evoScreen.on('evolutionCompleted', (newGeneration) => resolve(newGeneration)));
  }

  scaleView(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
    if(this.evoScreen) {
      this.evoScreen.scaleView(width, height);
    }
  }
}

export default EvoLab;