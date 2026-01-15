import { COLOR_POSITIVE, COLOR_NEGATIVE } from './NetworkPreviewConstants';
/**
 * Utility functions for network visualization
 */

/**
 * Gets color for a value (positive = red, negative = blue, zero = gray)
 */
export function getColorForValue(value) {
  if (value === undefined || value === 0) return 0x333333;
  return value > 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;
}

/**
 * Extracts weight matrices from a genome
 */
export function extractWeights(network, genome) {
  const { sizes } = network;
  const genes = genome.genes || genome;
  const weights = [];
  let offset = 0;
    
  for (let l = 0; l < sizes.length - 1; l++) {
    const inD = sizes[l];
    const outD = sizes[l + 1];
    const layerWeights = [];
        
    for (let o = 0; o < outD; o++) {
      const row = [];
      for (let i = 0; i < inD; i++) {
        row.push(genes[offset + o * inD + i]);
      }
      layerWeights.push(row);
    }
        
    weights.push(layerWeights);
    offset += outD * inD + outD;
  }
    
  return weights;
}

/**
 * Extracts per-layer bias vectors from a genome.
 * Mirrors the weight extraction offset logic but returns 1D arrays per output layer.
 */
export function extractBiases(network, genome) {
  const { sizes } = network;
  const genes = genome.genes || genome;
  const biases = [];
  let offset = 0;

  for (let l = 0; l < sizes.length - 1; l++) {
    const inD = sizes[l];
    const outD = sizes[l + 1];
    const layerBiases = [];

    const biasBase = offset + outD * inD;
    for (let o = 0; o < outD; o++) {
      layerBiases.push(genes[biasBase + o]);
    }

    biases.push(layerBiases);
    offset += outD * inD + outD;
  }

  return biases;
}

/**
 * Calculates signal values for each layer
 */
export function getSignals(sizes, weights, activations) {
  // If activations are provided, use them directly
  if (activations?.length === sizes.length) {
    let maxAbs = 0;
    const signals = activations.map(layer => {
      if (!layer) return [];
      const arr = Array.from(layer);
      arr.forEach(s => maxAbs = Math.max(maxAbs, Math.abs(s)));
      return arr;
    });
    return { signals, maxAbs: maxAbs || 1.0 };
  }
    
  // If no weights, return empty signals
  if (!weights) return { signals: [], maxAbs: 1.0 };
    
  // Calculate signals from weights (sum of weights per output node)
  const signals = sizes.map(() => []);
  let maxAbs = 0;
    
  for (let l = 0; l < sizes.length - 1; l++) {
    for (let o = 0; o < sizes[l + 1]; o++) {
      let sum = 0;
      for (let i = 0; i < sizes[l]; i++) {
        sum += weights[l][o][i];
      }
      signals[l + 1][o] = sum;
      maxAbs = Math.max(maxAbs, Math.abs(sum));
    }
  }
    
  return { signals, maxAbs: maxAbs || 1.0 };
}

/**
 * Calculates weighted input sums for each node
 */
export function calculateWeightedInputSums(sizes, weights, activations) {
  const sums = [new Array(sizes[0]).fill(0)];
  let maxAbsSum = 0;
    
  for (let l = 0; l < sizes.length - 1; l++) {
    sums[l + 1] = [];
    for (let o = 0; o < sizes[l + 1]; o++) {
      let sum = 0;
      for (let i = 0; i < sizes[l]; i++) {
        sum += activations[l][i] * weights[l][o][i];
      }
      sums[l + 1][o] = sum;
      maxAbsSum = Math.max(maxAbsSum, Math.abs(sum));
    }
  }
    
  return { sums, maxAbs: maxAbsSum || 1.0 };
}

