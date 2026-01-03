import {
  CONNECTION_BUNDLING_ENABLED,
  CONNECTION_BUNDLE_STRENGTH,
  CONNECTION_BUNDLE_DOMINANCE_EXPONENT
} from '../NetworkPreviewConstants.js';

export function computeDownstreamInfluence(sizes, weights) {
  const numLayers = sizes.length;
  const influence = new Array(numLayers);
  for (let l = 0; l < numLayers; l++) influence[l] = new Array(sizes[l]).fill(0);

  const outLayer = numLayers - 1;
  for (let o = 0; o < sizes[outLayer]; o++) influence[outLayer][o] = 1.0;

  for (let l = numLayers - 2; l >= 0; l--) {
    for (let i = 0; i < sizes[l]; i++) {
      let sum = 0;
      for (let o = 0; o < sizes[l + 1]; o++) {
        sum += Math.abs(weights[l][o][i]) * influence[l + 1][o];
      }
      influence[l][i] = sum;
    }
  }
  return influence;
}

export function computeDownstreamInfluenceVectors(sizes, weights) {
  const numLayers = sizes.length;
  const outCount = sizes[numLayers - 1];
  const vec = new Array(numLayers);
  for (let l = 0; l < numLayers; l++) {
    vec[l] = new Array(sizes[l]);
    for (let i = 0; i < sizes[l]; i++) vec[l][i] = new Array(outCount).fill(0);
  }

  const outLayer = numLayers - 1;
  for (let o = 0; o < outCount; o++) vec[outLayer][o][o] = 1.0;

  for (let l = numLayers - 2; l >= 0; l--) {
    for (let i = 0; i < sizes[l]; i++) {
      const acc = new Array(outCount).fill(0);
      for (let o = 0; o < sizes[l + 1]; o++) {
        const w = Math.abs(weights[l][o][i]);
        if (w === 0) continue;
        const nextVec = vec[l + 1][o];
        for (let k = 0; k < outCount; k++) acc[k] += w * nextVec[k];
      }
      vec[l][i] = acc;
    }
  }
  return vec;
}

export function getDominantOutput(vec) {
  if (!vec?.length) return { idx: 0, dominance: 0 };
  let sum = 0;
  let max = -Infinity;
  let idx = 0;
  for (let k = 0; k < vec.length; k++) {
    const v = vec[k] || 0;
    sum += v;
    if (v > max) {
      max = v;
      idx = k;
    }
  }
  const dominance = sum > 1e-9 ? (max / sum) : 0;
  return { idx, dominance };
}

export function getBundleYOffset(dominantIdx, dominance, outCount) {
  if (!CONNECTION_BUNDLING_ENABLED || outCount <= 1) return 0;
  const center = (outCount - 1) / 2;
  const dir = (dominantIdx - center) / Math.max(1, center);
  const dom = Math.pow(Math.max(0, Math.min(1, dominance)), CONNECTION_BUNDLE_DOMINANCE_EXPONENT);
  return dir * CONNECTION_BUNDLE_STRENGTH * dom;
}


