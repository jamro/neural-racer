import TrackSegments from '../../../../src/engine/simulation/track/TrackSegments';

describe('TrackSegments', () => {
  it('returns closest ray intersection distance', () => {
    const segments = new TrackSegments();
    segments.addSegment(5, -1, 5, 1); // vertical line at x=5

    const dist = segments.rayIntersectionsMinLength(0, 0, 0);
    expect(dist).toBeCloseTo(5);
  });

  it('returns null when ray misses all segments', () => {
    const segments = new TrackSegments();
    segments.addSegment(5, -1, 5, 1);

    const dist = segments.rayIntersectionsMinLength(0, 0, Math.PI / 2);
    expect(dist).toBeNull();
  });

  it('detects box collision with segment', () => {
    const segments = new TrackSegments();
    segments.addSegment(2, 0, 4, 0);

    const hitIndex = segments.isBoxColliding(3, 0, 2, 2, 0);
    expect(hitIndex).toBe(0);
  });
});
