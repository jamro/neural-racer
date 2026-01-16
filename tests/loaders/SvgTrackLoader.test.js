/**
 * @jest-environment jsdom
 */
import SvgTrackLoader from '../../src/resources/loaders/track/SvgTrackLoader';

jest.mock('../../src/engine/simulation/track/TrackObject', () => {
  return jest.fn().mockImplementation(() => ({
    addSegment: jest.fn(),
    addCheckpoint: jest.fn(),
    addTrackGraphic: jest.fn(),
    addTrackShape: jest.fn(),
  }));
});

describe('SvgTrackLoader', () => {
  describe('parseTransform', () => {
    it('returns defaults when no transform', () => {
      const result = SvgTrackLoader.parseTransform('', 5, 6);
      expect(result).toEqual({ x: 5, y: 6, scaleX: 1, scaleY: 1, rotation: 0 });
    });

    it('applies rotation then scale', () => {
      const { x, y, scaleX, scaleY, rotation } = SvgTrackLoader.parseTransform('rotate(90) scale(2)', 1, 0);
      expect(scaleX).toBeCloseTo(2);
      expect(scaleY).toBeCloseTo(2);
      expect(rotation).toBeCloseTo(Math.PI / 2);
      expect(x).toBeCloseTo(0);
      expect(y).toBeCloseTo(2);
    });

    it('throws on translate usage', () => {
      expect(() => SvgTrackLoader.parseTransform('translate(10, 0)', 0, 0))
        .toThrow('translate() transform is not supported');
    });
  });

  describe('getSegmentsFromPathGroup', () => {
    it('extracts line segments from group paths', () => {
      const svg = new DOMParser().parseFromString(
        `<svg xmlns="http://www.w3.org/2000/svg">
          <g id="walls">
            <path d="M0 0 L10 0 L10 10" />
          </g>
        </svg>`,
        'image/svg+xml'
      );

      const segments = SvgTrackLoader.getSegmentsFromPathGroup(svg, 'walls');
      expect(segments.length).toBeGreaterThan(0);
      expect(segments[0]).toEqual({ ax: 0, ay: 0, bx: 10, by: 0 });
    });
  });

  describe('getTrackGraphicsFromPathGroup', () => {
    it('returns image and path graphics', () => {
      const svg = new DOMParser().parseFromString(
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <g id="graphics">
            <image xlink:href="/textures/road.png" x="1" y="2" width="3" height="4" />
            <path d="M0 0 L0 5" />
          </g>
        </svg>`,
        'image/svg+xml'
      );

      const graphics = SvgTrackLoader.getTrackGraphicsFromPathGroup(svg, 'graphics');
      expect(graphics).toHaveLength(2);
      const image = graphics.find(g => g.type === 'image');
      const path = graphics.find(g => g.type === 'path');

      expect(image).toMatchObject({
        filename: 'road',
        x: 1,
        y: 2,
        width: 3,
        height: 4,
      });
      expect(Array.isArray(path.segments)).toBe(true);
      expect(path.segments.length).toBeGreaterThan(0);
    });
  });
});
