
const PIXELS_PER_METER_SCALE = 50 / 4;  // 50 pixels is 4 meters

export function pixelsToMeters(pixels) {
  return pixels / PIXELS_PER_METER_SCALE;
}

export function metersToPixels(meters) {
  return meters * PIXELS_PER_METER_SCALE;
}