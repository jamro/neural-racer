import './index.css';
import * as PIXI from 'pixi.js';
import Evolution from './neural/Evolution';
import loadTrackFromSvg from './sim/loadTrackFromSvg';

// Create and initialize the application
const app = new PIXI.Application();

await app.init({
    resizeTo: window,
    backgroundColor: 0x1099bb,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
});

// Add the canvas to the DOM
document.getElementById('app').appendChild(app.canvas);

// Create a simple test graphic to verify everything works
const track = await loadTrackFromSvg('assets/track.svg');
const evolution = new Evolution(app, track);

const scoreWeights = {
  avgSpeedAtFinishLine: 3,
  trackDistance: 1,
  speedingPenalty: 0,
  avgSpeed: 1
};

const standardConfig = {
  populationSize: 100,
  simulationStep: 0.1,
  scoreWeights: scoreWeights,
  evolve: {
    eliteRatio: 0.03,  // percentage of top performing genomes to carry over to next generation
    eliminationEpochs: 10,  // how often eliminate the weakest genomes and replace with random ones
    eliminationRate: 0.05, // percentage of weakest genomes to eliminate every `eliminationEpochs` epochs 
    crossover: {
      selectionTournamentSize: 5, // size of tournament selection group of genomes to select the best one for crossover
      blendRatio: 0.7 // percentage blend crossovers, the remaining percentage is uniform crossover
    },
    mutation: {
      rate: 0.03, // probability of mutating a gene
      sigma: 0.12 // standard deviation of the mutation
    }
  }
};

const exploratoryConfig = {
  populationSize: 100,
  simulationStep: 0.1,
  scoreWeights: scoreWeights,
  evolve: {
    eliteRatio: 0.01,  // percentage of top performing genomes to carry over to next generation
    eliminationEpochs: 5,  // how often eliminate the weakest genomes and replace with random ones
    eliminationRate: 0.20, // percentage of weakest genomes to eliminate every `eliminationEpochs` epochs 
    crossover: {
      selectionTournamentSize: 2, // size of tournament selection group of genomes to select the best one for crossover
      blendRatio: 0.25 // percentage blend crossovers, the remaining percentage is uniform crossover
    },
    mutation: {
      rate: 0.06, // probability of mutating a gene
      sigma: 0.20 // standard deviation of the mutation
    }
  }
};

evolution.initialize(standardConfig);

// Initialize keyboard controller
//const keyboardController = new KeyboardController(car);

console.log('PixiJS application initialized!');

evolution.start();

// Hot Module Replacement
if (module.hot) {
    module.hot.accept();
    
    module.hot.dispose(() => {
        evolution.stop();
        app.destroy(true, {
            children: true,
            texture: true,
            baseTexture: true,
        });
    });
}

