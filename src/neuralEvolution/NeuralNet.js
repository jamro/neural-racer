import Genome from './Genome';

class NeuralNet {
  constructor(sizes, activations, genome = null) {
    this.sizes = sizes;               // eg. [inputDim, 64, 64, 2]
    this.activations = activations;   // eg. ["relu","relu","tanh"]
    
    // Calculate genome length
    let n = 0;
    for (let l = 0; l < sizes.length - 1; l++) {
      n += sizes[l] * sizes[l + 1]; // weights
      n += sizes[l + 1];            // biases
    }
    this.genomeLength = n;

    // check if genome length is correct
    if (genome && genome.genes.length !== this.genomeLength) {
      throw new Error(`Genome length mismatch: ${genome.genes.length} !== ${this.genomeLength}`);
    }

    // Create random genome if not provided
    if (genome) {
      this.genome = genome;
    } else {
      this.genome = new Genome(this.genomeLength);
      this.genome.randomize();
    }

    const maxN = Math.max(...sizes);
    this._a = new Float32Array(maxN);
    this._b = new Float32Array(maxN);
    this._out = new Float32Array(sizes[sizes.length - 1]);
  }

  genomeLength() {
    const { sizes } = this;
    let n = 0;
    for (let l = 0; l < sizes.length - 1; l++) {
      n += sizes[l] * sizes[l + 1]; // weights
      n += sizes[l + 1];            // biases
    }
    return n;
  }

  layerGenomeLength() {
    const { sizes } = this;
    const lengths = [];
    for (let l = 0; l < sizes.length - 1; l++) {
      lengths.push(sizes[l] * sizes[l + 1] + sizes[l + 1]); // weights + biases
    }
    return lengths;
  }

  static _relu(x) { return x > 0 ? x : 0; }

  forward(inputs, out = this._out) {
    const { sizes, activations, genome } = this;
    const genes = genome.genes || genome; // support both Genome object and array

    // input -> a
    for (let i = 0; i < sizes[0]; i++) this._a[i] = inputs[i];

    let a = this._a, b = this._b;
    let off = 0;

    for (let l = 0; l < sizes.length - 1; l++) {
      const inD = sizes[l];
      const outD = sizes[l + 1];
      const act = activations[l];

      const wBase = off;
      const bBase = off + outD * inD;

      for (let o = 0; o < outD; o++) {
        let sum = genes[bBase + o];
        const row = wBase + o * inD;
        for (let i = 0; i < inD; i++) sum += genes[row + i] * a[i];

        if (act === "relu") b[o] = NeuralNet._relu(sum);
        else if (act === "tanh") b[o] = Math.tanh(sum);
        else b[o] = sum;
      }

      off += outD * inD + outD;
      const tmp = a; a = b; b = tmp;
    }

    const finalD = sizes[sizes.length - 1];
    for (let i = 0; i < finalD; i++) out[i] = a[i];
    return out;
  }
}

export default NeuralNet;