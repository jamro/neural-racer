import { deserializeGenome } from './Genome';


class GenerationHistory {
  constructor() {
    this.tracks = {}
  }

  deserialize(data) {
    this.tracks = {}
    for(const historyEntry of data) {
      if(historyEntry.overallScore.averageScore === null) {
        continue;
      }
      this.addGenerationData(
        historyEntry.trackName, 
        historyEntry.generationId, 
        historyEntry.overallScore, 
        historyEntry.epoch, 
        historyEntry.populationSize, 
        historyEntry.cars ? historyEntry.cars.map(car => ({
          genome: deserializeGenome(car.genome),
          score: car.score,
          stats: car.stats,
        })) : null
      )
    }
  }

  addGenerationData(trackName, generationId, overallScore, epoch, populationSize, carsData=null) {
    if(!this.tracks[trackName]) {
      this.tracks[trackName] = []
    }
    
    const newGenerationData = {
      generationId,
      epoch,
      trackName,
      populationSize,
      overallScore,
      carsData, // { score, stats } 
    };

    // Check if generation already exists in this track
    const existingIndex = this.tracks[trackName].findIndex(gen => gen.generationId === generationId);
    
    if(existingIndex >= 0) {
      // Override existing generation
      this.tracks[trackName][existingIndex] = newGenerationData;
    } else {
      // Add new generation
      this.tracks[trackName].push(newGenerationData);
    }

    this.tracks[trackName].sort((a, b) => a.epoch - b.epoch);
  }

  addGenerationInstance(generation, trackName) {
    this.addGenerationData(
      trackName, 
      generation.generationId, 
      generation.overallScore, 
      generation.epoch, 
      generation.totalCount, 
      generation.cars.map((_, index) => ({
        score: generation.scores[index],
        stats: generation.stats[index],
      }))
    );
  }

  getScoreHistoryForTrack(trackName, fields=['maxScore']) {
    if(!this.tracks[trackName]) {
      return [];
    }
    return this.tracks[trackName].map(gen => {
      const result = fields.reduce((acc, field) => {
        acc[field] = gen.overallScore[field];
        return acc;
      }, {});
      result.epoch = gen.epoch;
      return result;
    });
  }

  isPopulationStagnated(trackName, epochCount=30) {
    const noiseMultiplier = 3.0;
    const minRequiredValid = Math.max(10, Math.floor(epochCount * 0.6));
    const floors = { max: 0.01, median: 0.005, completion: 0.01 };

    const track = this.tracks[trackName];
    if(!track || track.length === 0) return false;

    const validGenerations = track.slice(-epochCount).filter(gen => {
      const s = gen.overallScore;
      return s && s.averageScore !== null && 
             isFinite(s.maxScore) && isFinite(s.medianScore) && isFinite(s.completionRate);
    });

    if(validGenerations.length < minRequiredValid || validGenerations.length < 10) return false;

    const maxScores = validGenerations.map(g => g.overallScore.maxScore);
    const medianScores = validGenerations.map(g => g.overallScore.medianScore);
    const completionRates = validGenerations.map(g => g.overallScore.completionRate);

    const computeEpsilon = (series, floor) => {
      if(series.length < 2) return floor;
      const diffs = series.slice(1).map((v, i) => Math.abs(v - series[i]));
      const sorted = [...diffs].sort((a, b) => a - b);
      return Math.max(floor, noiseMultiplier * sorted[Math.floor(sorted.length / 2)]);
    };

    const epsilons = {
      max: computeEpsilon(maxScores, floors.max),
      median: computeEpsilon(medianScores, floors.median),
      completion: computeEpsilon(completionRates, floors.completion)
    };

    const deltas = {
      max: maxScores[maxScores.length - 1] - maxScores[0],
      median: medianScores[medianScores.length - 1] - medianScores[0],
      completion: completionRates[completionRates.length - 1] - completionRates[0]
    };

    if(maxScores[maxScores.length - 1] < 0.05 && validGenerations.length < epochCount * 0.8) {
      return false;
    }

    const completionSaturated = completionRates[completionRates.length - 1] >= 0.95;
    return deltas.max < epsilons.max && 
           deltas.median < epsilons.median && 
           (completionSaturated || deltas.completion < epsilons.completion);
  }
}

export default GenerationHistory;