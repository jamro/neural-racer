import * as PIXI from 'pixi.js';
import TextButton from '../ui/TextButton';
import GenerationPreview from './GenerationPreview';

const EVOLVE_ANIMATION_DELAY = 5;

class EvolutionScreen extends PIXI.Container {
  constructor(generation, hallOfFame, config) {
    super();

    this.nextGeneration = null;

    this.generation = generation;
    this.hallOfFame = hallOfFame;
    this.config = config;

    this.background = new PIXI.Graphics();
    this.background.rect(0, 0, 100, 100);
    this.background.fill({ color: 0x000000 });
    this.addChild(this.background);

    this.evolveButton = new TextButton("Evolve");
    this.evolveButton.on('click', async () => await this.evolve());
    this.evolveButton.visible = false;
    this.addChild(this.evolveButton);

    this.raceButton = new TextButton("Start Race");
    this.raceButton.on('click', async () => this.emit('evolutionCompleted', this.nextGeneration));
    this.raceButton.visible = false;
    this.addChild(this.raceButton);

    this.generationPreview = new GenerationPreview();
    this.addChild(this.generationPreview);
  }

  async initialize() {
    await this.generationPreview.initialize(this.generation);
    this.evolveButton.visible = true;
  }

  async evolve(event) {
    this.evolveButton.visible = false;
    const genealogy = []
    const newGeneration = this.generation.evolve(this.hallOfFame, this.config, genealogy);
    for(const entry of genealogy) {
      this.generationPreview.addChildParticle(entry.parents, entry.child, Math.random() * 800 - 400, -150);
      await new Promise(resolve => setTimeout(resolve, EVOLVE_ANIMATION_DELAY));
    }
    this.nextGeneration = newGeneration;
    this.raceButton.visible = true;
  }

  scaleView(width, height) {
    this.background.clear();
    this.background.rect(0, 0, width, height);
    this.background.fill({ color: 0x000000 });

    this.evolveButton.x = width - this.evolveButton.buttonWidth - 30;
    this.evolveButton.y = height - this.evolveButton.buttonHeight - 30;

    this.raceButton.x = width - this.raceButton.buttonWidth - 30;
    this.raceButton.y = height - this.raceButton.buttonHeight - 30;

    this.generationPreview.x = width / 2;
    this.generationPreview.y = height / 2;
  }
}

export default EvolutionScreen;