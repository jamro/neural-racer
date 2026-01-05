import { serializeGenome } from './Genome';

export default class HallOfFame {
  constructor() {
    this.hallOfFame = {}
    this._perTrackSize = 30;
    this._minFitnessDistance = 0.001;
  }

  set minFitnessDistance(distance) {
    this._minFitnessDistance = distance;
    
    // Remove entries that are too similar, keeping the better-scoring ones
    const tracks = Object.keys(this.hallOfFame);
    for(const track of tracks) {
      const trackEntries = this.hallOfFame[track];
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
      
      this.hallOfFame[track] = keptEntries;
    }
  }

  get minFitnessDistance() {
    return this._minFitnessDistance;
  }

  set perTrackSize(size) {
    this._perTrackSize = size;
    
    // Trim existing entries to ensure they don't exceed the new limit
    const tracks = Object.keys(this.hallOfFame);
    for(const track of tracks) {
      const trackEntries = this.hallOfFame[track];
      if(trackEntries.length > size) {
        // Sort by score descending (highest first) to ensure correct order
        trackEntries.sort((a, b) => b.score - a.score);
        // Keep only the top 'size' entries, removing the lowest-scoring ones
        this.hallOfFame[track] = trackEntries.slice(0, size);
      }
    }
  }

  get perTrackSize() {
    return this._perTrackSize;
  }

  serialize() {
    const tracks = Object.keys(this.hallOfFame);
    const data = []
    for(const track of tracks) {
      const trackEntries = this.hallOfFame[track];
      // Serialize all entries for this track
      for(const entry of trackEntries) {
        data.push({
          genome: serializeGenome(entry.car.genome),
          bestTrackName: track,
          scoreOnBestTrack: entry.score
        })
      }
    }
    return data;
  }

  addCar(car, score, trackName) {
    if(!car || !score || !trackName) {
      return;
    }

    if(!car.isFinished) { // Only add cars that have finished the track
      return;
    }

    // Initialize the track array if it doesn't exist
    if(!this.hallOfFame[trackName]) {
      this.hallOfFame[trackName] = [];
    }

    const trackEntries = this.hallOfFame[trackName];

    // Check if the new car is sufficiently different from all existing entries
    const isSufficientlyDifferent = trackEntries.every(entry => {
      return Math.abs(score - entry.score) > this._minFitnessDistance;
    });

    if(!isSufficientlyDifferent) {
      return; // Not sufficiently different, don't add
    }

    // If below perTrackSize, add the car
    if(trackEntries.length < this._perTrackSize) {
      trackEntries.push({ car, score });
      // Sort by score descending (highest first) for easier management
      trackEntries.sort((a, b) => b.score - a.score);
      return;
    }

    // If at perTrackSize, only add if score is higher than the lowest
    // Find the lowest score entry
    let lowestScore = trackEntries[0].score;
    let lowestIndex = 0;
    for(let i = 1; i < trackEntries.length; i++) {
      if(trackEntries[i].score < lowestScore) {
        lowestScore = trackEntries[i].score;
        lowestIndex = i;
      }
    }

    // Only add if the new score is higher than the lowest
    if(score > lowestScore) {
      // Remove the lowest-scoring entry
      trackEntries.splice(lowestIndex, 1);
      // Add the new entry
      trackEntries.push({ car, score });
      // Sort by score descending
      trackEntries.sort((a, b) => b.score - a.score);
    }
  }

  pickRandom() {
    const allEntries = [];
    const tracks = Object.keys(this.hallOfFame);
    for(const track of tracks) {
      const trackEntries = this.hallOfFame[track];
      for(const entry of trackEntries) {
        allEntries.push(entry);
      }
    }
    if(allEntries.length === 0) {
      return null;
    }
    return allEntries[Math.floor(Math.random() * allEntries.length)].car;
  }
}