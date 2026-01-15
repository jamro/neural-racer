import {
  normalizeRadarBeams,
  normalizeTimeToCollision,
  normalizeLeftRightBalance,
  normalizeSafeDirection,
  normalizeYawRate,
  normalizeSlipRatio,
  normalizeSpeed,
  calculateTimeToCollision,
  calculateSafeDirection,
  calculateLeftRightBalance,
} from '../../../../src/engine/simulation/car/neuralNormalizer';

describe('neuralNormalizer helpers', () => {
  const radarBeams = [10, 20, 30, 40, 50, 40, 30, 20, 10];
  const angles = [-0.6, -0.4, -0.2, -0.1, 0, 0.1, 0.2, 0.4, 0.6];

  it('normalizes radar beams with decay and nulls', () => {
    const values = normalizeRadarBeams([...radarBeams.slice(0, 8), null]);
    expect(values[0]).toBeGreaterThan(values[1]); // closer beams decay more
    expect(values[8]).toBe(0); // null treated as clear path
  });

  it('computes time to collision using front beams', () => {
    const ttc = calculateTimeToCollision(radarBeams, 10, 4);
    expect(ttc).toBeCloseTo(3.8);
    expect(normalizeTimeToCollision(ttc, false)).toBeGreaterThan(0);
  });

  it('finds safe direction and optional EMA smoothing', () => {
    const angle = calculateSafeDirection(radarBeams, angles, null);
    expect(angle).toBe(0);
    const smoothed = calculateSafeDirection(radarBeams, angles, 0);
    expect(smoothed).toBe(0);
  });

  it('computes left-right balance and clamps to [-1,1]', () => {
    const balance = calculateLeftRightBalance(radarBeams, null);
    expect(balance).toBeLessThan(0); // right side shorter beams
    expect(normalizeLeftRightBalance(balance)).toBeGreaterThanOrEqual(-1);
  });

  it('normalizes motion-related values', () => {
    expect(normalizeYawRate(1, 4)).toBeCloseTo(Math.tanh(2 * 1 / 2));
    expect(normalizeSlipRatio(0.5, 0.5)).toBe(1);
    expect(normalizeSpeed(10, 40)).toBeCloseTo(Math.sqrt(0.25));
  });
});
