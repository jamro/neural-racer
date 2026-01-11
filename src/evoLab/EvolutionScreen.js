import * as PIXI from 'pixi.js';
import TextButton from '../ui/TextButton';
import GenerationPreview from './GenerationPreview';
import TiledBackground from '../sim/track/view/TiledBackground';
import TopBar from './TopBar';
import BottomBar from './BottomBar';
import Genealogy from '../neuralEvolution/Genealogy';

const EVOLVE_ANIMATION_DELAY = 1200;
const EVOLVE_ANIMATION_DELAY_DECAY = 0.7;

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
    this.generationPreview.on('particle-click', ({ particle }) => {
      this.onParticleClick(particle);
    });
    this.generationPreview.on('particle-empty-click', () => {
      this.onParticleClick(null);
    });
    this.activeParticleConnection = null;
    this.genealogy = null

    this.topBar = new TopBar();
    this.topBar.epoch = generation.epoch;
    this.addChild(this.topBar);

    this.bottomBar = new BottomBar();
    this.bottomBar.trackName = this.generation.trackName;
    this.bottomBar.populationSize = this.generation.totalCount;
    this.bottomBar.setStats(
      this.generation.crashedCount, 
      this.generation.finishedCount, 
      this.generation.stats[0].averageSpeed
    );
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
    const genealogy = new Genealogy();
    const newGeneration = this.generation.evolve(this.hallOfFame, this.config, genealogy);
    let delay = EVOLVE_ANIMATION_DELAY
    genealogy.sortRecordsByType(['offspring', 'elite', 'hallOfFame']);
    await new Promise(resolve => setTimeout(resolve, 200));
    const genealogyEntries = genealogy.toArray();
    for(const entry of genealogyEntries) {
      this.generationPreview.addChildParticle(entry.parents, entry.child + "|child", Math.random() * 800 - 400, -150);
      delay *= EVOLVE_ANIMATION_DELAY_DECAY
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    this.nextGeneration = newGeneration;
    this.genealogy = genealogy;
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

  onParticleClick(particle) {
    if (this.activeParticleConnection) {
      this.activeParticleConnection.fadeOut();
      this.activeParticleConnection = null;
    }
    if(!particle || !this.genealogy) return;

    const genomeId = particle.genomeId.replace('|child', '');

    if(particle.particleType === 'parent') {
      const children = this.genealogy.getChildren(genomeId);
      this.activeParticleConnection = this.generationPreview.connectMultipleParticles(genomeId, children.map(id => id + "|child"));
    } else if(particle.particleType === 'child') {
      const parents = this.genealogy.getParents(genomeId);
      this.activeParticleConnection = this.generationPreview.connectMultipleParticles(genomeId + "|child", parents);
    }
      
  }
}

export default EvolutionScreen;