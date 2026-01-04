import { NODE_RADIUS } from '../NetworkPreviewConstants.js';
import {
  CONNECTION_LAYER_NORM_PERCENTILE,
  CONNECTION_KEEP_TOP_K,
  CONNECTION_KEEP_TOP_K_OUT,
  CONNECTION_KEEP_THRESHOLD_RATIO,
  CONNECTION_ALPHA_MAX,
  CONNECTION_WIDTH_MIN,
  CONNECTION_WIDTH_MAX,
  ARTIFICIAL_INPUT_ALPHA_MIN,
  ARTIFICIAL_INPUT_WIDTH_MIN
} from '../NetworkPreviewConstants.js';
import { getColorForValue } from '../utils.js';
import { clamp01, percentile } from './math.js';
import {
  computeDownstreamInfluence,
  computeDownstreamInfluenceVectors,
  getDominantOutput,
  getBundleYOffset
} from './influence.js';
import { computeLayerOrdering } from './ordering.js';
import { connectionStyleFromImportance } from './styles.js';

const FADE_OUT_RENDER_CYCLES = 30;

function edgeKeyInputToIntermediate(actualIdx) {
  return `input:${actualIdx}`;
}

function edgeKeyExtra(fromActual, toActual) {
  return `extra:${fromActual}->${toActual}`;
}

function edgeKeyWeight(layer, fromIdx, toIdx) {
  // layer is the weights[layer] matrix (from layer -> layer+1)
  return `w:${layer}:${fromIdx}->${toIdx}`;
}

function updateEdgeFadeState(edgeFadeState, key, { color, width, targetAlpha, targetWidth, isSignificant }) {
  if (!edgeFadeState || !key) return null;

  const drawEps = 1e-3;
  const smooth = 1 / Math.max(1, FADE_OUT_RENDER_CYCLES);

  let st = edgeFadeState.get(key);
  if (!st) {
    if (!(targetAlpha > drawEps)) return null;
    st = {
      color,
      currentAlpha: 0,
      currentWidth: width ?? 1,
      targetAlpha: targetAlpha,
      targetWidth: width ?? 1
    };
    edgeFadeState.set(key, st);
  }

  // When significant, update the style and targets; when fading out, keep last style.
  if (isSignificant) {
    st.color = color;
    if (Number.isFinite(width)) st.targetWidth = width;
    st.targetAlpha = targetAlpha;
  } else {
    st.targetAlpha = 0;
  }

  // Smoothly chase the target values (handles both fade-in and fade-out, and dampens jitter).
  st.currentAlpha += (st.targetAlpha - st.currentAlpha) * smooth;
  if (Number.isFinite(st.targetWidth)) {
    st.currentWidth += (st.targetWidth - st.currentWidth) * smooth;
  }

  if (st.currentAlpha <= drawEps && st.targetAlpha <= drawEps) {
    edgeFadeState.delete(key);
    return null;
  }

  edgeFadeState.set(key, st);
  return st;
}

function drawWithFade({
  edgeFadeState,
  key,
  strokeStyle,
  isSignificant,
  drawPath
}) {
  const targetAlpha = isSignificant ? (strokeStyle?.alpha ?? 0) : 0;

  // Fallback: no fade state available, preserve old behavior.
  if (!edgeFadeState || !key) {
    if (isSignificant) drawPath(strokeStyle);
    return;
  }

  const st = updateEdgeFadeState(edgeFadeState, key, {
    color: strokeStyle.color,
    width: strokeStyle.width,
    targetAlpha,
    targetWidth: strokeStyle.width,
    isSignificant
  });
  if (!st) return;
  drawPath({ color: st.color, width: st.currentWidth, alpha: st.currentAlpha });
}

export function drawConnections({
  canvas,
  positionCalculator,
  sizes,
  weights,
  activations,
  numLayers,
  totalNumColumns,
  columnSpacing,
  inputLayout,
  edgeFadeState
}) {
  const inputSize = sizes[0];
  const visibleInputIndices = inputLayout?.visibleInputIndices ?? null;
  const groupSizes = inputLayout?.groupSizes ?? [];
  const visibleCount = visibleInputIndices ? visibleInputIndices.length : inputSize;
  const extraEdges = inputLayout?.extraEdges ?? [];
  const influence = computeDownstreamInfluence(sizes, weights);
  const outInfluenceVec = computeDownstreamInfluenceVectors(sizes, weights);
  const outCount = sizes[numLayers - 1];

  // Downstream "output impact" attenuation:
  // - `influence[layer][i]` measures total downstream magnitude (abs-weights).
  // - We additionally downweight edges that don't concentrate on any output (low dominance),
  //   which helps show "less relevant" edges across any layers.
  const downstreamImpactFactor = (vec) => {
    if (outCount <= 1) return 1.0;
    const { dominance } = getDominantOutput(vec);
    // Keep a non-zero floor so multi-output edges don't disappear entirely.
    return 0.25 + 0.75 * Math.max(0, Math.min(1, dominance));
  };

  computeLayerOrdering({
    sizes,
    weights,
    activations,
    numLayers,
    totalNumColumns,
    columnSpacing,
    inputLayout,
    positionCalculator
  });

  const layerNorms = new Array(numLayers - 1).fill(1.0);
  const layerUppers = new Array(numLayers - 1).fill(1.0);
  for (let layer = 0; layer < numLayers - 1; layer++) {
    const inputActivations = activations?.[layer];
    const importances = [];
    for (let o = 0; o < sizes[layer + 1]; o++) {
      const down = (influence[layer + 1][o] || 0) * downstreamImpactFactor(outInfluenceVec[layer + 1]?.[o]);
      for (let i = 0; i < sizes[layer]; i++) {
        const act = inputActivations?.[i] ?? 1.0;
        const raw = act * weights[layer][o][i];
        importances.push(Math.abs(raw) * down);
      }
    }
    layerNorms[layer] = percentile(importances, CONNECTION_LAYER_NORM_PERCENTILE);
    layerUppers[layer] = percentile(importances, 0.995);
  }

  const outgoingKeepSets = new Array(numLayers - 1);
  for (let layer = 0; layer < numLayers - 1; layer++) {
    const inputActivations = activations?.[layer];
    const outSets = new Array(sizes[layer]).fill(null).map(() => new Set());
    for (let i = 0; i < sizes[layer]; i++) {
      const outs = [];
      for (let o = 0; o < sizes[layer + 1]; o++) {
        const down = (influence[layer + 1][o] || 0) * downstreamImpactFactor(outInfluenceVec[layer + 1]?.[o]);
        const act = inputActivations?.[i] ?? 1.0;
        const raw = act * weights[layer][o][i];
        outs.push({ o, importance: Math.abs(raw) * down });
      }
      outs.sort((a, b) => b.importance - a.importance);
      for (let k = 0; k < Math.min(CONNECTION_KEEP_TOP_K_OUT, outs.length); k++) outSets[i].add(outs[k].o);
    }
    outgoingKeepSets[layer] = outSets;
  }

  // Input -> intermediate (1:1)
  if (inputSize > 0 && visibleCount > 0) {
    for (let v = 0; v < visibleCount; v++) {
      const actualIdx = visibleInputIndices ? visibleInputIndices[v] : v;
      const inputPos = positionCalculator.getNodePosition(
        0, v, visibleCount, numLayers, totalNumColumns, columnSpacing, groupSizes, false
      );
      const intermediatePos = positionCalculator.getNodePosition(
        -1, actualIdx, inputSize, numLayers, totalNumColumns, columnSpacing, groupSizes, true
      );

      // Artificial input connections: light up directly from the raw input signal in [-1, 1].
      // This is the ONLY place we do this; all other layers keep the existing importance-based logic.
      const signal = activations?.[0]?.[actualIdx];
      const connectionColor = getColorForValue(signal);
      const t = signal !== undefined ? clamp01(Math.abs(signal)) : null;
      const alpha = t === null ? null : (ARTIFICIAL_INPUT_ALPHA_MIN + (CONNECTION_ALPHA_MAX - ARTIFICIAL_INPUT_ALPHA_MIN) * t);
      const width = t === null ? null : (ARTIFICIAL_INPUT_WIDTH_MIN + (CONNECTION_WIDTH_MAX - ARTIFICIAL_INPUT_WIDTH_MIN) * t);
      const { idx: outIdx, dominance } = getDominantOutput(outInfluenceVec[0]?.[actualIdx]);
      const bundleY = getBundleYOffset(outIdx, dominance, outCount);

      const startX = inputPos.x + NODE_RADIUS;
      const endX = intermediatePos.x - NODE_RADIUS;
      const curveOffset = Math.abs(endX - startX) * 0.3;

      const key = edgeKeyInputToIntermediate(actualIdx);
      // If activations aren't provided, fall back to the old decluttered behavior.
      if (t === null) {
        const signalFallback = activations?.[0]?.[actualIdx] ?? 1.0;
        const connectionColorFallback = getColorForValue(signalFallback);
        const inputImportances = [];
        for (let vv = 0; vv < visibleCount; vv++) {
          const aIdx = visibleInputIndices ? visibleInputIndices[vv] : vv;
          const inputActivation = activations?.[0]?.[aIdx] ?? 1.0;
          const down = (influence[0][aIdx] || 0) * downstreamImpactFactor(outInfluenceVec[0]?.[aIdx]);
          inputImportances.push(Math.abs(inputActivation) * down);
        }
        const inputNorm = percentile(inputImportances, CONNECTION_LAYER_NORM_PERCENTILE);
        const inputUpper = percentile(inputImportances, 0.995);
        const inputKeepThreshold = inputNorm * CONNECTION_KEEP_THRESHOLD_RATIO;

        const topSet = new Set();
        {
          const ranked = inputImportances
            .map((importance, vv) => ({ v: vv, importance }))
            .sort((a, b) => b.importance - a.importance);
          for (let k = 0; k < Math.min(CONNECTION_KEEP_TOP_K_OUT, ranked.length); k++) {
            if (ranked[k].importance > 0) topSet.add(ranked[k].v);
          }
        }

        const down = (influence[0][actualIdx] || 0) * downstreamImpactFactor(outInfluenceVec[0]?.[actualIdx]);
        const importance = Math.abs(signalFallback) * down;
        const { alpha: a2, width: w2 } = connectionStyleFromImportance(importance, inputNorm, inputUpper, topSet.has(v));
        const isSignificant = importance >= inputKeepThreshold;
        drawWithFade({
          edgeFadeState,
          key,
          isSignificant,
          strokeStyle: { color: connectionColorFallback, width: w2, alpha: a2 },
          drawPath: (style) => {
            canvas.moveTo(startX, inputPos.y);
            canvas.bezierCurveTo(
              startX + curveOffset, inputPos.y + bundleY,
              endX - curveOffset, intermediatePos.y + bundleY,
              endX, intermediatePos.y
            );
            canvas.stroke(style);
          }
        });
        continue;
      }

      const isSignificant = alpha > 1e-3;
      drawWithFade({
        edgeFadeState,
        key,
        isSignificant,
        strokeStyle: { color: connectionColor, width, alpha },
        drawPath: (style) => {
          canvas.moveTo(startX, inputPos.y);
          canvas.bezierCurveTo(
            startX + curveOffset, inputPos.y + bundleY,
            endX - curveOffset, intermediatePos.y + bundleY,
            endX, intermediatePos.y
          );
          canvas.stroke(style);
        }
      });
    }
  }

  // Extra artificial edges: from visible artificial sources -> skipped real input neuron.
  // These are purely explanatory edges, not real network weights.
  if (inputSize > 0 && visibleCount > 0 && extraEdges.length) {
    let edgeIdx = -1;
    for (const e of extraEdges) {
      edgeIdx++;
      const fromVisible = e?.fromVisible;
      const fromActual = e?.fromActual;
      const toActual = e?.toActual;
      if (!Number.isInteger(fromVisible) || !Number.isInteger(fromActual) || !Number.isInteger(toActual)) continue;
      if (fromVisible < 0 || fromVisible >= visibleCount) continue;
      if (fromActual < 0 || fromActual >= inputSize) continue;
      if (toActual < 0 || toActual >= inputSize) continue;

      const inputPos = positionCalculator.getNodePosition(
        0, fromVisible, visibleCount, numLayers, totalNumColumns, columnSpacing, groupSizes, false
      );
      const intermediatePos = positionCalculator.getNodePosition(
        -1, toActual, inputSize, numLayers, totalNumColumns, columnSpacing, groupSizes, true
      );

      // Artificial extra edges: light up directly from the raw source input in [-1, 1].
      const signal = activations?.[0]?.[fromActual];
      const connectionColor = getColorForValue(signal);
      const t = signal !== undefined ? clamp01(Math.abs(signal)) : null;
      const alpha = t === null ? null : (ARTIFICIAL_INPUT_ALPHA_MIN + (CONNECTION_ALPHA_MAX - ARTIFICIAL_INPUT_ALPHA_MIN) * t);
      const width = t === null ? null : (ARTIFICIAL_INPUT_WIDTH_MIN + (CONNECTION_WIDTH_MAX - ARTIFICIAL_INPUT_WIDTH_MIN) * t);
      const { idx: outIdx, dominance } = getDominantOutput(outInfluenceVec[0]?.[toActual]);
      const bundleY = getBundleYOffset(outIdx, dominance, outCount);
      const startX = inputPos.x + NODE_RADIUS;
      const endX = intermediatePos.x - NODE_RADIUS;
      const curveOffset = Math.abs(endX - startX) * 0.25;

      const key = edgeKeyExtra(fromActual, toActual);
      // If activations aren't provided, fall back to the old decluttered behavior.
      if (t === null) {
        const signalFallback = activations?.[0]?.[fromActual] ?? 1.0;
        const connectionColorFallback = getColorForValue(signalFallback);
        const extraImportances = [];
        for (const ee of extraEdges) {
          const fa = ee?.fromActual;
          const ta = ee?.toActual;
          if (!Number.isInteger(fa) || !Number.isInteger(ta)) continue;
          if (fa < 0 || fa >= inputSize) continue;
          if (ta < 0 || ta >= inputSize) continue;
          const sig2 = activations?.[0]?.[fa] ?? 1.0;
          const down2 = (influence[0][ta] || 0) * downstreamImpactFactor(outInfluenceVec[0]?.[ta]);
          extraImportances.push(Math.abs(sig2) * down2);
        }
        const extraNorm = percentile(extraImportances, CONNECTION_LAYER_NORM_PERCENTILE);
        const extraUpper = percentile(extraImportances, 0.995);
        const extraKeepThreshold = extraNorm * CONNECTION_KEEP_THRESHOLD_RATIO;

        const topSet = new Set();
        {
          const ranked = extraImportances
            .map((importance, idx) => ({ idx, importance }))
            .sort((a, b) => b.importance - a.importance);
          for (let k = 0; k < Math.min(CONNECTION_KEEP_TOP_K_OUT, ranked.length); k++) {
            if (ranked[k].importance > 0) topSet.add(ranked[k].idx);
          }
        }

        const sig2 = signalFallback;
        const down2 = (influence[0][toActual] || 0) * downstreamImpactFactor(outInfluenceVec[0]?.[toActual]);
        const importance = Math.abs(sig2) * down2;
        const { alpha: a2, width: w2 } = connectionStyleFromImportance(importance, extraNorm, extraUpper, topSet.has(edgeIdx));
        const isSignificant = importance >= extraKeepThreshold;
        drawWithFade({
          edgeFadeState,
          key,
          isSignificant,
          strokeStyle: { color: connectionColorFallback, width: w2, alpha: a2 },
          drawPath: (style) => {
            canvas.moveTo(startX, inputPos.y);
            canvas.bezierCurveTo(
              startX + curveOffset, inputPos.y + bundleY,
              endX - curveOffset, intermediatePos.y + bundleY,
              endX, intermediatePos.y
            );
            canvas.stroke(style);
          }
        });
        continue;
      }

      const isSignificant = alpha > 1e-3;
      drawWithFade({
        edgeFadeState,
        key,
        isSignificant,
        strokeStyle: { color: connectionColor, width, alpha },
        drawPath: (style) => {
          canvas.moveTo(startX, inputPos.y);
          canvas.bezierCurveTo(
            startX + curveOffset, inputPos.y + bundleY,
            endX - curveOffset, intermediatePos.y + bundleY,
            endX, intermediatePos.y
          );
          canvas.stroke(style);
        }
      });
    }
  }

  // Intermediate -> first hidden and normal network edges
  for (let layer = 0; layer < numLayers - 1; layer++) {
    const inputActivations = activations?.[layer];
    const isFirstHiddenLayer = layer === 0;
    const layerNorm = layerNorms[layer] || 1.0;
    const layerUpper = layerUppers[layer] || layerNorm;
    const keepThreshold = layerNorm * CONNECTION_KEEP_THRESHOLD_RATIO;
    const outSets = outgoingKeepSets[layer];

    for (let o = 0; o < sizes[layer + 1]; o++) {
      const outputPos = positionCalculator.getNodePosition(
        layer + 1, o, sizes[layer + 1], numLayers, totalNumColumns, columnSpacing, groupSizes, false
      );
      const outVec = outInfluenceVec[layer + 1]?.[o];
      const { idx: outIdx, dominance } = getDominantOutput(outVec);
      const down = (influence[layer + 1][o] || 0) * downstreamImpactFactor(outVec);
      const bundleY = getBundleYOffset(outIdx, dominance, outCount);

      const incoming = [];
      for (let i = 0; i < sizes[layer]; i++) {
        const act = inputActivations?.[i] ?? 1.0;
        const raw = act * weights[layer][o][i];
        incoming.push({ i, importance: Math.abs(raw) * down });
      }
      incoming.sort((a, b) => b.importance - a.importance);
      const keepSet = new Set();
      for (let k = 0; k < Math.min(CONNECTION_KEEP_TOP_K, incoming.length); k++) keepSet.add(incoming[k].i);

      for (let i = 0; i < sizes[layer]; i++) {
        const act = inputActivations?.[i] ?? 1.0;
        const raw = act * weights[layer][o][i];
        const importance = Math.abs(raw) * down;
        const isTop = keepSet.has(i);
        const isTopOutgoing = outSets?.[i]?.has(o) ?? true;
        const isSignificant = isTop || (isTopOutgoing && importance >= keepThreshold);

        const inputPos = isFirstHiddenLayer
          ? positionCalculator.getNodePosition(
            -1, i, sizes[layer], numLayers, totalNumColumns, columnSpacing, groupSizes, true
          )
          : positionCalculator.getNodePosition(
            layer, i, sizes[layer], numLayers, totalNumColumns, columnSpacing, groupSizes, false
          );

        const connectionColor = getColorForValue(raw);
        const { alpha, width } = connectionStyleFromImportance(importance, layerNorm, layerUpper, isTop);

        const startX = inputPos.x + NODE_RADIUS;
        const endX = outputPos.x - NODE_RADIUS;
        const curveOffset = Math.abs(endX - startX) * 0.3;

        const key = edgeKeyWeight(layer, i, o);
        drawWithFade({
          edgeFadeState,
          key,
          isSignificant,
          strokeStyle: { color: connectionColor, width, alpha },
          drawPath: (style) => {
            canvas.moveTo(startX, inputPos.y);
            canvas.bezierCurveTo(
              startX + curveOffset, inputPos.y + bundleY,
              endX - curveOffset, outputPos.y + bundleY,
              endX, outputPos.y
            );
            canvas.stroke(style);
          }
        });
      }
    }
  }
}


