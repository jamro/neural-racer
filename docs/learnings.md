# Project Learnings — Evolving Neural Drivers with Genetic Algorithms

This document collects the **most important practical learnings** gathered during the project of evolving neural-network-based driving agents using a genetic algorithm.  
These are **experience-driven insights**—things that actually made the system work better, converge faster, or become more stable and understandable.

They are grouped thematically for clarity.

---

## 1. Learning Stability & Robustness

### Random Jitter at Start
Adding small random jitter to the **starting position and direction** of the car prevents the leader from exploiting brittle, overfitted trajectories.

**Why it matters**
- Forces solutions to be robust, not path-perfect.
- Exposes instability early.
- Prevents “knife-edge” leaders that collapse under slight perturbations.

---

### Standing-Out Leader Is a Smell
When one leader clearly outperforms the rest:
- do **not** over-optimize that leader,
- focus on helping the **rest of the population catch up**.

**Why**
- A better population produces a *better next leader*.
- Lone champions often encode fragile, non-generalizable behaviors.

---

### Catastrophic Forgetting Is Real
When evolving on a single track, the population *forgets* previously solved tracks.

**Mitigation**
- Periodically inject a **completed past track**.
- Run a single evolution epoch on it.

This stabilizes shared features and prevents regression.

---

## 2. Neural Network Design & Mutation

See [neural_net.md](neural_net.md) for the full architecture overview.

### Layered Mutation
Mutating **hidden layers** and **output layers** differently is critical.

- Hidden layers: lower mutation rate & sigma  
  → preserves learned features.
- Output layer: higher mutation rate & sigma  
  → explores new action strategies cheaply.

This dramatically improves exploration without destroying perception.

---

### Leaky ReLU > ReLU
Leaky ReLU consistently outperformed ReLU.

**Why**
- Prevents dead neurons.
- Keeps all parameters evolvable.
- Makes crossover and mutation more effective long-term.

Dead neurons = dead genes = wasted genome space.

---

### Less Neurons Is More (But Not Too Few)
- Large networks:
  - introduce many unused parameters,
  - slow evolution,
  - dilute mutation pressure.
- Very small networks:
  - lack representational power,
  - converge slowly or plateau early.

**Sweet spot**
- Enough neurons to encode abstraction,
- few enough to keep evolution focused.

---

## 3. Inputs, Sensors & Perception

### Nine Radar Beams Is a Sweet Spot
Nine beams provided:
- sufficient spatial awareness,
- manageable input dimensionality.

More beams increased noise and genome size without clear benefit.

---

### Radar Beam Layout Matters
Better results came from:
- **higher resolution near the center**,
- **longer effective range in front**.

Achieved by:
- placing more beams near forward direction,
- adjusting decay rates during normalization.

---

### Extra Derived Inputs Help
Derived signals such as:
- time to collision,
- left/right balance,
- safe direction,

significantly improved learning speed and driving quality.

They act as **inductive bias**, not shortcuts.

---

### Meaningful Inputs Must Be Tested
To verify input usefulness:
1. Disable selected inputs (set to 0).
2. Re-run races.
3. Compare score deltas.

If performance barely changes, the input is not pulling its weight.

---

## 4. Evolution Operators & Strategy

See [evolution.md](evolution.md) for the complete evolution system design.

### Crossover Types Matter
- **Blend crossover**:
  - preserves learned behavior,
  - smooth interpolation.
- **Uniform crossover**:
  - explores new strategies,
  - breaks correlations.

**Hybrid approach** (with adjustable ratio) consistently worked best.

---

### Curriculum Learning Works
Start with:
- easy tracks → learn fundamentals.

Then:
- gradually increase difficulty.

This allows:
- feature reuse,
- smoother convergence,
- faster learning of complex tracks.

---

### Multi-Track Evolution Is Essential
Hall of Fame alone is **not enough** to create generalists.

To evolve agents that work on *all* tracks:
- run the **same population** on multiple tracks,
- compute **aggregated fitness**.

Generalization must be part of the **fitness signal**, not just archive logic.

---

### Config Modes Improve Convergence
Static GA parameters are suboptimal.

Adaptive modes help:
- **Exploration mode**:
  - when stagnated and leader is weak.
- **Finetuning mode**:
  - when stagnated but leader is strong.

Switching modes based on stagnation detection improves both speed and quality.

---

## 5. Hall of Fame Design

### Per-Track Hall of Fame
Maintain a separate HoF per track:
- e.g. top 30 genomes per track.
- only include significantly different solutions (fitness distance threshold).

This preserves diversity and avoids duplicates.

---

### Track Multi-Track Performance
For each HoF genome:
- track how it performs on *all* tracks.
- compute a **global score**:
  - penalties below 1.0,
  - rewards above 1.0.

Selection should be **rank-based**, not greedy.

---

## 6. Performance & Engineering

### Flat Data Structures Matter
Avoid:
- per-step allocations,
- Sets,
- small arrays,
- string keys.

Use:
- flat arrays,
- typed arrays,
- explicit indexing.

This drastically reduces GC pressure and allows far more simulations per second.

---

### Compress Genome Data
Raw genome storage is expensive:
- long histories can reach hundreds of MB.

Solution:
- quantize genes using **Int16 + per-genome scale**.
- store compactly in IndexedDB.

This preserves quality while making persistence practical.

See [persistence.md](persistence.md) for detailed storage strategies and footprint analysis.

---

### Performance Is a Feature
Genetic algorithms need **huge iteration counts**.

Therefore:
- optimize relentlessly,
- avoid memory leaks,
- ensure long-running stability.

More iterations in less time beats any single algorithmic tweak.

---

## 7. Visualization & Tooling

### Visualizing Neural Networks
Treat visualization as a **readability pipeline**, not raw dumping:

- normalize weights per-layer (e.g. P95),
- sparsify connections (top-K + threshold),
- reduce crossings by node reordering,
- fade changes over time to avoid jitter.

The goal is insight, not completeness.

---

### Visualizing Evolution
Visuals that helped:
- crossover animations,
- gene-difference heatmaps,
- activation statistics over time.

These revealed problems that metrics alone missed.

---

### AI-Generated Graphics
AI tools are useful for:
- generating spritesheets,
- creating track textures,
- visual variety with low effort.

This speeds up iteration without affecting learning logic.

---

## Final Takeaway

The most important lesson:

> **Evolution does not fail because of math — it fails because of brittleness, poor signals, or slow iteration.**

Success came from:
- stabilizing learning,
- shaping the search space,
- introducing the right inductive biases,
- and making the system observable and fast.

This project is less about “finding the perfect algorithm”  
and more about **building an environment where evolution can succeed**.