class Genome {
  constructor(length, genes = null) {
    this.genes = genes ?? new Float32Array(length);
  }

  clone() {
    return new Genome(this.genes.length, new Float32Array(this.genes));
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

export default Genome;