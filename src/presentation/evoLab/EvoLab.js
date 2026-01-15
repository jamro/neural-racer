import { Container } from 'pixi.js';
import EvolutionScreen from './EvolutionScreen';
import { setAutoEvolveSetting } from '../../loaders/settings';

class EvoLab extends Container {
  constructor() {
    super();

    this.evoScreen = null
    this.screenWidth = 100;
    this.screenHeight = 100;
  }

  async evolve(generation, hallOfFame, config, tracks, pixiApp) {
    if(!this.parent)  {
      throw new Error('EvoLab must be added to the stage');
    }
    this.parent.setChildIndex(this, this.parent.children.length - 1);
    if(this.evoScreen) {
      this.removeChild(this.evoScreen);
    }
    this.evoScreen = new EvolutionScreen(generation, hallOfFame, config, tracks, pixiApp);
    this.addChild(this.evoScreen);
    this.evoScreen.scaleView(this.screenWidth, this.screenHeight);
    await this.evoScreen.initialize(generation);

    const [newGeneration, autoPlay] = await new Promise(resolve => this.evoScreen.on('evolutionCompleted', (newGeneration, autoPlay) => resolve([newGeneration, autoPlay])));
    this.removeChild(this.evoScreen);
    // Pixi v8: ensure GraphicsContext is destroyed (prevents _gpuContextHash growth)
    this.evoScreen.destroy({children: true, texture: false, baseTexture: false, context: true});
    this.evoScreen = null;

    if(autoPlay) {
      setAutoEvolveSetting(true);
    }
    return newGeneration;
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