import {
  CONNECTION_ALPHA_MIN,
  CONNECTION_ALPHA_MAX,
  CONNECTION_WIDTH_MIN,
  CONNECTION_WIDTH_MAX,
  CONNECTION_ALPHA_EXPONENT,
  CONNECTION_WIDTH_EXPONENT,
  NODE_OUTLINE_ALPHA_MIN,
  NODE_OUTLINE_ALPHA_MAX,
  NODE_OUTLINE_ALPHA_EXPONENT
} from '../NetworkPreviewConstants.js';

export function connectionStyleFromImportance(importance, layerNorm, layerUpper, isTopContributor) {
  const safeNorm = layerNorm > 1e-6 ? layerNorm : 1.0;
  const safeUpper = Math.max(safeNorm, layerUpper ?? safeNorm);
  const r = importance / safeNorm;
  const rMax = Math.max(1.0, safeUpper / safeNorm);

  const alphaGain = 2.2;
  const widthGain = 3.0;
  const mappedAlpha = Math.log1p(alphaGain * Math.min(r, rMax)) / Math.log1p(alphaGain * rMax);
  const mappedWidth = Math.log1p(widthGain * Math.min(r, rMax)) / Math.log1p(widthGain * rMax);

  const a = Math.pow(mappedAlpha, CONNECTION_ALPHA_EXPONENT);
  let alpha = CONNECTION_ALPHA_MIN + (CONNECTION_ALPHA_MAX - CONNECTION_ALPHA_MIN) * a;

  const w = Math.pow(mappedWidth, CONNECTION_WIDTH_EXPONENT);
  let width = CONNECTION_WIDTH_MIN + (CONNECTION_WIDTH_MAX - CONNECTION_WIDTH_MIN) * w;

  if (isTopContributor) {
    alpha = Math.min(1.0, alpha * 1.08);
    width = width * 1.05;
  } else {
    alpha = alpha * 0.55;
    width = width * 0.9;
  }

  return { alpha, width };
}

export function dominantOutlineColor(dominantIdx, outCount) {
  if (outCount === 2) return dominantIdx === 0 ? 0xFFD166 : 0x06D6A0;
  return 0xFFFFFF;
}

export function influenceOutlineAlpha(normalizedInfluence, dominance) {
  const x = Math.max(0, Math.min(1, normalizedInfluence)) * (0.35 + 0.65 * Math.max(0, Math.min(1, dominance)));
  return NODE_OUTLINE_ALPHA_MIN +
    (NODE_OUTLINE_ALPHA_MAX - NODE_OUTLINE_ALPHA_MIN) * Math.pow(x, NODE_OUTLINE_ALPHA_EXPONENT);
}


