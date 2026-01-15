import { formatTime } from '../../../src/presentation/common/formatters';

describe('formatTime', () => {
  test.each([
    [0, '0:00.000'],
    [9.8, '0:09.800'],
    [61.2345, '1:01.235'],
    [-2.5, '-0:02.500'],
    [59.9996, '1:00.000'], // rounding over minute boundary
  ])('formats %s as %s', (input, expected) => {
    expect(formatTime(input)).toBe(expected);
  });

  test.each([NaN, Infinity, -Infinity])('returns zero for non-finite (%s)', (input) => {
    expect(formatTime(input)).toBe('0:00.000');
  });
});
