import {
  NODE_RADIUS,
  MIN_NODE_OUTLINE_WIDTH,
  MAX_NODE_OUTLINE_WIDTH,
  INPUT_STROKE_ALPHA,
  NODE_LAYER_NORM_PERCENTILE,
  NODE_FILL_ALPHA_MIN,
  NODE_FILL_ALPHA_MAX,
  NODE_FILL_ALPHA_EXPONENT,
  NODE_OUTLINE_ALPHA_MIN,
  NODE_OUTLINE_ALPHA_MAX,
  NODE_OUTLINE_ALPHA_EXPONENT
} from '../NetworkPreviewConstants.js';
import { getColorForValue } from '../utils.js';
import { clamp01, computeLayerNorms, percentile } from './math.js';
import { computeDownstreamInfluence, computeDownstreamInfluenceVectors, getDominantOutput } from './influence.js';
import { dominantOutlineColor, influenceOutlineAlpha } from './styles.js';
import { drawInputNode, drawOutputNode } from './drawPrimitives.js';

export function drawNodes({
  canvas,
  positionCalculator,
  sizes,
  signals,
  weightedInputSums,
  numLayers,
  totalNumColumns,
  columnSpacing,
  inputLayout,
  weights
}) {
  const signalLayerNorms = computeLayerNorms(signals?.signals || [], NODE_LAYER_NORM_PERCENTILE);
  const sumLayerNorms = weightedInputSums ? computeLayerNorms(weightedInputSums?.sums || [], NODE_LAYER_NORM_PERCENTILE) : [];

  const rectSize = NODE_RADIUS * 2;
  const inputSize = sizes[0];
  const visibleInputIndices = inputLayout?.visibleInputIndices ?? null;
  const groupSizes = inputLayout?.groupSizes ?? [];
  const visibleCount = visibleInputIndices ? visibleInputIndices.length : inputSize;

  const influence = weights ? computeDownstreamInfluence(sizes, weights) : null;
  const outInfluenceVec = weights ? computeDownstreamInfluenceVectors(sizes, weights) : null;
  const outCount = sizes[numLayers - 1] || 0;

  // Intermediate layer nodes (actual network input, shown as the "intermediate" column)
  // NOTE: skipping applies ONLY to the artificial input column. The real input column shows all inputs.
  if (inputSize > 0) {
    const inputSignals = signals?.signals?.[0] || [];
    const sigNorm = signalLayerNorms[0] || 1.0;
    const inflNorm = percentile((influence?.[0] || []).map(v => Math.abs(v)), NODE_LAYER_NORM_PERCENTILE);

    for (let actualIdx = 0; actualIdx < inputSize; actualIdx++) {
      const pos = positionCalculator.getNodePosition(
        -1, actualIdx, inputSize, numLayers, totalNumColumns, columnSpacing, groupSizes, true
      );
      const outputSignal = inputSignals[actualIdx];
      const weightedSum = 0;

      const absSignal = outputSignal !== undefined ? Math.abs(outputSignal) : 0;
      const normalizedOutput = outputSignal !== undefined ? clamp01(absSignal / sigNorm) : 0;
      const normalizedInputSum = 0;

      const fillAlpha = outputSignal !== undefined
        ? NODE_FILL_ALPHA_MIN + (NODE_FILL_ALPHA_MAX - NODE_FILL_ALPHA_MIN) * Math.pow(normalizedOutput, NODE_FILL_ALPHA_EXPONENT)
        : 0.2;
      const strokeAlpha = 0.3;
      const strokeWidth = MIN_NODE_OUTLINE_WIDTH +
        (MAX_NODE_OUTLINE_WIDTH - MIN_NODE_OUTLINE_WIDTH) * normalizedInputSum;

      const nodeColor = getColorForValue(outputSignal);
      const { idx: domIdx, dominance } = getDominantOutput(outInfluenceVec?.[0]?.[actualIdx]);
      const strokeColor = dominantOutlineColor(domIdx, outCount);

      const infl = influence?.[0]?.[actualIdx] ?? 0;
      const normalizedInfluence = inflNorm > 1e-9 ? clamp01(infl / inflNorm) : 0;
      const inflAlpha = influenceOutlineAlpha(normalizedInfluence, dominance);

      canvas.circle(pos.x, pos.y, NODE_RADIUS);
      canvas.fill({ color: nodeColor, alpha: fillAlpha });
      canvas.circle(pos.x, pos.y, NODE_RADIUS);
      canvas.stroke({ color: strokeColor, width: strokeWidth, alpha: Math.max(strokeAlpha, inflAlpha) });
    }
  }

  // Network layers (input, hidden, output)
  for (let layer = 0; layer < numLayers; layer++) {
    const layerSignals = signals?.signals?.[layer] || [];
    const layerWeightedSums = weightedInputSums?.sums?.[layer] || [];
    const isOutputLayer = layer === numLayers - 1;
    const isInputLayer = layer === 0;
    const sigNorm = signalLayerNorms[layer] || 1.0;
    const sumNorm = sumLayerNorms[layer] || 1.0;

    const layerInfluenceArr = influence?.[layer] || [];
    const layerInfluenceNorm = influence
      ? percentile(layerInfluenceArr.map(v => Math.abs(v)), NODE_LAYER_NORM_PERCENTILE)
      : 1.0;

    const iterCount = isInputLayer ? visibleCount : sizes[layer];
    for (let node = 0; node < iterCount; node++) {
      const actualIdx = isInputLayer && visibleInputIndices ? visibleInputIndices[node] : node;
      const pos = positionCalculator.getNodePosition(
        layer,
        node,
        iterCount,
        numLayers,
        totalNumColumns,
        columnSpacing,
        groupSizes,
        false
      );
      const outputSignal = layerSignals[actualIdx];
      const weightedSum = isInputLayer ? 0 : layerWeightedSums[actualIdx];

      const absSignal = outputSignal !== undefined ? Math.abs(outputSignal) : 0;
      const normalizedOutputBase = outputSignal !== undefined ? clamp01(absSignal / sigNorm) : 0;
      const normalizedOutput = isOutputLayer ? Math.sqrt(normalizedOutputBase) : normalizedOutputBase;
      const normalizedInputSum = weightedSum !== undefined && weightedInputSums
        ? clamp01(Math.abs(weightedSum) / sumNorm)
        : 0;

      const fillAlpha = outputSignal !== undefined
        ? NODE_FILL_ALPHA_MIN + (NODE_FILL_ALPHA_MAX - NODE_FILL_ALPHA_MIN) * Math.pow(normalizedOutput, NODE_FILL_ALPHA_EXPONENT)
        : 0.2;
      const strokeAlpha = weightedSum !== undefined && weightedInputSums
        ? NODE_OUTLINE_ALPHA_MIN + (NODE_OUTLINE_ALPHA_MAX - NODE_OUTLINE_ALPHA_MIN) * Math.pow(normalizedInputSum, NODE_OUTLINE_ALPHA_EXPONENT)
        : 0.3;
      const strokeWidth = MIN_NODE_OUTLINE_WIDTH +
        (MAX_NODE_OUTLINE_WIDTH - MIN_NODE_OUTLINE_WIDTH) * normalizedInputSum;

      const nodeColor = getColorForValue(outputSignal);
      let strokeColor = getColorForValue(weightedSum);
      let strokeAlphaFinal = strokeAlpha;
      let strokeWidthFinal = strokeWidth;

      if (!isOutputLayer && influence && outInfluenceVec) {
        const vec = outInfluenceVec[layer]?.[actualIdx];
        const { idx: domIdx, dominance } = getDominantOutput(vec);
        strokeColor = dominantOutlineColor(domIdx, outCount);

        const infl = layerInfluenceArr[actualIdx] ?? 0;
        const normalizedInfluence = layerInfluenceNorm > 1e-9 ? clamp01(infl / layerInfluenceNorm) : 0;
        strokeAlphaFinal = Math.max(strokeAlpha, influenceOutlineAlpha(normalizedInfluence, dominance));

        if (!weightedInputSums) {
          strokeWidthFinal = MIN_NODE_OUTLINE_WIDTH +
            (MAX_NODE_OUTLINE_WIDTH - MIN_NODE_OUTLINE_WIDTH) * normalizedInfluence;
        }
      }

      if (isInputLayer) {
        drawInputNode(canvas, pos, node, groupSizes, nodeColor, fillAlpha, strokeColor);
      } else if (isOutputLayer) {
        drawOutputNode(canvas, pos, outputSignal, nodeColor, fillAlpha, strokeColor, strokeWidth, strokeAlpha);
      } else {
        canvas.circle(pos.x, pos.y, NODE_RADIUS);
        canvas.fill({ color: nodeColor, alpha: fillAlpha });
        canvas.circle(pos.x, pos.y, NODE_RADIUS);
        canvas.stroke({ color: strokeColor, width: strokeWidthFinal, alpha: strokeAlphaFinal });
      }
    }

    // Input group outlines
    if (isInputLayer && groupSizes) {
      let nodeIndex = 0;
      for (let g = 0; g < groupSizes.length; g++) {
        const groupSize = groupSizes[g];
        if (groupSize > 1) {
          const firstPos = positionCalculator.getNodePosition(
            layer, nodeIndex, iterCount, numLayers, totalNumColumns, columnSpacing, groupSizes, false
          );
          const lastPos = positionCalculator.getNodePosition(
            layer, nodeIndex + groupSize - 1, iterCount, numLayers, totalNumColumns, columnSpacing, groupSizes, false
          );

          canvas.roundRect(
            firstPos.x - rectSize / 2,
            Math.min(firstPos.y, lastPos.y) - NODE_RADIUS,
            rectSize,
            Math.max(firstPos.y, lastPos.y) - Math.min(firstPos.y, lastPos.y) + NODE_RADIUS * 2,
            NODE_RADIUS
          );
          canvas.stroke({ color: 0xFFFFFF, width: 1, alpha: INPUT_STROKE_ALPHA });
        }
        nodeIndex += groupSize;
      }
    }
  }
}


