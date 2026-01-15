# Persistence & Storage Footprint

This section explains **how evolution state is persisted**, **what is stored**, and **how storage size is kept under control**, with a focus on *practical trade-offs* rather than maximum compression.

This is part of the larger [evolution system](evolution.md) that manages genetic algorithms for neural network controllers.

---

## Where Data Is Stored

- **IndexedDB** (via `idb`)
- Database: `neural-racer-evolution`

### Object stores
- **`evolution`**
  - One record per save file (key: filename, default `current-evolution`)
  - Holds the *current* state needed to resume evolution quickly.
- **`generations`**
  - Multiple records keyed by `generationId`
  - Indexed by `evolutionId`
  - Holds historical generation data (full or compressed).

**Why IndexedDB**
- Async, non-blocking.
- Handles tens of MB safely.
- Supports structured cloning of typed arrays.
- Much more suitable than `localStorage` for long-running evolution.

---

## What Gets Persisted

### Evolution header (`storeEvolution`)
Stored once per save:
- `evolutionId`
- `lastGenerationId`
- **Hall of Fame** payload
- Epoch runner state (active runner, track progression, replay counters)
- Also writes the current generation snapshot into `generations`.

This allows **instant resume** without replaying history.

---

### Generation records (`storeGeneration`)
Each generation stores:
- Metadata: `generationId`, `evolutionId`, `epoch`, `trackName`, `populationSize`
- **Cars array** (only for recent generations):
  - `{ score, stats, genome }`
- Per-generation aggregates:
  - `overallScore` (mean, median, percentiles, completion rate)

**Why per-car storage**
- Needed for:
  - replay,
  - debugging,
  - visualization,
  - Hall-of-Fame candidate selection.

---

### Hall of Fame
- Stores **serialized genomes** plus:
  - per-track scores,
  - global/generalist scores.
- Size bounded by:
  - `hallOfFame.perTrackSize` (default `20`)
  - `minFitnessDistance` (prevents duplicates).

This keeps HoF small and diverse by design.

---

## Retention & Compression Strategy

### In-memory vs persistent history
- Runtime may keep up to `populationHistorySize` generations (e.g. 30).
- Persistent DB is kept leaner.

### Trimming (`trimGenerationHistory`)
- Keeps the **latest `n` generations** fully detailed (default `10`).
- Older generations are **compressed in place**:
  - `cars` array is removed.
  - A `compressed: true` flag is set.
  - Aggregate metrics are retained.

**Why**
- Charts, stagnation detection, and analysis still work.
- Storage drops by orders of magnitude.

---

## Genome Footprint (Architecture `[18, 32, 32, 2]`)

The network architecture is detailed in [neural_net.md](neural_net.md).

### Parameter count (corrected & verified)

- Input → Hidden 1:  
  `18 × 32 + 32 biases = 608`
- Hidden 1 → Hidden 2:  
  `32 × 32 + 32 biases = 1056`
- Hidden 2 → Output:  
  `32 × 2 + 2 biases = 66`

**Total genes:**  
**608 + 1056 + 66 = 1730 parameters**

---

### Quantized storage per genome

- Genes: `Int16 × 1730` → **3460 bytes**
- Scale factor (`Number`) → **8 bytes**
- IDs & metadata (UUID + alias) → ~80–120 bytes

**≈ 3.6–3.7 KB per genome**  
(excluding IndexedDB record overhead)

**Why Int16 + scale**
- ~2× smaller than Float32.
- Minimal quality loss for evolved weights.
- Fast structured cloning.
- No extra decompression step needed at runtime.

---

## Generation Footprint (Population = 200)

Approximate size for a **full generation**:

- Genomes: `200 × 3.7 KB` → **~740 KB**
- Scores & stats: ~100 bytes / car → **~20 KB**
- Metadata: **~1–2 KB**

**Total:** **~0.75–0.80 MB per detailed generation**

### History sizing
- 10 detailed generations → **~7.5–8 MB**
- Older generations (compressed) → **few KB each**

This keeps long experiments manageable.

---

## Hall of Fame Footprint

- Per track: up to `20` genomes
- `20 × 3.7 KB ≈ 74 KB` per track
- Plus small score metadata

Even with many tracks, HoF remains **tiny compared to full history**.

---

## Key Optimization Choices (Why They Matter)

- **Quantized genomes**
  - Biggest single win for storage.
- **Compressed old generations**
  - Keeps charts without storing raw populations.
- **Separate evolution header**
  - Resume is fast; no need to scan history.
- **Bounded Hall of Fame**
  - Prevents silent memory growth.
  - Enforces diversity explicitly.

---

## Clearing State

- `Database.clearEvolution()`
  - Removes the current evolution header.
  - Removes associated generations.
  - Does **not** wipe other saved evolutions.

---

## Practical Notes

- IndexedDB adds some overhead per record; real usage will be slightly higher than raw estimates.
- If storage becomes a concern:
  - reduce `populationHistorySize`,
  - lower trim depth,
  - or reduce `populationSize`.
- Genome compression is already near-optimal; further gains would require lossy pruning, not recommended.