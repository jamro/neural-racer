import { v4 as uuidv4 } from 'uuid';

// Int16 + scale quantization for storing genomes in IndexedDB
// - ~2x smaller than Float32
// - very low quality loss for GA-evolved NN weights (especially in typical ranges)
// - structured-clone friendly (Int16Array + number)

const I16_MAX = 32767;

function serializeGenome(genome, {
  // If you want extra robustness to occasional outliers,
  // set usePercentile=true and percentile=0.999 (requires sorting / extra work).
  // For speed and simplicity: maxAbs is great.
  eps = 1e-12,
} = {}) {
  const genesF32 =
    genome.genes instanceof Float32Array ? genome.genes : new Float32Array(genome.genes);

  // Find max absolute value (scale)
  let maxAbs = 0;
  for (let i = 0; i < genesF32.length; i++) {
    const a = Math.abs(genesF32[i]);
    if (a > maxAbs) maxAbs = a;
  }

  // Avoid zero/denormal scale (all genes = 0)
  const scale = Math.max(maxAbs, eps);

  // Quantize
  const genesQ = new Int16Array(genesF32.length);
  const invScale = 1.0 / scale;

  for (let i = 0; i < genesF32.length; i++) {
    // normalize to [-1,1]
    let x = genesF32[i] * invScale;
    if (x > 1) x = 1;
    else if (x < -1) x = -1;

    // map to int16
    // use rounding to nearest integer
    genesQ[i] = Math.round(x * I16_MAX);
  }

  return {
    genomeId: genome.genomeId,
    scale,
    genesQ,           // Int16Array is structured-clone friendly
    length: genesQ.length,
  };
}

/**
 * Dequantize stored genome -> Genome instance with Float32Array genes
 */
function deserializeGenome(data) {
  if (!data) throw new Error("deserializeGenome: no data");

  const { genomeId, scale } = data;

  if (typeof scale !== "number" || !Number.isFinite(scale) || scale <= 0) {
    throw new Error(`deserializeGenome: invalid scale: ${scale}`);
  }

  // Accept either Int16Array or array-like (in case of older records)
  const genesQ =
    data.genesQ instanceof Int16Array ? data.genesQ : new Int16Array(data.genesQ);

  // Dequantize
  const genesF32 = new Float32Array(genesQ.length);
  const mul = scale / I16_MAX;

  for (let i = 0; i < genesQ.length; i++) {
    genesF32[i] = genesQ[i] * mul;
  }

  const genome = new Genome(genesF32.length, genesF32);
  genome.genomeId = genomeId;
  return genome;
}

class Genome {
  constructor(length, genes = null) {
    this.genomeId = uuidv4();
    this.genes = genes ?? new Float32Array(length);
  }

  clone(preserveId = false) {
    const result = new Genome(this.genes.length, new Float32Array(this.genes));
    if(preserveId) {
      result.genomeId = this.genomeId;
    }
    return result;
  }

  randomize(scale = 0.5, rng = Math.random) {
    const g = this.genes;
    for (let i = 0; i < g.length; i++) g[i] = (rng() * 2 - 1) * scale;
    return this;
  }

  mutate({
    clamp = null,       // clamp values to a range
    rate = 0.03,       // percentage of genes to mutate
    sigma = 0.12,       // strength of noise
    start = null,      // start index of range to mutate (inclusive)
    end = null,         // end index of range to mutate (inclusive)
    rng = Math.random,
  } = {}) {
    const g = this.genes;
    const startIdx = start !== null ? start : 0;
    const endIdx = end !== null ? end : g.length - 1;
    
    for (let i = startIdx; i <= endIdx; i++) {
      if (rng() < rate) {
        g[i] += gaussian(rng) * sigma;
        // Clamp the value to [-clamp, +clamp] if clamp is specified
        if (clamp !== null) {
          g[i] = Math.max(-clamp, Math.min(clamp, g[i]));
        }
      }
    }
    return this;
  }

  static crossoverHybrid(a, b, blendRatio=0.7, rng = Math.random) {
    if (rng() < blendRatio) {
      return this.crossoverBlend(a, b, null, rng);
    } else {
      return this.crossoverUniform(a, b, rng);
    }
  }

  static crossoverUniform(a, b, rng = Math.random) {
    const ga = a.genes, gb = b.genes;
    const child = new Genome(ga.length);
    const gc = child.genes;
    for (let i = 0; i < ga.length; i++) gc[i] = (rng() < 0.5) ? ga[i] : gb[i];
    return child;
  }

  static crossoverBlend(a, b, alpha = null, rng = Math.random) {
    const ga = a.genes, gb = b.genes;
    const child = new Genome(ga.length);
    const gc = child.genes;
    for (let i = 0; i < ga.length; i++) {
      // Blend between parent genes: child = α * a + (1-α) * b
      // If alpha is provided, use fixed blend; otherwise use random blend per gene
      const blend = alpha !== null ? alpha : rng();
      gc[i] = blend * ga[i] + (1 - blend) * gb[i];
    }
    return child;
  }
}

// simple gaussian mutation (Box-Muller)
function gaussian(rng = Math.random) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export { Genome, serializeGenome, deserializeGenome };
