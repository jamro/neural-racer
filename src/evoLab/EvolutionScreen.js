import * as PIXI from 'pixi.js';
import TextButton from '../ui/TextButton';
import GenerationPreview from './GenerationPreview';
import TiledBackground from '../sim/track/view/TiledBackground';
import TopBar from './TopBar';
import BottomBar from './BottomBar';

const EVOLVE_ANIMATION_DELAY = 1200;
const EVOLVE_ANIMATION_DELAY_DECAY = 0.7;

function sortGenealogy(arr) {
  const typeOrder = {
    'offspring': 0,
    'elite': 1,
    'hallOfFame': 2
  };
  
  arr.sort((a, b) => {
    const orderA = typeOrder.hasOwnProperty(a.type) ? typeOrder[a.type] : 3;
    const orderB = typeOrder.hasOwnProperty(b.type) ? typeOrder[b.type] : 3;
    return orderA - orderB;
  });
}

class EvolutionScreen extends PIXI.Container {
  constructor(generation, hallOfFame, config) {
    super();

    this.nextGeneration = null;

    this.generation = generation;
    this.hallOfFame = hallOfFame;
    this.config = config;

    this.tiles = new TiledBackground()
    this.addChild(this.tiles);

    this.background = new PIXI.Graphics();
    this.background.rect(0, 0, 100, 100);
    this.background.fill({ color: 0x000000 });
    this.addChild(this.background);

    this.generationPreview = new GenerationPreview();
    this.addChild(this.generationPreview);

    this.topBar = new TopBar();
    this.topBar.epoch = generation.epoch;
    this.addChild(this.topBar);

    this.bottomBar = new BottomBar();
    this.bottomBar.trackName = this.generation.trackName;
    this.bottomBar.populationSize = this.generation.totalCount;
    this.addChild(this.bottomBar);
    this.bottomBar.evolveButton.on('click', async () => await this.evolve());
    this.bottomBar.raceButton.on('click', async () => this.emit('evolutionCompleted', this.nextGeneration, false));
    this.bottomBar.autoPlayButton.on('click', async () => this.emit('evolutionCompleted', this.nextGeneration, true));
    this.bottomBar.evolveButton.enabled = false;
    this.bottomBar.evolveButton.visible = true;
  }

  async initialize() {
    await this.generationPreview.initialize(this.generation);
    this.bottomBar.evolveButton.enabled = true;
  }

  async evolve(event) {
    this.bottomBar.evolveButton.enabled = false;
    const genealogy = []
    const newGeneration = this.generation.evolve(this.hallOfFame, this.config, genealogy);
    let delay = EVOLVE_ANIMATION_DELAY
    sortGenealogy(genealogy)
    await new Promise(resolve => setTimeout(resolve, 200));
    for(const entry of genealogy) {
      this.generationPreview.addChildParticle(entry.parents, entry.child + "|child", Math.random() * 800 - 400, -150);
      delay *= EVOLVE_ANIMATION_DELAY_DECAY
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    this.nextGeneration = newGeneration;
    this.bottomBar.evolveButton.visible = false;
    this.bottomBar.raceButton.visible = true;
    this.bottomBar.autoPlayButton.visible = true;
  }

  scaleView(width, height) {
    this.tiles.renderSync(width, height, 1, 0, 0);
    this.background.clear();
    this.background.rect(0, 0, width, height);
    this.background.fill({ color: 0x000000, alpha: 0.9 });

    const topBarHeight = 70;
    const bottomBarHeight = 70;

    this.topBar.scaleView(width, topBarHeight);
    this.bottomBar.scaleView(width, bottomBarHeight);
    this.bottomBar.y = height - bottomBarHeight;

    const screenSpaceHeight = height - topBarHeight - bottomBarHeight;
    const scaleW = width / this.generationPreview.canvasWidth;
    const scaleH = screenSpaceHeight / this.generationPreview.canvasHeight;
    const scale = Math.min(scaleW, scaleH);
    this.generationPreview.scale.set(scale);
    this.generationPreview.x = width / 2 - this.generationPreview.canvasX * scale;
    this.generationPreview.y = height / 2 - this.generationPreview.canvasY * scale;
  }
}

export default EvolutionScreen;