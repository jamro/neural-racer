import { v4 as uuidv4 } from 'uuid';

// Int16 + scale quantization for storing genomes in IndexedDB
// - ~2x smaller than Float32
// - very low quality loss for GA-evolved NN weights (especially in typical ranges)
// - structured-clone friendly (Int16Array + number)

const I16_MAX = 32767;


const ADJ = [
  "Swift","Silent","Feral","Crimson","Iron","Neon","Rogue","Phantom","Shadow","Wild",
  "Rapid","Vicious","Steel","Electric","Burning","Frozen","Obsidian","Lunar","Solar","Atomic",
  "Hyper","Turbo","Quantum","Vector","Kinetic","Cosmic","Plasma","Graviton","Ion","Photon",
  "Savage","Relentless","Unbound","Untamed","Furious","Merciless","Ruthless","Savvy","Cunning","Bold",
  "Brutal","Heavy","Light","Dense","Lean","Sharp","Blazing","Smoldering","Scorching","Icy",
  "Stormy","Thunderous","Windborne","Aerial","Grounded","Low","High","Deep","Hollow","Solid",
  "Adaptive","Evolving","Learning","Reactive","Predictive","Stochastic","Chaotic","Ordered","Stable","Unstable",
  "Balanced","Skewed","Biased","Neutral","Optimal","Subtle","Aggressive","Passive","Measured","Extreme",
  "Precision","Exact","Coarse","Rough","Smooth","Polished","Raw","Refined","Pure","Hybrid",
  "Synthetic","Organic","Mechanical","Digital","Analog","Virtual","Physical","Tactile","Fluid","Rigid",
  "Fast","Faster","Quick","Sluggish","Patient","Eager","Alert","Focused","Aware","Blind",
  "Fearless","Careful","Reckless","Cautious","Calculated","Improvised","Planned","Random","Directed","Lost",
  "Driven","Motivated","Hungry","Restless","Calm","Serene","Tense","Nervous","Confident","Hesitant",
  "Dominant","Submissive","Leading","Trailing","Central","Peripheral","Forward","Backward","Lateral","Angular",
  "Curved","Straight","Twisted","Bent","Warped","Aligned","Misaligned","Offset","Centered","Drifting",
  "Slipping","Gripping","Anchored","Floating","Rolling","Sliding","Spinning","Pivoting","Gliding","Charging",
  "Resilient","Fragile","Durable","Brittle","Elastic","Plastic","Hard","Soft","Flexible","Stiff",
  "Prime","Secondary","Tertiary","Final","Initial","Early","Late","Timely","Delayed","Instant"
];
const NOUN = [
  "Comet","Viper","Falcon","Raven","Tiger","Panther","Wolf","Cobra","Eagle","Hawk",
  "Wraith","Phantom","Specter","Ghost","Shadow","Mirage","Drift","Slide","Skid","Grip",
  "Vector","Tensor","Matrix","Neuron","Synapse","Circuit","Signal","Kernel","Process","Agent",
  "Rocket","Missile","Arrow","Bolt","Bullet","Lance","Spear","Blade","Edge","Point",
  "Storm","Thunder","Lightning","Cyclone","Vortex","Tornado","Tempest","Gale","Breeze","Wave",
  "Fire","Ember","Flame","Inferno","Spark","Ash","Frost","Ice","Glacier","Snow",
  "Orbit","Axis","Node","Core","Shell","Frame","Chassis","Engine","Piston","Rotor",
  "Gear","Clutch","Valve","Bearing","Axle","Hub","Wheel","Tire","Track","Lane",
  "Path","Route","Course","Circuit","Loop","Arc","Curve","Bend","Turn","Apex",
  "Driftline","Raceline","Boundary","Edgeway","Runoff","Barrier","Gate","Checkpoint","Finish","Start",
  "Pulse","Flow","Stream","Flux","Surge","Burst","Spike","Peak","Drop","Rise",
  "Force","Torque","Vectorial","Momentum","Inertia","Mass","Energy","Power","Drive","Boost",
  "Skimmer","Crawler","Runner","Charger","Sprinter","Dasher","Cruiser","Glider","Slider","Spinner",
  "Sentinel","Hunter","Seeker","Tracker","Scout","Watcher","Observer","Guardian","Ranger","Nomad",
  "Machine","Automaton","Construct","Entity","Instance","Replica","Clone","Prototype","Variant","Model",
  "Genome","Chromosome","Mutation","Crossover","Fitness","Selection","Evolution","Species","Lineage","Ancestry",
  "Operator","Controller","Driver","Pilot","Navigator","Steerer","Balancer","Regulator","Optimizer","Planner",
  "Shard","Fragment","Module","Unit","Block","Segment","Layer","Stack","Array","Field"
];

function getRandomAlias(rng = Math.random) {
  const a = ADJ[(rng() * ADJ.length) | 0];
  const n = NOUN[(rng() * NOUN.length) | 0];
  return `${a}-${n}`;
}

let _idCounter = 0;

function createShortId() {
  _idCounter = (_idCounter + 1) % 1e6;
  const t = Date.now().toString(36).toUpperCase();       // time
  const c = _idCounter.toString(36).toUpperCase().padStart(3, "0"); // counter
  const r = Math.floor(Math.random() * 36**3).toString(36).toUpperCase().padStart(3, "0"); // random
  return `${t}${c}${r}`.slice(-8); // 8 characters
}

function crateUniqueName() {
  return `${getRandomAlias()} #${createShortId()}`;
}



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
    fullName: genome.fullName,
    genesQ,           // Int16Array is structured-clone friendly
    length: genesQ.length,
  };
}

/**
 * Dequantize stored genome -> Genome instance with Float32Array genes
 */
function deserializeGenome(data) {
  if (!data) throw new Error("deserializeGenome: no data");

  const { genomeId, scale, fullName } = data;

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
  genome.fullName = fullName;
  return genome;
}

class Genome {
  constructor(length, genes = null) {
    this.genomeId = uuidv4();
    this.fullName = crateUniqueName();
    this.genes = genes ?? new Float32Array(length);
  }

  clone(preserveId = false) {
    const result = new Genome(this.genes.length, new Float32Array(this.genes));
    if(preserveId) {
      result.genomeId = this.genomeId;
      result.fullName = this.fullName;
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
