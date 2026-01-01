

class GenerationHistory {
  constructor() {
    this.tracks = {

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
      carsData, // { genome, score, stats } 
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

  addGenerationInstance(generation) {
    this.addGenerationData(
      generation.track.name, 
      generation.generationId, 
      generation.overallScore, 
      generation.epoch, 
      generation.totalCount, 
      generation.cars.map((car, index) => ({
        genome: car.genome,
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
}

export default GenerationHistory;