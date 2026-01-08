import { serializeGenome } from './Genome';
import NeuralCarObject from '../sim/car/NeuralCarObject';
import { deserializeGenome } from './Genome';

class HallOfFameEntry {
  constructor(car, score, trackName) {
    this.genomeId = car.genome.genomeId;
    this.car = car;
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
      genome: serializeGenome(this.car.genome),
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

  update(car, score, trackName) {
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
        this.updateCar(car, trackEvaluation.bestScore, trackEvaluation.trackName);
      }
      debug.push({globalScore: hofEntry.globalScore, count: hofEntry.allTracksEvaluation.length, ...hofEntry});
    }
    debug.sort((a, b) => b.globalScore - a.globalScore);
    console.log(debug);
  }

  _addEntry(entry) {
    this.trackData[entry.trackName].push(entry);
    this.genomeMap.set(entry.genomeId, entry);
  }

  addCar(car, score, trackName) {
    if(!car || !score || !trackName) {
      return false;
    }

    if(!car.isFinished) { // Only add cars that have finished the track
      return false;
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

    // If below perTrackSize, add the car
    if(trackEntries.length < this._perTrackSize) {
      this._addEntry(new HallOfFameEntry(car, score, trackName));
      // Sort by score descending (highest first) for easier management
      trackEntries.sort((a, b) => b.globalScore - a.globalScore);
      // add to list of all tracks too
      this.updateCar(car, score, trackName);
      return true;
    }

    // If at perTrackSize, only add if score is higher than the lowest
    // Find the lowest score entry
    let lowestScore = trackEntries[0].globalScore;
    let lowestIndex = 0;
    for(let i = 1; i < trackEntries.length; i++) {
      if(trackEntries[i].globalScore < lowestScore) {
        lowestScore = trackEntries[i].globalScore;
        lowestIndex = i;
      }
    }

    // Only add if the new score is higher than the lowest
    if(score > lowestScore) {
      // Remove the lowest-scoring entry
      trackEntries.splice(lowestIndex, 1);
      // Add the new entry
      this._addEntry(new HallOfFameEntry(car, score, trackName));
      // Sort by score descending
      trackEntries.sort((a, b) => b.globalScore - a.globalScore);
      // add to list of all tracks too
      this.updateCar(car, score, trackName);
      return true;
    }
    return false;
  }

  updateCar(car, score, trackName) {
    const genomeId = car.genome.genomeId;
    const entry = this.genomeMap.get(genomeId);
    if(!entry) {
      console.warn(`Car with genomeId ${genomeId} not found in hall of fame`);
      return;
    }
    entry.update(car, score, trackName);
    if(!this._trackEvaluationCount[trackName]) {
      this._trackEvaluationCount[trackName] = 0;
    }
    this._trackEvaluationCount[trackName]++;
  }

  pickRandom(k=1) {
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
    
    // Rank-based sampling without replacement
    const selectedCars = [];
    const availableEntries = [...sortedEntries];
    
    for(let i = 0; i < count; i++) {
      // Calculate rank-based probabilities based on current available entries
      // Rank 1 (best) has highest probability, rank N (worst) has lowest
      // Using linear rank-based: probability proportional to 1/rank
      const weights = availableEntries.map((_, index) => {
        const rank = index + 1; // rank starts at 1 (best entry has rank 1)
        return 1 / rank; // Higher rank (lower number) = higher weight
      });
      
      // Normalize weights to probabilities
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      const probabilities = weights.map(w => w / totalWeight);
      
      // Sample based on probabilities
      const random = Math.random();
      let cumulativeProbability = 0;
      let selectedIndex = 0;
      
      for(let j = 0; j < probabilities.length; j++) {
        cumulativeProbability += probabilities[j];
        if(random <= cumulativeProbability) {
          selectedIndex = j;
          break;
        }
      }
      
      // Get the selected entry
      const selectedEntry = availableEntries[selectedIndex];
      selectedCars.push(selectedEntry.car);
      
      // Remove the selected entry from available entries (without replacement)
      availableEntries.splice(selectedIndex, 1);
    }
    
    return selectedCars;
  }

  getAllGenomeIds() {
    const allEntries = [];
    const tracks = Object.keys(this.trackData);
    for(const track of tracks) {
      const trackEntries = this.trackData[track];
      for(const entry of trackEntries) {
        allEntries.push(entry.car.genome.genomeId);
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
      candidates: allTrackEntries.slice(0, populationMax).map(entry => entry.car.genome)
    }
  }
}