import { Genome } from './Genome';

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
    
    // Track historical outputs for tanh layers (indexed by layer, then neuron)
    this._historicalTanhOutputs = [];
    // Track historical outputs for relu layers (indexed by layer, then neuron)
    this._historicalReluOutputs = [];
    // Track historical outputs for leaky_relu layers (indexed by layer, then neuron)
    this._historicalLeakyReluOutputs = [];
    for (let l = 0; l < sizes.length - 1; l++) {
      if (activations[l] === "tanh") {
        this._historicalTanhOutputs[l] = [];
        for (let n = 0; n < sizes[l + 1]; n++) {
          this._historicalTanhOutputs[l][n] = [];
        }
      }
      if (activations[l] === "relu") {
        this._historicalReluOutputs[l] = [];
        for (let n = 0; n < sizes[l + 1]; n++) {
          this._historicalReluOutputs[l][n] = [];
        }
      }
      if (activations[l] === "leaky_relu") {
        this._historicalLeakyReluOutputs[l] = [];
        for (let n = 0; n < sizes[l + 1]; n++) {
          this._historicalLeakyReluOutputs[l][n] = [];
        }
      }
    }
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
      
      // Extract weights
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
      
      // Calculate saturation for tanh layers (per neuron)
      if (activations[l] === "tanh" && this._historicalTanhOutputs[l]) {
        const neuronSaturations = [];
        for (let n = 0; n < outD; n++) {
          const outputs = this._historicalTanhOutputs[l][n];
          if (outputs && outputs.length > 0) {
            let saturatedCount = 0;
            for (const value of outputs) {
              // Saturation: |output| > 0.95
              if (Math.abs(value) > 0.95) {
                saturatedCount++;
              }
            }
            neuronSaturations.push(saturatedCount / outputs.length);
          } else {
            neuronSaturations.push(0);
          }
        }
        
        // Calculate aggregate stats for saturation
        const saturationStats = NeuralNet._calculateParamStats(neuronSaturations);
        layerStats.saturation = {
          perNeuron: neuronSaturations,
          ...saturationStats
        };
      }
      
      // Calculate dead neurons for relu layers (per neuron)
      if (activations[l] === "relu" && this._historicalReluOutputs[l]) {
        const neuronDeadRates = [];
        for (let n = 0; n < outD; n++) {
          const outputs = this._historicalReluOutputs[l][n];
          if (outputs && outputs.length > 0) {
            let deadCount = 0;
            for (const value of outputs) {
              // Dead neuron: activation is 0
              if (value === 0) {
                deadCount++;
              }
            }
            neuronDeadRates.push(deadCount / outputs.length);
          } else {
            neuronDeadRates.push(0);
          }
        }
        
        // Calculate aggregate stats for dead neurons
        const deadStats = NeuralNet._calculateParamStats(neuronDeadRates);
        layerStats.deadNeurons = {
          perNeuron: neuronDeadRates,
          ...deadStats
        };
      }
      
      // Calculate negative-dominance rate for leaky_relu layers (per neuron)
      if (activations[l] === "leaky_relu" && this._historicalLeakyReluOutputs[l]) {
        const neuronNegativeDominanceRates = [];
        for (let n = 0; n < outD; n++) {
          const outputs = this._historicalLeakyReluOutputs[l][n];
          if (outputs && outputs.length > 0) {
            let negativeCount = 0;
            for (const value of outputs) {
              // Negative-dominance: activation is below zero
              if (value < 0) {
                negativeCount++;
              }
            }
            neuronNegativeDominanceRates.push(negativeCount / outputs.length);
          } else {
            neuronNegativeDominanceRates.push(0);
          }
        }
        
        // Calculate aggregate stats for negative-dominance rate
        const negativeDominanceStats = NeuralNet._calculateParamStats(neuronNegativeDominanceRates);
        layerStats.negativeDominanceRate = {
          perNeuron: neuronNegativeDominanceRates,
          ...negativeDominanceStats
        };
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
          b[o] = NeuralNet._relu(sum);
          // Track relu outputs for dead neuron calculation (per neuron)
          if (this._historicalReluOutputs[l] && this._historicalReluOutputs[l][o]) {
            this._historicalReluOutputs[l][o].push(b[o]);
          }
        } else if (act === "leaky_relu") {
          b[o] = NeuralNet._leaky_relu(sum, 0.01);
          // Track leaky_relu outputs for negative-dominance rate calculation (per neuron)
          if (this._historicalLeakyReluOutputs[l] && this._historicalLeakyReluOutputs[l][o]) {
            this._historicalLeakyReluOutputs[l][o].push(b[o]);
          }
        } else if (act === "tanh") {
          b[o] = Math.tanh(sum);
          // Track tanh outputs for saturation calculation (per neuron)
          if (this._historicalTanhOutputs[l] && this._historicalTanhOutputs[l][o]) {
            this._historicalTanhOutputs[l][o].push(b[o]);
          }
        } else b[o] = sum;
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