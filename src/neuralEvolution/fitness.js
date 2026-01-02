


function calculateScoreComponents(car, scoreWeights) {
  // calculate distance progress score
  const distanceProgressScore = car.checkpointsProgress;

  // speed score
  let speedScore = (car.calculateAverageSpeed() / car.model.maxSpeed);
  speedScore = Math.max(0, Math.min(1, speedScore));
  const speedScoreAtFinishLine = (distanceProgressScore >= 1) ? speedScore : 0;

  // calculate total score
  return {
    trackDistance: (scoreWeights.trackDistance || 0) * distanceProgressScore,
    avgSpeedAtFinishLine: (scoreWeights.avgSpeedAtFinishLine || 0) * speedScoreAtFinishLine,
    avgSpeed: (scoreWeights.avgSpeed || 0) * speedScore,
  }
}

function calculateScore(car, scoreWeights, scoreComponents=null) {
  const components = scoreComponents || calculateScoreComponents(car, scoreWeights);
  const values = Object.values(components);
  const total = values.reduce((a, b) => a + b, 0);
  return total;
}

export { calculateScoreComponents, calculateScore };