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
    rate = 0.03,       // percentage of genes to mutate
    sigma = 0.12,       // strength of noise
    rng = Math.random
  } = {}) {
    const g = this.genes;
    for (let i = 0; i < g.length; i++) {
      if (rng() < rate) g[i] += gaussian(rng) * sigma;
    }
    return this;
  }

  static crossoverUniform(a, b, rng = Math.random) {
    const ga = a.genes, gb = b.genes;
    const child = new Genome(ga.length);
    const gc = child.genes;
    for (let i = 0; i < ga.length; i++) gc[i] = (rng() < 0.5) ? ga[i] : gb[i];
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