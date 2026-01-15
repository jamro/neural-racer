import { calculateScoreComponents, calculateScore } from '../../../src/engine/evolution/fitness';

describe('fitness scoring', () => {
  const mockCar = {
    checkpointsProgress: 0.5,
    calculateAverageSpeed: () => 20,
    model: { maxSpeed: 40 },
  };

  const weights = {
    trackDistance: 2,
    avgSpeedAtFinishLine: 1,
    avgSpeed: 1,
  };

  it('computes weighted components', () => {
    const components = calculateScoreComponents(mockCar, weights);
    expect(components.trackDistance).toBeCloseTo(1);
    expect(components.avgSpeedAtFinishLine).toBe(0); // not finished yet
    expect(components.avgSpeed).toBeCloseTo(0.5);
  });

  it('sums components into total score', () => {
    const total = calculateScore(mockCar, weights);
    expect(total).toBeCloseTo(1.5);
  });
});
