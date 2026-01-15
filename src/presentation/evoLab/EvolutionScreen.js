import * as PIXI from 'pixi.js';
import GenerationPreview from './GenerationPreview';
import TiledBackground from '../simulation/track/TiledBackground';
import TopBar from './TopBar';
import BottomBar from './BottomBar';
import Genealogy from '../../engine/evolution/Genealogy';
import ParentCarPreviewPanel from './sidePanel/ParentCarPreviewPanel';
import ChildCarPreviewPanel from './sidePanel/ChildCarPreviewPanel';
import SidePanelController from './sidePanel/SidePanelController';
import EmptyPanel from './sidePanel/EmptyPanel';
import NeuralLab from '../neuralLab/NeuralLab';
import Simulation from '../../engine/simulation/Simulation';
import {Generation} from '../../engine/evolution/Generation';
import NeuralCarObject from '../../engine/simulation/car/NeuralCarObject';

const EVOLVE_ANIMATION_DELAY = 1200;
const EVOLVE_ANIMATION_DELAY_DECAY = 0.7;

class EvolutionScreen extends PIXI.Container {
  constructor(generation, hallOfFame, config, tracks, pixiApp) {
    super();

    this.pixiApp = pixiApp;
    this.tracks = tracks;

    this.nextGeneration = null;
    this.neuralLab = null;
    this.screenWidth = 100;
    this.screenHeight = 100;

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

    this.carPreviewPanel = new SidePanelController();
    this.carPreviewPanel.on("neuralTest", (genome) => this.showNuerualLab(genome));
    this.carPreviewPanel.on("testDrive", (genome) => this.startTestDrive(genome));
    this.addChild(this.carPreviewPanel);
    this.carPreviewPanel.showPanel(EmptyPanel);

    this.topBar = new TopBar();
    this.topBar.epoch = generation.epoch;
    this.addChild(this.topBar);

    this.bottomBar = new BottomBar();
    this.bottomBar.trackName = this.generation.trackName;
    this.bottomBar.populationSize = this.generation.totalCount;
    this.bottomBar.setStats(
      this.generation.crashedCount, 
      this.generation.finishedCount, 
      this.generation.overallScore.averageSpeed
    );
    this.addChild(this.bottomBar);
    this.bottomBar.evolveButton.on('click', async () => await this.evolve());
    this.bottomBar.raceButton.on('click', async () => this.emit('evolutionCompleted', this.nextGeneration, false));
    this.bottomBar.autoPlayButton.on('click', async () => this.emit('evolutionCompleted', this.nextGeneration, true));
    this.bottomBar.evolveButton.enabled = false;
    this.bottomBar.evolveButton.visible = true;

    this.selectedObject = null;
  }

  async initialize() {
    this.carPreviewPanel.showPanel(EmptyPanel, {showEvolveMessage: false});
    await this.generationPreview.initialize(this.generation);
    this.bottomBar.evolveButton.enabled = true;
    if(!this.selectedObject) {
      this.carPreviewPanel.showPanel(EmptyPanel, {showEvolveMessage: true});
    }
  }

  async evolve() {
    if(!this.selectedObject) {
      this.carPreviewPanel.showPanel(EmptyPanel, {showEvolveMessage: false});
    }
    this.bottomBar.evolveButton.enabled = false;
    const genealogy = new Genealogy();
    const newGeneration = this.generation.evolve(this.hallOfFame, this.config.evolve, genealogy);
    let delay = EVOLVE_ANIMATION_DELAY
    genealogy.sortRecordsByType(['offspring', 'elite', 'hallOfFame']);
    this.genealogy = genealogy;
    this.nextGeneration = newGeneration;
    await new Promise(resolve => setTimeout(resolve, 200));
    const genealogyEntries = genealogy.toArray();
    for(const entry of genealogyEntries) {
      this.generationPreview.addChildParticle(entry.parents, entry.child + "|child", Math.random() * 800 - 400, -150);
      delay *= EVOLVE_ANIMATION_DELAY_DECAY
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    this.bottomBar.evolveButton.visible = false;
    this.bottomBar.raceButton.visible = true;
    this.bottomBar.autoPlayButton.visible = true;
  }

  scaleView(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
    this.tiles.renderSync(width, height, 1, 0, 0);
    this.background.clear();
    this.background.rect(0, 0, width, height);
    this.background.fill({ color: 0x000000, alpha: 0.9 });

    const topBarHeight = 40;
    const bottomBarHeight = 70;
    const carPreviewPanelWidth = width * 0.25;

    this.topBar.scaleView(width, topBarHeight);
    this.bottomBar.scaleView(width, bottomBarHeight);
    this.bottomBar.y = height - bottomBarHeight;

    const screenSpaceHeight = height - topBarHeight - bottomBarHeight;
    const screenSpaceWidth = width - carPreviewPanelWidth;
    const scaleW = screenSpaceWidth / this.generationPreview.canvasWidth;
    const scaleH = screenSpaceHeight / this.generationPreview.canvasHeight;
    const scale = Math.min(scaleW, scaleH);
    this.generationPreview.scale.set(scale);
    this.generationPreview.x = screenSpaceWidth / 2 - this.generationPreview.canvasX * scale 
    this.generationPreview.y = height / 2 - this.generationPreview.canvasY * scale;

    this.carPreviewPanel.scaleView(carPreviewPanelWidth, height - bottomBarHeight - topBarHeight)
    this.carPreviewPanel.x = width - carPreviewPanelWidth;
    this.carPreviewPanel.y = topBarHeight;
  }

  onParticleClick(particle) {
    if(!particle) return;
    // deselect current one
    if (this.activeParticleConnection) {
      this.activeParticleConnection.fadeOut();
      this.activeParticleConnection = null;
    }
    if(this.selectedObject) {
      this.selectedObject = null;
    }

    // select new one
    const genomeId = particle.genomeId.replace('|child', '');
    const car1 = this.generation.getCarDetailsByGenomeId(genomeId);
    const car2 = this.nextGeneration ? this.nextGeneration.getCarDetailsByGenomeId(genomeId) : null;
    const carDetails = car1 || car2;
    if(!carDetails) {
      this.carPreviewPanel.showPanel(EmptyPanel, {showEvolveMessage: !this.genealogy});
      return;
    }
  
    this.selectedObject = {
      genomeId: genomeId,
      carName: carDetails.car.genome.fullName,
      type: particle.particleType,
      car: carDetails.car,
      score: carDetails.score || 0,
      progress: carDetails.stats?.progress || 0,
      averageSpeed: carDetails.stats?.averageSpeed || 0,
      topSpeed: carDetails.stats?.topSpeed || 0,
      lapTimeSec: (carDetails.stats?.progress || null) >= 1 ? carDetails.stats?.lifetimeSeconds : null
    }

    if(particle.particleType === 'parent') {
      this.carPreviewPanel.showPanel(ParentCarPreviewPanel, {
        car: this.selectedObject.car,
        carName: this.selectedObject.carName,
        score: this.selectedObject.score,
        progress: this.selectedObject.progress,
        averageSpeed: this.selectedObject.averageSpeed,
        type: this.selectedObject.particleType,
        topSpeed: this.selectedObject.topSpeed,
        lapTimeSec: this.selectedObject.lapTimeSec,
      });
    } else {
      let parents = []
      let source = 'unknown' // possible values: unknown, offspring, elite, hallOfFame, random
      if(this.genealogy) {
        parents = this.genealogy.getParents(genomeId)
          .map(id => {
            let result = this.generation.getCarDetailsByGenomeId(id)
            if(result) return result;

            // check in hall of fame
            // {car, score, stats}
            const hofEntry = this.hallOfFame.getByGenomeId(id);
            if(hofEntry) return {car: new NeuralCarObject(hofEntry.genome.clone()), score: null, stats: {}};

            // check in extra genomes
            const extraGenome = this.genealogy.getExtraGenome(id);
            if(extraGenome) return {car: new NeuralCarObject(extraGenome.clone()), score: null, stats: {}};

            return null
          })
          .filter(parent => parent);

        source = this.genealogy.getChildType(genomeId);
      }

      this.hallOfFame.getByGenomeId(genomeId);
      
      this.carPreviewPanel.showPanel(ChildCarPreviewPanel, {
        car: this.selectedObject.car,
        carName: this.selectedObject.carName,
        type: this.selectedObject.particleType,
        parents: parents,
        source: source,
      });
    }


    if(!this.genealogy) return; 
    // this part works after evolve is called (both parent and child are available)
    if(particle.particleType === 'parent') {
      const children = this.genealogy.getChildren(genomeId);
      this.activeParticleConnection = this.generationPreview.connectMultipleParticles(genomeId, children.map(id => id + "|child"));
    } else if(particle.particleType === 'child') {
      const parents = this.genealogy.getParents(genomeId);
      this.activeParticleConnection = this.generationPreview.connectMultipleParticles(genomeId + "|child", parents);
    }
      
  }

  showNuerualLab(genome) {
    this.neuralLab = new NeuralLab(genome);
    this.addChild(this.neuralLab);
    this.neuralLab.scaleView(this.screenWidth, this.screenHeight);
    this.neuralLab.startRenderLoop();
  }

  startTestDrive(genome) {
    const { 
      simulationStep = 0.05, 
      simulationSpeed = 1, 
      graphicsQuality = "low", 
      scoreWeights = { trackDistance: 1 },
    } = this.config;
    const simulation = new Simulation(this.pixiApp, false);
    simulation.scaleView(this.screenWidth, this.screenHeight);
    this.pixiApp.stage.addChild(simulation.view);

    const track = this.tracks[Math.floor(Math.random() * this.tracks.length)];
    const testDriveGeneration = new Generation();
    testDriveGeneration.setPopulation([genome.clone()]);
    testDriveGeneration.epoch = 1;
    testDriveGeneration.trackName = track.name;

    simulation.simulationSpeedMultiplier = 1
    simulation.setTrack(track); 
    simulation.addGeneration(testDriveGeneration);
    simulation.view.epochDescription = "Test Drive";
    simulation.start(testDriveGeneration.epoch, simulationStep, simulationSpeed, graphicsQuality, scoreWeights); // Start simulation loop
    simulation.onComplete = () => {
      this.pixiApp.stage.removeChild(simulation.view);
      simulation.removeAndDispose();
    };
    simulation.startRender(); // Start render loop
  }
}

export default EvolutionScreen;