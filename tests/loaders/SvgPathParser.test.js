import SvgPathParser from '../../src/resources/loaders/track/SvgPathParser';

describe('SvgPathParser', () => {
  describe('parsePathToSegments', () => {
    it('handles absolute lines and closes path', () => {
      const cmds = SvgPathParser.parsePathData('M0 0 L10 0 L10 10 Z');
      const segments = SvgPathParser.parsePathToSegments(cmds);

      expect(segments).toHaveLength(3);
      expect(segments[0]).toEqual({ ax: 0, ay: 0, bx: 10, by: 0 });
      expect(segments[1]).toEqual({ ax: 10, ay: 0, bx: 10, by: 10 });
      expect(segments[2]).toEqual({ ax: 10, ay: 10, bx: 0, by: 0 });
    });

    it('handles relative horizontal and vertical commands', () => {
      const cmds = SvgPathParser.parsePathData('M5 5 h5 v5');
      const segments = SvgPathParser.parsePathToSegments(cmds);

      expect(segments).toHaveLength(2);
      expect(segments[0]).toEqual({ ax: 5, ay: 5, bx: 10, by: 5 });
      expect(segments[1]).toEqual({ ax: 10, ay: 5, bx: 10, by: 10 });
    });

    it('converts cubic curves into multiple line segments', () => {
      const cmds = SvgPathParser.parsePathData('M0 0 C10 0 10 10 0 10');
      const segments = SvgPathParser.parsePathToSegments(cmds);

      expect(segments.length).toBeGreaterThanOrEqual(3); // MIN_SEGMENTS safeguard
      expect(segments[0].ax).toBeCloseTo(0);
      expect(segments[0].ay).toBeCloseTo(0);
      const last = segments[segments.length - 1];
      expect(last.bx).toBeCloseTo(0);
      expect(last.by).toBeCloseTo(10);
    });

    it('throws on unsupported commands', () => {
      const cmds = SvgPathParser.parsePathData('M0 0 A10 10 0 0 0 20 20');
      expect(() => SvgPathParser.parsePathToSegments(cmds)).toThrow('Unsupported path command');
    });
  });
});
