# Performance Review: Simulation and Render Loop

## Critical Performance Issues

### 1. **Excessive Ray Intersection Calculations** ⚠️ CRITICAL
**Location:** `CarObject.update()` → `rayIntersectionsMinLength()`

**Problem:**
- Each car performs **9 ray intersection calculations** per simulation step (radarBeamCount = 9)
- With 35 cars at 120 FPS: **35 × 9 × 120 = 37,800 ray calculations per second**
- Each ray calculation involves:
  - Grid cell traversal (`getCellsForRay`)
  - Multiple segment intersection tests
  - Math operations (cos, sin, cross products)

**Impact:** This is likely the #1 performance bottleneck.

**Recommendations:**
- Reduce radar beam count (9 → 5 or 7)
- Cache ray results when car hasn't moved significantly
- Use spatial partitioning more aggressively
- Consider reducing simulation FPS (120 → 60 or 80)
- Skip radar updates for crashed cars

---

### 2. **Leader Finding in Render Loop** ⚠️ HIGH
**Location:** `Simulation.renderLoop()` line 134

**Problem:**
- `findLeader()` is called **every render frame** (~60 FPS)
- Iterates through all 35 cars and calculates `calculateScore()` for each
- `calculateScore()` calls `calculateCheckpointProgress()` which performs projection calculations
- This happens even when leader hasn't changed

**Impact:** Unnecessary CPU work every frame.

**Recommendations:**
- Cache leader and only recalculate periodically (e.g., every 10 frames)
- Only update leader when a car's score changes significantly
- Move leader calculation to simulation loop instead of render loop

---

### 3. **Rendering Crashed Cars** ⚠️ MEDIUM
**Location:** `Simulation.renderLoop()` line 127-130

**Problem:**
- All cars (including crashed ones) are rendered every frame
- Crashed cars still update their view position/rotation even though they're static
- `renderRadar()` is called for all cars, but only active car's radar is visible

**Impact:** Wasted GPU/CPU cycles rendering invisible or static objects.

**Recommendations:**
- Skip `render()` calls for crashed cars
- Set `view.visible = false` for crashed cars
- Only render radar for the active car

---

### 4. **Graphics Clearing Every Frame** ⚠️ MEDIUM
**Location:** `CarView.renderRadar()` line 58

**Problem:**
- `this.radar.clear()` is called every frame for the active car
- Graphics clearing and redrawing is expensive in PixiJS
- Radar lines are redrawn even if beam lengths haven't changed

**Impact:** Unnecessary graphics operations.

**Recommendations:**
- Only clear/redraw radar when beam lengths actually change
- Cache previous beam lengths and compare
- Consider using sprites or cached graphics instead of dynamic drawing

---

### 5. **High Simulation FPS** ⚠️ MEDIUM
**Location:** `index.js` line 24, `Simulation.js` line 7

**Problem:**
- Simulation runs at 120 FPS (2× typical render FPS)
- This doubles all update calculations
- Fixed timestep at 120 FPS may be overkill for physics accuracy

**Impact:** 2× the computational load for minimal benefit.

**Recommendations:**
- Reduce to 60-80 FPS for simulation
- Or use variable timestep with clamping
- Consider decoupling simulation FPS from render FPS more intelligently

---

### 6. **Collision Detection Every Frame** ⚠️ MEDIUM
**Location:** `CarObject.update()` lines 81, 91

**Problem:**
- `isBoxCollidingWithWall()` called every simulation step for every car
- `isBoxCollidingWithCheckpoint()` called every simulation step for every car
- Both involve expensive box-segment collision tests
- Called even for crashed cars (though they return early)

**Impact:** 35 × 2 × 120 = 8,400 collision checks per second.

**Recommendations:**
- Skip collision checks for crashed cars (move check before other logic)
- Reduce collision check frequency (every N frames)
- Optimize collision detection with early exits

---

### 7. **No Frustum Culling** ⚠️ LOW
**Location:** `SimulationView`, `Simulation.renderLoop()`

**Problem:**
- All cars are rendered regardless of whether they're on screen
- No visibility culling based on camera position

**Impact:** Rendering off-screen objects wastes GPU time.

**Recommendations:**
- Implement frustum culling
- Only render cars within viewport bounds
- Use spatial partitioning for efficient culling

---

### 8. **Text Rendering Every Frame** ⚠️ LOW
**Location:** `Simulation.renderLoop()` line 145, `CarDetailsView.render()`

**Problem:**
- `carDetailsView.render()` updates text every frame
- Text rendering is relatively expensive
- Text content may not change every frame

**Recommendations:**
- Only update text when values actually change
- Throttle text updates (e.g., every 3-5 frames)
- Use integer rounding to reduce string operations

---

## Performance Metrics Summary

**Current Load (35 cars, 120 sim FPS, 60 render FPS):**
- Ray intersections: **37,800/sec**
- Collision checks: **8,400/sec**
- Leader calculations: **60/sec**
- Render calls: **2,100/sec** (35 cars × 60 FPS)

**Estimated CPU Usage:** Very High (likely 50-100% on modern CPUs)

---

## Priority Fixes

1. **Immediate (High Impact, Low Effort):**
   - Skip rendering/updates for crashed cars
   - Reduce simulation FPS to 60-80
   - Cache leader and update less frequently

2. **Short-term (High Impact, Medium Effort):**
   - Reduce radar beam count
   - Optimize radar rendering (cache, conditional updates)
   - Skip collision checks for crashed cars

3. **Long-term (Medium Impact, High Effort):**
   - Implement frustum culling
   - Optimize ray intersection with better caching
   - Consider Web Workers for neural net calculations

---

## Code Locations for Fixes

- `src/sim/Simulation.js` - Render/simulation loops
- `src/car/CarObject.js` - Update logic, collision checks
- `src/car/CarView.js` - Radar rendering
- `src/neural/Generation.js` - Leader finding
- `src/index.js` - Simulation FPS setting

