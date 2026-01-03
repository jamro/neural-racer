export function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

export function percentile(values, p) {
  if (!values?.length) return 1.0;
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  const v = sorted[idx];
  return (v !== undefined && v > 1e-6) ? v : 1.0;
}

export function computeLayerNorms(layerValues, p) {
  return (layerValues || []).map(arr => percentile((arr || []).map(v => Math.abs(v)), p));
}


