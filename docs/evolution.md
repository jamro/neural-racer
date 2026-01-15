# Evolution Algorithm — Overview & Design Rationale

This document explains **what the evolutionary system is**, **how the loop is structured**, **what operators are used**, and most importantly, **why each decision exists**, based on observed failure modes such as stagnation, over-specialization, and lack of generalization.

---

## What This Evolution System Is

The system is a **genetic algorithm (GA)** that evolves [neural-network controllers](neural_net.md) for driving cars on multiple, irregular tracks. The cars operate in a [physics simulation](physics.md) that models realistic vehicle dynamics.

Key characteristics:

- No gradient descent, no backpropagation.
- Fitness is noisy, discontinuous, and environment-dependent.
- Each generation must:
  - discover better driving policies,
  - preserve diversity,
  - and survive catastrophic mutations.

The algorithm is therefore **designed for robustness**, not theoretical optimality.

---

## Core Goals

1. **Rapid skill acquisition per track**
   - Cars must quickly learn to complete a new track at all.
2. **Controlled diversity**
   - Avoid collapse into a single brittle strategy.
3. **Multi-track generalization**
   - Prevent "one-track champions" from dominating forever.
4. **Persistent learning**
   - Never fully forget previously solved tracks.

Every mechanism below exists to support at least one of these goals.

---

## Configuration Overview (`Config.js`)

### Population & Simulation

- **Population size (200)**  
  Large enough to:
  - maintain genetic diversity,
  - allow tournament selection to work meaningfully,
  - support hall-of-fame sampling without starving the main pool.

- **Population history size**
  - Enables stagnation detection and evolution diagnostics.
  - Allows rollback and visualization.

- **Simulation step & speed**
  - Decoupled from evolution logic.
  - Allows faster-than-real-time training without destabilizing physics.

---

## Fitness Design

### Fitness Components

- **Track distance**
  - Primary learning signal.
  - Always defined, even for failing cars.

- **Average speed (light weight)**
  - Prevents "crawl safely" strategies.
  - Encourages efficiency without overwhelming safety.

- **Average speed at finish line**
  - Gated reward.
  - Ensures speed matters *only* if the track is completed.

### Why this composition

- Pure distance → slow but safe drivers.
- Pure speed → reckless drivers.
- Gated speed reward forces:
  > *"Finish first, then optimize."*

This mirrors curriculum learning naturally.

---

## Genome Representation

### Flat Genome (`Float32Array`)

- All weights and biases stored linearly.
- Genome length derived from NN topology.

**Why flat**
- Uniform mutation and crossover.
- Easy serialization and quantization.
- Predictable effects of blend crossover.

### Quantized Persistence (Int16 + scale)

- Reduces IndexedDB footprint drastically.
- Keeps long-term evolution history feasible.
- Scale preserves dynamic range per genome.

---

## Genetic Operators

### Selection: Tournament Selection

- Tournament size configurable (typically 5–8).

**Why tournament**
- Does not require normalized fitness.
- Robust to noisy scores.
- Preserves selection pressure without killing diversity.

---

### Crossover: Hybrid (Blend + Uniform)

- **Blend crossover**
  - Interpolates behaviors.
  - Excellent for continuous control.
- **Uniform crossover**
  - Preserves discrete structural traits.

**Why hybrid**
- Blend alone → population homogenizes too fast.
- Uniform alone → evolution becomes jumpy and slow.
- Hybrid gives both smooth refinement *and* structural innovation.

---

### Mutation: Layer-Aware Gaussian Noise

- **Hidden layers**
  - Lower rate, smaller sigma.
  - Preserve learned abstractions.
- **Output layer**
  - Higher rate, larger sigma.
  - Encourage behavioral exploration.

**Why layer separation**
- Mutating early layers too aggressively destroys perception.
- Mutating outputs is cheap and often productive.

### Clamp

- Prevents runaway genes.
- Avoids permanent saturation of activations.
- Keeps crossover meaningful even late in training.

---

## Elitism

### Standard Elites (`eliteRatio`)
- Top performers copied 1-to-1.

### Hall-of-Fame Elites (`hallOfFameEliteRatio`)
- Inject proven solutions from the past.

**Why two elite channels**
- Standard elites preserve *current* progress.
- HoF elites preserve *historical* capabilities.

This directly counters catastrophic forgetting.

---

## Elimination & Random Injection

- Every `eliminationEpochs`, bottom `eliminationRate` are replaced.

**Why**
- Random genomes almost never win directly.
- But as parents in crossover, they:
  - inject new genetic material,
  - break local optima,
  - enable rare but critical recombinations.

This is **exploration fuel**, not a shortcut to success.

---

## Modes & Adaptive Parameters

The system switches modes automatically:

### Standard
- Balanced exploration/exploitation.
- Used when learning progresses normally.

### Exploration
- Higher mutation.
- Smaller tournaments.
- More randomness.

Used when:
- stagnation is detected,
- leader fitness is still low.

### Finetuning
- Lower mutation.
- Stronger selection pressure.

Used when:
- population already performs well,
- goal is consistency and speed.

**Why modes matter**
- A single static GA configuration cannot:
  - escape early local optima *and*
  - converge precisely at the end.

---

## Generation Lifecycle

1. **Simulation**
   - Run all cars on the active track.
2. **Scoring**
   - Compute individual fitness.
   - Aggregate population statistics.
3. **Selection**
   - Tournament selection over scored population.
4. **Elites injection**
   - Standard + hall-of-fame elites.
5. **Offspring creation**
   - Crossover → mutation → clamp.
6. **Diversity injection**
   - Periodic elimination & randomization.
7. **Repopulation**
   - New generation assembled.

Each step is intentionally simple but composable.

---

## Hall of Fame (HoF)

### What It Stores
- Top genomes per track.
- Only if the score difference exceeds `minFitnessDistance` (a simple, limited but effective diversity metric).

### Why HoF Exists
- Single-track evolution creates specialists.
- HoF allows:
  - cross-track reuse,
  - delayed evaluation,
  - discovery of generalists.

### Global Rating
- Genomes accumulate scores across tracks.
- Selection can prefer:
  - track specialists,
  - or consistent generalists.

---

## Multi-Track Pressure

The system evolved from:
1. **Single-track evolution**
2. → **Periodic replay of completed tracks**
3. → **HoF cross-evaluation**
4. → **All-tracks evaluation**

This progression mirrors how humans learn:
> master tasks individually → then generalize.

---

## Stagnation Detection

Tracked metrics:
- max score
- median score
- completion rate
- score deltas vs noise

**Why multiple signals**
- Max score alone lies (outliers).
- Median shows population health.
- Completion rate shows feasibility.
- Noise-adaptive thresholds avoid false positives.

---

## Epoch Runners

Different runners exist because **one loop cannot do everything well**:

- **EvolutionEpochRunner**
  - Fast specialization on one track.
- **HallOfFameEpochRunner**
  - Evaluates Hall-of-Fame drivers across all tracks
- **AllTracksEpochRunner**
  - Forces true generalization.

Switching runners is a *strategic decision*, not an optimization trick.

---

## Persistence

- IndexedDB persistence allows:
  - long-running experiments,
  - replay,
  - offline analysis.

This is critical: **you cannot evolve what you cannot observe**.

Read more about persistence in [persistence.md](persistence.md).

For practical insights and lessons learned during development, see [learnings.md](learnings.md).

---

## Summary

This evolutionary system is designed to:

- tolerate noisy fitness,
- escape local optima,
- preserve historical knowledge,
- and eventually produce **generalist drivers**.

Every mechanism (elitism, HoF, modes, hybrid crossover) exists because a simpler GA *failed*  or turned out to be *ineffective* at some point during development.