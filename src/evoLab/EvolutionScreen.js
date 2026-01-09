import * as PIXI from 'pixi.js';
import TextButton from '../ui/TextButton';

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
  }

  evolve(event) {
    const newGeneration = this.generation.evolve(this.hallOfFame, this.config);
    this.emit('evolutionCompleted', newGeneration);
  }

  scaleView(width, height) {
    this.background.clear();
    this.background.rect(0, 0, width, height);
    this.background.fill({ color: 0x000000 });

    this.evolveButton.x = width / 2 - this.evolveButton.buttonWidth / 2;
    this.evolveButton.y = height / 2 - this.evolveButton.buttonHeight / 2;
  }
}

export default EvolutionScreen;