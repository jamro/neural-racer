import { Genome } from '../evolution/Genome';

class NeuralNet {
  constructor(sizes, activations, genome = null) {
    this.sizes = sizes;               // e.g. [inputDim, 64, 64, 2]
    this.activations = activations;   // e.g. ["relu","relu","tanh"]

    // Calculate genome length
    let n = 0;
    for (let l = 0; l < sizes.length - 1; l++) {
      n += sizes[l] * sizes[l + 1]; // weights
      n += sizes[l + 1];            // biases
    }

    // Avoid name collision with method genomeLength()
    this._genomeLength = n;

    // Check genome length is correct
    if (genome && genome.genes.length !== this._genomeLength) {
      throw new Error(`Genome length mismatch: ${genome.genes.length} !== ${this._genomeLength}`);
    }

    // Create random genome if not provided
    if (genome) {
      this.genome = genome;
    } else {
      this.genome = new Genome(this._genomeLength);
      this.genome.randomize();
    }

    // Reusable buffers
    const maxN = Math.max(...sizes);
    this._a = new Float32Array(maxN);
    this._b = new Float32Array(maxN);
    this._out = new Float32Array(sizes[sizes.length - 1]);

    // Store last activations for visualization
    this._lastActivations = null;

    // --- Activation statistics (O(neurons) memory, not O(time)) ---
    // Track counts per neuron for:
    // tanh: saturation rate (|output| > 0.95)
    // relu: dead rate (output === 0)
    // leaky_relu: negative-dominance rate (output < 0)
    this._actStats = {
      tanh: [],
      relu: [],
      leaky_relu: []
    };

    for (let l = 0; l < sizes.length - 1; l++) {
      const outD = sizes[l + 1];
      const act = activations[l];

      if (act === "tanh") {
        this._actStats.tanh[l] = new Array(outD);
        for (let o = 0; o < outD; o++) {
          this._actStats.tanh[l][o] = { count: 0, saturated: 0 };
        }
      } else if (act === "relu") {
        this._actStats.relu[l] = new Array(outD);
        for (let o = 0; o < outD; o++) {
          this._actStats.relu[l][o] = { count: 0, dead: 0 };
        }
      } else if (act === "leaky_relu") {
        this._actStats.leaky_relu[l] = new Array(outD);
        for (let o = 0; o < outD; o++) {
          this._actStats.leaky_relu[l][o] = { count: 0, negative: 0 };
        }
      }
    }
  }

  // (kept for compatibility) returns the computed genome length
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
  static _leaky_relu(x, alpha = 0.01) { return x > 0 ? x : alpha * x; }

  static _calculateParamStats(values) {
    if (values.length === 0) {
      return { mean: 0, std: 0, min: 0, max: 0 };
    }

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { mean, std, min, max };
  }

  resetActivationStats() {
    const { tanh, relu, leaky_relu } = this._actStats;

    for (const layer of tanh) {
      if (!layer) continue;
      for (const s of layer) { s.count = 0; s.saturated = 0; }
    }
    for (const layer of relu) {
      if (!layer) continue;
      for (const s of layer) { s.count = 0; s.dead = 0; }
    }
    for (const layer of leaky_relu) {
      if (!layer) continue;
      for (const s of layer) { s.count = 0; s.negative = 0; }
    }
  }

  getStats() {
    const { sizes, genome, activations } = this;
    const genes = genome.genes || genome;
    const stats = [];
    let off = 0;

    for (let l = 0; l < sizes.length - 1; l++) {
      const inD = sizes[l];
      const outD = sizes[l + 1];
      const wBase = off;
      const bBase = off + outD * inD;

      // Extract weights (note: this can allocate a lot; optimize if you call getStats often)
      const weights = [];
      for (let o = 0; o < outD; o++) {
        const row = wBase + o * inD;
        for (let i = 0; i < inD; i++) {
          weights.push(genes[row + i]);
        }
      }

      // Extract biases
      const biases = [];
      for (let o = 0; o < outD; o++) {
        biases.push(genes[bBase + o]);
      }

      // Calculate stats
      const weightStats = NeuralNet._calculateParamStats(weights);
      const biasStats = NeuralNet._calculateParamStats(biases);

      const layerStats = {
        layer: l,
        activation: activations[l],
        weights: weightStats,
        biases: biasStats
      };

      // Activation diagnostics from counters
      if (activations[l] === "tanh" && this._actStats.tanh[l]) {
        const neuronSaturations = [];
        for (let n = 0; n < outD; n++) {
          const s = this._actStats.tanh[l][n];
          neuronSaturations.push(s && s.count > 0 ? s.saturated / s.count : 0);
        }
        const saturationStats = NeuralNet._calculateParamStats(neuronSaturations);
        layerStats.saturation = { perNeuron: neuronSaturations, ...saturationStats };
      }

      if (activations[l] === "relu" && this._actStats.relu[l]) {
        const neuronDeadRates = [];
        for (let n = 0; n < outD; n++) {
          const s = this._actStats.relu[l][n];
          neuronDeadRates.push(s && s.count > 0 ? s.dead / s.count : 0);
        }
        const deadStats = NeuralNet._calculateParamStats(neuronDeadRates);
        layerStats.deadNeurons = { perNeuron: neuronDeadRates, ...deadStats };
      }

      if (activations[l] === "leaky_relu" && this._actStats.leaky_relu[l]) {
        const neuronNegativeDominanceRates = [];
        for (let n = 0; n < outD; n++) {
          const s = this._actStats.leaky_relu[l][n];
          neuronNegativeDominanceRates.push(s && s.count > 0 ? s.negative / s.count : 0);
        }
        const negativeDominanceStats = NeuralNet._calculateParamStats(neuronNegativeDominanceRates);
        layerStats.negativeDominanceRate = { perNeuron: neuronNegativeDominanceRates, ...negativeDominanceStats };
      }

      stats.push(layerStats);
      off += outD * inD + outD;
    }

    return { params: stats };
  }

  forward(inputs, out = this._out) {
    const { sizes, activations, genome } = this;
    const genes = genome.genes || genome; // support both Genome object and array

    // input -> a
    for (let i = 0; i < sizes[0]; i++) this._a[i] = inputs[i];

    // Capture activations for visualization
    this._lastActivations = [];
    this._lastActivations.push(new Float32Array(this._a.slice(0, sizes[0]))); // Input layer

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

        if (act === "relu") {
          const v = NeuralNet._relu(sum);
          b[o] = v;

          const s = this._actStats.relu[l]?.[o];
          if (s) {
            s.count++;
            if (v === 0) s.dead++;
          }
        } else if (act === "leaky_relu") {
          const v = NeuralNet._leaky_relu(sum, 0.01);
          b[o] = v;

          const s = this._actStats.leaky_relu[l]?.[o];
          if (s) {
            s.count++;
            if (v < 0) s.negative++;
          }
        } else if (act === "tanh") {
          const v = Math.tanh(sum);
          b[o] = v;

          const s = this._actStats.tanh[l]?.[o];
          if (s) {
            s.count++;
            if (Math.abs(v) > 0.95) s.saturated++;
          }
        } else {
          b[o] = sum;
        }
      }

      // Capture activations for this layer
      this._lastActivations.push(new Float32Array(b.slice(0, outD)));

      off += outD * inD + outD;
      const tmp = a; a = b; b = tmp;
    }

    const finalD = sizes[sizes.length - 1];
    for (let i = 0; i < finalD; i++) out[i] = a[i];
    return out;
  }

  getLastActivations() {
    return this._lastActivations;
  }

  dispose() {
    this.genome = null;

    this._a = null;
    this._b = null;
    this._out = null;

    this._actStats = null;
  }
}

export default NeuralNet;