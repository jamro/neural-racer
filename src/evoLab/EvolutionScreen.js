import * as PIXI from 'pixi.js';
import TextButton from '../ui/TextButton';
import GenerationPreview from './GenerationPreview';

class EvolutionScreen extends PIXI.Container {
  constructor(generation, hallOfFame, config) {
    super();

    this.generation = generation;
    this.hallOfFame = hallOfFame;
    this.config = config;

    this.background = new PIXI.Graphics();
    this.background.rect(0, 0, 100, 100);
    this.background.fill({ color: 0x000000 });
    this.addChild(this.background);

    this.evolveButton = new TextButton("Evolve");
    this.evolveButton.on('click', this.evolve, this);
    this.addChild(this.evolveButton);

    this.generationPreview = new GenerationPreview(this.generation);
    this.addChild(this.generationPreview);
    
  }

  evolve(event) {
    const newGeneration = this.generation.evolve(this.hallOfFame, this.config);
    this.emit('evolutionCompleted', newGeneration);
  }

  scaleView(width, height) {
    this.background.clear();
    this.background.rect(0, 0, width, height);
    this.background.fill({ color: 0x000000 });

    this.evolveButton.x = width - this.evolveButton.buttonWidth - 30;
    this.evolveButton.y = height - this.evolveButton.buttonHeight - 30;
    this.generationPreview.x = width / 2;
    this.generationPreview.y = height / 2;
  }
}

export default EvolutionScreen;