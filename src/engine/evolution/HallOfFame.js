import { serializeGenome } from './Genome';
import NeuralCarObject from '../simulation/car/NeuralCarObject';
import { deserializeGenome } from './Genome';

class HallOfFameEntry {
  constructor(genome, score, trackName) {
    this.genomeId = genome.genomeId;
    this.genome = genome;
    this.score = score;
    this.trackName = trackName;
    this.isGeneralist = false;
    this.allTracksEvaluation = [
      { trackName: trackName, bestScore: score }
    ]
    this.globalScore = 0
    this._updateGlobalScore();
  }

  _updateGlobalScore() {
    this.globalScore = this.allTracksEvaluation.reduce((sum, { bestScore }) => {
      let result = 0
      if(bestScore < 1.0) {
        return sum + (-1 + 2 * bestScore);
      } else {
        return sum + bestScore;
      }
    }, 0);

    this.globalScore *= this.allTracksEvaluation.length / (this.allTracksEvaluation.length + 3.5);

    // if all tracks are above 1.0, set isGeneralist to true
    if(this.allTracksEvaluation.every(entry => entry.bestScore > 1.0) && this.allTracksEvaluation.length > 2) {
      this.isGeneralist = true;
    } else {
      this.isGeneralist = false;
    }

    return this.globalScore;
  }

  serialize() {
    return {
      isGeneralist: this.isGeneralist,
      genome: serializeGenome(this.genome),
      globalScore: this.globalScore,
      bestTrackName: this.trackName,
      scoreOnBestTrack: this.score,
      allTracksEvaluation: this.allTracksEvaluation.map(entry => (
        { 
          trackName: entry.trackName, 
          bestScore: entry.bestScore 
        }
      ))
    }
  }

  update(score, trackName) {
    if(trackName === this.trackName && score > this.score) {
      this.score = score;
    }

    // replace existing entry fo this track if score is higher
    const existingEntry = this.allTracksEvaluation.find(entry => entry.trackName === trackName);
    if(existingEntry && score > existingEntry.bestScore) {
      existingEntry.bestScore = score;
    } else if(!existingEntry) {
      this.allTracksEvaluation.push({ trackName: trackName, bestScore: score });
    }
    this._updateGlobalScore();
  }
}

export default class HallOfFame {
  constructor() {
    this.trackData = {}
    this.genomeMap = new Map();
    this._perTrackSize = 30;
    this._minFitnessDistance = 0.001;
    this._trackEvaluationCount = {}
  }

  set minFitnessDistance(distance) {
    this._minFitnessDistance = distance;
    
    // Remove entries that are too similar, keeping the better-scoring ones
    const tracks = Object.keys(this.trackData);
    for(const track of tracks) {
      const trackEntries = this.trackData[track];
      if(trackEntries.length === 0) {
        continue;
      }
      
      // Sort by score descending (highest first) to ensure we keep better scores
      trackEntries.sort((a, b) => b.score - a.score);
      
      // Build a new list keeping only sufficiently different entries
      const keptEntries = [];
      for(const entry of trackEntries) {
        // Check if this entry is sufficiently different from all kept entries
        const isSufficientlyDifferent = keptEntries.every(keptEntry => {
          return Math.abs(entry.score - keptEntry.score) > this._minFitnessDistance;
        });
        
        if(isSufficientlyDifferent) {
          keptEntries.push(entry);
        }
        // If not sufficiently different, skip it (we keep the better-scoring one that's already in keptEntries)
      }
      
      this.trackData[track] = keptEntries;
    }
  }

  get minFitnessDistance() {
    return this._minFitnessDistance;
  }

  set perTrackSize(size) {
    this._perTrackSize = size;
    
    // Trim existing entries to ensure they don't exceed the new limit
    const tracks = Object.keys(this.trackData);
    for(const track of tracks) {
      const trackEntries = this.trackData[track];
      if(trackEntries.length > size) {
        // Sort by score descending (highest first) to ensure correct order
        trackEntries.sort((a, b) => b.globalScore - a.globalScore);
        // Keep only the top 'size' entries, removing the lowest-scoring ones
        this.trackData[track] = trackEntries.slice(0, size);
      }
    }
  }

  get perTrackSize() {
    return this._perTrackSize;
  }

  serialize() {
    const tracks = Object.keys(this.trackData);
    const data = []
    for(const track of tracks) {
      const trackEntries = this.trackData[track];
      // Serialize all entries for this track
      for(const entry of trackEntries) {
        data.push(entry.serialize());
      }
    }
    return data;
  }

  deserialize(data) {
    const debug = [];
    for(const hofEntry of data) {
      const hofGenome = deserializeGenome(hofEntry.genome);
      const hofScore = hofEntry.scoreOnBestTrack;
      const hofTrackName = hofEntry.bestTrackName;
      const car = new NeuralCarObject(hofGenome);
      car.isFinished = true; // Important: set isFinished to true to be considered for hall of fame
      const added = this.addCar(car, hofScore, hofTrackName);
      if(!added) {
        continue;
      }
      const allTracksEvaluation = hofEntry.allTracksEvaluation
      for(const trackEvaluation of allTracksEvaluation) {
        this.updateCar(car.genome, trackEvaluation.bestScore, trackEvaluation.trackName);
      }
      debug.push({globalScore: hofEntry.globalScore, count: hofEntry.allTracksEvaluation.length, ...hofEntry});
    }
    debug.sort((a, b) => b.globalScore - a.globalScore);
    console.log(debug);
  }

  getByGenomeId(genomeId) {
    return this.genomeMap.get(genomeId);
  }

  _addEntry(entry) {
    this.trackData[entry.trackName].push(entry);
    this.genomeMap.set(entry.genomeId, entry);
  }

  addCar(car, score, trackName, extraEvaluations = []) {
    if(!car || !score || !trackName) {
      return false;
    }

    if(!car.isFinished) { // Only add cars that have finished the track
      return false;
    }

    // make sure extraEvaluations containts base evaluation
    if(!extraEvaluations.find(evaluation => evaluation.trackName === trackName && evaluation.score === score)) {
      extraEvaluations.push({ trackName: trackName, score: score });
    }
    if(extraEvaluations.find(evaluation => !evaluation.trackName || !Number.isFinite(evaluation.score))) {
      console.error('Extra evaluations must contain valid trackName and score', extraEvaluations);
      throw new Error('Extra evaluations must contain valid trackName and score');
    }

    // Initialize the track array if it doesn't exist
    if(!this.trackData[trackName]) {
      this.trackData[trackName] = [];
    }

    const trackEntries = this.trackData[trackName];

    // Check if the new car is sufficiently different from all existing entries
    const isSufficientlyDifferent = trackEntries.every(entry => {
      return Math.abs(score - entry.score) > this._minFitnessDistance;
    });

    if(!isSufficientlyDifferent) {
      return false; // Not sufficiently different, don't add
    }

    // Create and add the new entry
    const newEntry = new HallOfFameEntry(car.genome, score, trackName);
    this._addEntry(newEntry);
    
    // add to list of all tracks too
    extraEvaluations.forEach(evaluation => this.updateCar(car.genome, evaluation.score, evaluation.trackName));
    
    // Sort by globalScore descending (highest first)
    trackEntries.sort((a, b) => b.globalScore - a.globalScore);
    
    // Remove the lowest scored entries to keep length within limit
    if(trackEntries.length > this._perTrackSize) {
      // Keep only the top _perTrackSize entries, removing the lowest-scoring ones
      const removedEntries = trackEntries.splice(this._perTrackSize);
      
      // Remove removed entries from genomeMap
      removedEntries.forEach(entry => {
        this.genomeMap.delete(entry.genomeId);
      });
    }
    
    // Check if the newly added entry is still in the list
    const wasAdded = trackEntries.includes(newEntry);
    return wasAdded;
  }

  updateCar(genome, score, trackName) {
    const genomeId = genome.genomeId;
    const entry = this.genomeMap.get(genomeId);
    if(!entry) {
      console.warn(`Car with genomeId ${genomeId} not found in hall of fame`);
      return;
    }
    entry.update(score, trackName);
    if(!this._trackEvaluationCount[trackName]) {
      this._trackEvaluationCount[trackName] = 0;
    }
    this._trackEvaluationCount[trackName]++;
  }

  pickRandom(k=1, options = {}) {
    const allEntries = [];
    const tracks = Object.keys(this.trackData);
    for(const track of tracks) {
      const trackEntries = this.trackData[track];
      for(const entry of trackEntries) {
        allEntries.push(entry);
      }
    }
    if(allEntries.length === 0) {
      return [];
    }
    
    // If requesting more cars than available, return all available
    const count = Math.min(k, allEntries.length);
    
    // Sort entries by globalScore descending (best first)
    const sortedEntries = [...allEntries].sort((a, b) => b.globalScore - a.globalScore);

    // By default: if we pick 2+ entries and generalists exist, always include at least 1 generalist.
    // Callers can override via options.minGeneralists.
    const {
      minGeneralists = (count >= 2 ? 1 : 0),
    } = options || {};

    // Precompute weights based on the global rank in sortedEntries (stable across any subset sampling).
    const weightByGenomeId = new Map();
    for (let i = 0; i < sortedEntries.length; i++) {
      // rank starts at 1 (best entry has rank 1)
      weightByGenomeId.set(sortedEntries[i].genomeId, 1 / (i + 1));
    }

    const sampleWeightedWithoutReplacement = (entries, n) => {
      const picked = [];
      const available = [...entries];
      const targetCount = Math.min(n, available.length);

      for (let i = 0; i < targetCount; i++) {
        const weights = available.map(e => weightByGenomeId.get(e.genomeId) ?? 0);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);

        // Fallback: if weights are degenerate (shouldn't happen), pick uniformly.
        if (totalWeight <= 0) {
          const uniformIndex = Math.floor(Math.random() * available.length);
          picked.push(available[uniformIndex]);
          available.splice(uniformIndex, 1);
          continue;
        }

        const random = Math.random() * totalWeight;
        let cumulative = 0;
        let selectedIndex = 0;
        for (let j = 0; j < weights.length; j++) {
          cumulative += weights[j];
          if (random <= cumulative) {
            selectedIndex = j;
            break;
          }
        }

        picked.push(available[selectedIndex]);
        available.splice(selectedIndex, 1);
      }
      return picked;
    };

    const generalists = sortedEntries.filter(e => e.isGeneralist);
    const specialists = sortedEntries.filter(e => !e.isGeneralist);

    const targetGeneralists = Math.max(0, Math.min(minGeneralists, count, generalists.length));
    const pickedGeneralists = sampleWeightedWithoutReplacement(generalists, targetGeneralists);

    const pickedGenomeIds = new Set(pickedGeneralists.map(e => e.genomeId));
    const remainingPool = [...specialists, ...generalists].filter(e => !pickedGenomeIds.has(e.genomeId));
    const pickedRemainder = sampleWeightedWithoutReplacement(remainingPool, count - pickedGeneralists.length);

    return [...pickedGeneralists, ...pickedRemainder].map(entry => entry.genome);
  }

  getAllGenomeIds() {
    const allEntries = [];
    const tracks = Object.keys(this.trackData);
    for(const track of tracks) {
      const trackEntries = this.trackData[track];
      for(const entry of trackEntries) {
        allEntries.push(entry.genome.genomeId);
      }
    }
    return allEntries;
  }

  getTrackSaturation() {
    const tracks = Object.keys(this._trackEvaluationCount);
    const saturationMap = {}

    for(const track of tracks) {
      saturationMap[track] = this._trackEvaluationCount[track] / Object.values(this.trackData).flat().length
    }
    return saturationMap;
  }

  getEvaluationCandidates(populationMin=20, populationMax=100) {
    const saturationMap = this.getTrackSaturation();
    const saturationRows = Object.keys(saturationMap)
      .map(track => ({track, saturation: saturationMap[track]}))
      .sort((a, b) => a.saturation - b.saturation);

    if(saturationRows.length === 0) {
      return null;
    }

    const leastSaturatedTrack = saturationRows[0].track;
    const allTrackEntries = Object.values(this.trackData)
      .flat()
      .filter(entry => {
        const entryTracks = entry.allTracksEvaluation.map(evaluation => evaluation.trackName);
        return !entryTracks.includes(leastSaturatedTrack);
      })


    if(allTrackEntries.length < populationMin) {
      return null;
    }
    
    return {
      trackName: leastSaturatedTrack,
      candidates: allTrackEntries.slice(0, populationMax).map(entry => entry.genome)
    }
  }
}