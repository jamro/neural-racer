import GridMap from '../../../../src/engine/simulation/track/GridMap';

describe('GridMap', () => {
  it('packs and unpacks cells consistently', () => {
    const grid = new GridMap(4);
    const key = grid.getCellKey(2, -3);
    expect(key).toBe(grid.getCellKey(2, -3));
  });

  it('gets cells for a segment covering bounding box', () => {
    const grid = new GridMap(4);
    const cells = grid.getCellsForSegment(0, 0, 7, 0);
    // cells should cover x=0..1 when cellSize=4
    const expected = new Set([
      grid.getCellKey(0, 0),
      grid.getCellKey(1, 0),
    ]);
    expect(cells).toEqual(expected);
  });

  it('collects ray traversal cells', () => {
    const grid = new GridMap(4);
    const cells = grid.getCellsForRay(0, 0, 0, 10);
    const keys = [...cells];
    expect(keys).toContain(grid.getCellKey(0, 0));
    expect(keys).toContain(grid.getCellKey(1, 0));
    expect(keys).toContain(grid.getCellKey(2, 0));
  });

  it('indexes segments into grid cells', () => {
    const grid = new GridMap(4);
    grid.addSegmentToGrid(5, 0, 0, 7, 0);
    const segments = grid.getSegmentIndices(grid.getCellKey(1, 0));
    expect(segments).toEqual([5]);
  });
});
