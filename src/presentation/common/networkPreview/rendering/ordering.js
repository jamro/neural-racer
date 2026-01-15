import { computeDownstreamInfluence } from './influence.js';

/**
 * Barycentric ordering to reduce crossings.
 * Mutates `positionCalculator` by calling `setLayerOrder(...)`.
 */
export function computeLayerOrdering({
  sizes,
  weights,
  activations,
  numLayers,
  totalNumColumns,
  columnSpacing,
  inputLayout,
  positionCalculator
}) {
  const influence = computeDownstreamInfluence(sizes, weights);
  const getAct = (layerIdx, nodeIdx) => activations?.[layerIdx]?.[nodeIdx] ?? 1.0;
  const groupSizes = inputLayout?.groupSizes ?? [];
  const inputSize = sizes?.[0] ?? 0;

  const orders = new Array(numLayers).fill(null);
  for (let l = 1; l < numLayers - 1; l++) {
    const n = sizes[l];
    const map = new Array(n);
    for (let i = 0; i < n; i++) map[i] = i;
    orders[l] = map;
    positionCalculator.setLayerOrder(l, map);
  }

  const getY = (layerIdx, nodeIdx) => {
    // For the first hidden layer (l=1), we want the "previous" Y positions to come from the
    // actual input column (intermediate), not the grouped/artificial input column.
    if (layerIdx === 0) {
      return positionCalculator.getNodePosition(
        -1,
        nodeIdx,
        inputSize,
        numLayers,
        totalNumColumns,
        columnSpacing,
        groupSizes,
        true
      ).y;
    }

    return positionCalculator.getNodePosition(
      layerIdx,
      nodeIdx,
      sizes[layerIdx],
      numLayers,
      totalNumColumns,
      columnSpacing,
      groupSizes,
      false
    ).y;
  };

  for (let iter = 0; iter < 2; iter++) {
    // Left-to-right
    for (let l = 1; l < numLayers - 1; l++) {
      const scores = new Array(sizes[l]).fill(0);
      const weightsSum = new Array(sizes[l]).fill(0);
      const prev = l - 1;

      for (let v = 0; v < sizes[l]; v++) {
        const downV = influence[l][v] || 0;
        if (prev === 0) {
          // Skipping applies only to the artificial column; the real input column remains full.
          for (let u = 0; u < inputSize; u++) {
            const raw = getAct(0, u) * weights[0][v][u];
            const imp = Math.abs(raw) * downV;
            if (imp <= 0) continue;
            scores[v] += getY(0, u) * imp;
            weightsSum[v] += imp;
          }
        } else {
          for (let u = 0; u < sizes[prev]; u++) {
            const raw = getAct(prev, u) * weights[prev][v][u];
            const imp = Math.abs(raw) * downV;
            if (imp <= 0) continue;
            scores[v] += getY(prev, u) * imp;
            weightsSum[v] += imp;
          }
        }
      }

      const nodes = [];
      for (let v = 0; v < sizes[l]; v++) {
        const score = weightsSum[v] > 0 ? (scores[v] / weightsSum[v]) : getY(l, v);
        nodes.push({ v, score });
      }
      nodes.sort((a, b) => a.score - b.score || a.v - b.v);
      const map = new Array(sizes[l]);
      for (let rank = 0; rank < nodes.length; rank++) map[nodes[rank].v] = rank;
      orders[l] = map;
      positionCalculator.setLayerOrder(l, map);
    }

    // Right-to-left
    for (let l = numLayers - 2; l >= 1; l--) {
      const scores = new Array(sizes[l]).fill(0);
      const weightsSum = new Array(sizes[l]).fill(0);
      const next = l + 1;

      for (let u = 0; u < sizes[l]; u++) {
        const actU = getAct(l, u);
        for (let v = 0; v < sizes[next]; v++) {
          const downV = influence[next][v] || 0;
          const raw = actU * weights[l][v][u];
          const imp = Math.abs(raw) * downV;
          if (imp <= 0) continue;
          scores[u] += getY(next, v) * imp;
          weightsSum[u] += imp;
        }
      }

      const nodes = [];
      for (let u = 0; u < sizes[l]; u++) {
        const score = weightsSum[u] > 0 ? (scores[u] / weightsSum[u]) : getY(l, u);
        nodes.push({ v: u, score });
      }
      nodes.sort((a, b) => a.score - b.score || a.v - b.v);
      const map = new Array(sizes[l]);
      for (let rank = 0; rank < nodes.length; rank++) map[nodes[rank].v] = rank;
      orders[l] = map;
      positionCalculator.setLayerOrder(l, map);
    }
  }

  return orders;
}


