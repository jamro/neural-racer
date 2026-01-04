import * as PIXI from 'pixi.js';


const RADIUS_PIXELS = 250; // Radius of radar beams in pixels
const MIN_DISTANCE_FROM_ORIGIN = 50; // Minimum distance from origin where sliders start (to prevent knob overlap)
const KNOB_RADIUS = 5; // Radius of the knob/button in pixels
const KNOB_COLOR = 0xFF6600; // Color of the knob fill (green)
const KNOB_STROKE_COLOR = 0xffffff; // Color of the knob stroke
const KNOB_STROKE_WIDTH = 2; // Width of the knob stroke
// Beam colors and styling
const BEAM_BACKGROUND_COLOR = 0xFF6600; // Color of the beam background (gray)
const BEAM_COLOR = 0xffffff; // Color of the beam main/filled portion (white)
const BEAM_WIDTH = 2; // Width of the beam lines
const CLICKABLE_THRESHOLD = 10; // Clickable threshold distance from beam line in pixels (for easier interaction)
const HIT_AREA_PADDING = 10; // Padding for the overall hit area in pixels
const HEIGHT_MAX = 300; // Maximum distance beams can extend on y-axis (beams limited to [-HEIGHT_MAX/2, HEIGHT_MAX/2])
const EPSILON = 1e-10; // Threshold for floating point comparison
// Concentric range rings (background circles)
const RING_COUNT = 10;
const RING_COLOR = 0xffffff;
const RING_ALPHA = 0.18;
const RING_WIDTH = 1;
const TAU = Math.PI * 2;

class RadarBeamSlider extends PIXI.Container {
  /**
   * @param {number[]} radarBeamAngles - Array of angles in radians
   */
  constructor(radarBeamAngles) {
    super();

    this.radarBeamAngles = radarBeamAngles || [];
    this.minValue = 0; // meters
    this.maxValue = 100; // meters (base max value)
    
    // Calculate effective radius and max value for each beam based on HEIGHT_MAX constraint
    this.beamEffectiveRadii = [];
    this.beamMaxValues = [];
    
    for (let i = 0; i < this.radarBeamAngles.length; i++) {
      const angle = this.radarBeamAngles[i];
      const sinAngle = Math.sin(angle);
      
      // Calculate maximum distance before hitting y-axis limit
      let effectiveRadius = RADIUS_PIXELS;
      if (Math.abs(sinAngle) > EPSILON) { // Avoid division by zero for horizontal beams
        const maxDistanceByY = HEIGHT_MAX / (2 * Math.abs(sinAngle));
        effectiveRadius = Math.min(RADIUS_PIXELS, maxDistanceByY);
      }
      
      this.beamEffectiveRadii.push(effectiveRadius);
      
      // Adjust max value proportionally if beam is truncated
      const maxValueRatio = effectiveRadius / RADIUS_PIXELS;
      this.beamMaxValues.push(this.maxValue * maxValueRatio);
    }
    
    this.values = [...this.beamMaxValues]; // Initialize all values to their beam's max meters

    // Pre-compute the arc range for ring drawing so rings only show within the beam fan.
    // This prevents rings from appearing "behind" the outer beams (e.g. on the left).
    this._ringArc = this._computeRingArc(this.radarBeamAngles);

    // Track which beam is being dragged
    this._draggingBeamIndex = null;
    this._pointerId = null;

    // Create graphics for rings, beams and knobs
    this.ringsGraphics = new PIXI.Graphics();
    this.beamsGraphics = new PIXI.Graphics();
    this.knobsGraphics = new PIXI.Graphics();
    this.addChild(this.ringsGraphics);
    this.addChild(this.beamsGraphics);
    this.addChild(this.knobsGraphics);

    // Enable pointer events
    this.eventMode = 'static';
    this.cursor = 'pointer';

    // Clip rings (and optionally beams) to a vertical window so it matches HEIGHT_MAX.
    // This keeps circles from extending above/below +/- HEIGHT_MAX/2.
    const clipW = (RADIUS_PIXELS + HIT_AREA_PADDING) * 2;
    const clipH = HEIGHT_MAX;
    this._clipMask = new PIXI.Graphics();
    this._clipMask.rect(-clipW / 2, -clipH / 2, clipW, clipH);
    this._clipMask.fill({ color: 0xffffff, alpha: 1 });
    // Mask affects only rendering; it doesn't block pointer events (hitArea handles that).
    this.ringsGraphics.mask = this._clipMask;
    this.addChild(this._clipMask);

    // Set up hit area to cover the entire radar area (use max effective radius)
    const maxEffectiveRadius = this.beamEffectiveRadii.length > 0 
      ? Math.max(...this.beamEffectiveRadii, RADIUS_PIXELS)
      : RADIUS_PIXELS;
    const hitAreaSize = maxEffectiveRadius + HIT_AREA_PADDING;
    this.hitArea = new PIXI.Circle(0, 0, hitAreaSize);

    // Event listeners
    this.on('pointerdown', this._onPointerDown, this);
    this.on('pointermove', this._onPointerMove, this);
    this.on('pointerup', this._onPointerUp, this);
    this.on('pointerupoutside', this._onPointerUp, this);

    this.redraw();
  }

  _normalizeAngleRad(a) {
    // Normalize to [0, TAU)
    const aa = a % TAU;
    return aa < 0 ? aa + TAU : aa;
  }

  /**
   * Compute the minimal circular interval covering all beam angles by removing the largest gap.
   * Returns an unwrapped interval [start, end] where end >= start.
   * @param {number[]} anglesRad
   * @returns {{start:number, end:number, span:number}|null}
   */
  _computeRingArc(anglesRad) {
    if (!Array.isArray(anglesRad) || anglesRad.length === 0) return null;

    const angles = anglesRad.map((a) => this._normalizeAngleRad(a)).sort((a, b) => a - b);
    if (angles.length === 1) {
      // Degenerate: single angle, draw a small arc around it
      const start = angles[0] - 0.15;
      const end = angles[0] + 0.15;
      return { start, end, span: end - start };
    }

    let maxGap = -Infinity;
    let maxGapIndex = -1; // gap between angles[i] and angles[i+1] (with wrap at end)
    for (let i = 0; i < angles.length; i++) {
      const a0 = angles[i];
      const a1 = i === angles.length - 1 ? angles[0] + TAU : angles[i + 1];
      const gap = a1 - a0;
      if (gap > maxGap) {
        maxGap = gap;
        maxGapIndex = i;
      }
    }

    // Arc is the complement of the largest gap.
    const start = angles[(maxGapIndex + 1) % angles.length];
    const endBase = angles[maxGapIndex];
    const end = maxGapIndex === angles.length - 1 ? endBase : endBase + TAU;
    const span = Math.max(0, end - start);
    return { start, end, span };
  }

  /**
   * Get current values for all beams (in meters)
   * @returns {number[]}
   */
  getValues() {
    return [...this.values];
  }

  /**
   * Set values for all beams (in meters)
   * @param {number[]} values - Array of values in meters (0-100)
   */
  setValues(values) {
    if (!Array.isArray(values) || values.length !== this.radarBeamAngles.length) {
      return;
    }
    this.values = values.map((v, i) => this._clampValue(v, i));
    this.redraw();
    this.emit('change', this.getValues());
  }

  /**
   * Set value for a specific beam
   * @param {number} beamIndex - Index of the beam
   * @param {number} value - Value in meters
   */
  setValue(beamIndex, value) {
    if (beamIndex < 0 || beamIndex >= this.values.length) return;
    const clampedValue = this._clampValue(value, beamIndex);
    if (this.values[beamIndex] !== clampedValue) {
      this.values[beamIndex] = clampedValue;
      this.redraw();
      this.emit('change', this.getValues());
    }
  }

  /**
   * Clamp a value to the valid range for a specific beam
   * @param {number} value - Value to clamp
   * @param {number} beamIndex - Index of the beam
   * @returns {number} Clamped value
   */
  _clampValue(value, beamIndex) {
    const maxValue = this.beamMaxValues[beamIndex];
    return Math.max(this.minValue, Math.min(maxValue, value));
  }

  /**
   * Convert meters to pixels along the beam (from origin)
   * @param {number} meters - Distance in meters
   * @param {number} beamIndex - Index of the beam
   * @returns {number} Distance in pixels from origin
   */
  _metersToPixels(meters, beamIndex) {
    const maxValue = this.beamMaxValues[beamIndex];
    const effectiveRadius = this.beamEffectiveRadii[beamIndex];
    const t = meters / maxValue; // Normalize to 0-1
    const usableRange = effectiveRadius - MIN_DISTANCE_FROM_ORIGIN;
    return MIN_DISTANCE_FROM_ORIGIN + t * usableRange;
  }

  /**
   * Convert pixels along the beam (from origin) to meters
   * @param {number} pixels - Distance in pixels from origin
   * @param {number} beamIndex - Index of the beam
   * @returns {number} Distance in meters
   */
  _pixelsToMeters(pixels, beamIndex) {
    const maxValue = this.beamMaxValues[beamIndex];
    const effectiveRadius = this.beamEffectiveRadii[beamIndex];
    const usableRange = effectiveRadius - MIN_DISTANCE_FROM_ORIGIN;
    const t = Math.max(0, Math.min(1, (pixels - MIN_DISTANCE_FROM_ORIGIN) / usableRange));
    return t * maxValue;
  }

  /**
   * Get beam start point (at MIN_DISTANCE_FROM_ORIGIN)
   * @param {number} beamIndex - Index of the beam
   * @returns {{x: number, y: number}}
   */
  _getBeamStartPoint(beamIndex) {
    const angle = this.radarBeamAngles[beamIndex];
    return {
      x: Math.cos(angle) * MIN_DISTANCE_FROM_ORIGIN,
      y: Math.sin(angle) * MIN_DISTANCE_FROM_ORIGIN
    };
  }

  /**
   * Get beam end point (at effective radius)
   * @param {number} beamIndex - Index of the beam
   * @returns {{x: number, y: number}}
   */
  _getBeamEndPoint(beamIndex) {
    const angle = this.radarBeamAngles[beamIndex];
    const effectiveRadius = this.beamEffectiveRadii[beamIndex];
    return {
      x: Math.cos(angle) * effectiveRadius,
      y: Math.sin(angle) * effectiveRadius
    };
  }

  /**
   * Project a point onto a beam line segment
   * @param {number} x - X coordinate of the point
   * @param {number} y - Y coordinate of the point
   * @param {number} beamIndex - Index of the beam
   * @returns {{t: number, projX: number, projY: number, pixelDistance: number}|null}
   */
  _projectPointOntoBeam(x, y, beamIndex) {
    const start = this._getBeamStartPoint(beamIndex);
    const end = this._getBeamEndPoint(beamIndex);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy;
    
    if (lengthSq === 0) return null;
    
    const relX = x - start.x;
    const relY = y - start.y;
    const t = Math.max(0, Math.min(1, (relX * dx + relY * dy) / lengthSq));
    const projX = start.x + t * dx;
    const projY = start.y + t * dy;
    
    // Calculate pixel distance from origin using t and beam geometry
    const effectiveRadius = this.beamEffectiveRadii[beamIndex];
    const pixelDistance = MIN_DISTANCE_FROM_ORIGIN + t * (effectiveRadius - MIN_DISTANCE_FROM_ORIGIN);
    
    return { t, projX, projY, pixelDistance };
  }

  /**
   * Draw an arc on the rings graphics
   * @param {number} radius - Radius of the arc
   * @param {number} arcStart - Start angle in radians
   * @param {number} arcSpan - Span of the arc in radians
   */
  _drawArc(radius, arcStart, arcSpan) {
    const steps = Math.max(12, Math.ceil((arcSpan * radius) / 18)); // ~18px per segment
    for (let s = 0; s <= steps; s++) {
      const a = arcStart + (arcSpan * s) / steps;
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius;
      if (s === 0) this.ringsGraphics.moveTo(x, y);
      else this.ringsGraphics.lineTo(x, y);
    }
    this.ringsGraphics.stroke({
      color: RING_COLOR,
      alpha: RING_ALPHA,
      width: RING_WIDTH,
    });
  }

  /**
   * Get the closest beam index and distance to a point
   * @param {number} x - X coordinate in local space
   * @param {number} y - Y coordinate in local space
   * @returns {{index: number, distance: number, t: number, pixelDistance: number}|null}
   */
  _getClosestBeam(x, y) {
    let closest = null;
    let minDistance = Infinity;

    for (let i = 0; i < this.radarBeamAngles.length; i++) {
      const projection = this._projectPointOntoBeam(x, y, i);
      if (!projection) continue;

      // Distance from point to projected point on beam
      const distX = x - projection.projX;
      const distY = y - projection.projY;
      const distance = Math.sqrt(distX * distX + distY * distY);

      // Check if within threshold
      if (distance < CLICKABLE_THRESHOLD && distance < minDistance) {
        minDistance = distance;
        closest = {
          index: i,
          distance: distance,
          t: projection.t,
          pixelDistance: projection.pixelDistance
        };
      }
    }

    return closest;
  }

  redraw() {
    this.ringsGraphics.clear();
    this.beamsGraphics.clear();
    this.knobsGraphics.clear();

    // Draw concentric rings (background)
    const maxEffectiveRadius = this.beamEffectiveRadii.length > 0
      ? Math.max(...this.beamEffectiveRadii, RADIUS_PIXELS)
      : RADIUS_PIXELS;
    const usableRingRadius = Math.max(0, maxEffectiveRadius - MIN_DISTANCE_FROM_ORIGIN);
    const ringCount = Math.max(0, Math.floor(RING_COUNT));
    if (ringCount > 0 && usableRingRadius > 0 && this._ringArc && this._ringArc.span > 0) {
      const { start: arcStart, span: arcSpan } = this._ringArc;
      for (let i = 1; i <= ringCount; i++) {
        const r = MIN_DISTANCE_FROM_ORIGIN + (usableRingRadius * i) / ringCount;
        this._drawArc(r, arcStart, arcSpan);
      }
    }

    // Draw start arc (connects beam start points)
    if (this._ringArc && this._ringArc.span > 0) {
      const { start: arcStart, span: arcSpan } = this._ringArc;
      this._drawArc(MIN_DISTANCE_FROM_ORIGIN, arcStart, arcSpan);
    }

      // Draw beams
    for (let i = 0; i < this.radarBeamAngles.length; i++) {
      const angle = this.radarBeamAngles[i];
      const value = this.values[i];
      const pixelDistance = this._metersToPixels(value, i);

      // Calculate start and end points
      const start = this._getBeamStartPoint(i);
      const end = this._getBeamEndPoint(i);

      // Draw beam line (gray background)
      this.beamsGraphics.moveTo(start.x, start.y);
      this.beamsGraphics.lineTo(end.x, end.y);
      this.beamsGraphics.stroke({ color: BEAM_BACKGROUND_COLOR, width: BEAM_WIDTH });

      // Draw filled portion (white, up to current value)
      if (pixelDistance > MIN_DISTANCE_FROM_ORIGIN) {
        this.beamsGraphics.moveTo(start.x, start.y);
        const valueX = Math.cos(angle) * pixelDistance;
        const valueY = Math.sin(angle) * pixelDistance;
        this.beamsGraphics.lineTo(valueX, valueY);
        this.beamsGraphics.stroke({ color: BEAM_COLOR, width: BEAM_WIDTH });
      }

      // Draw knob at current value position
      const knobX = Math.cos(angle) * pixelDistance;
      const knobY = Math.sin(angle) * pixelDistance;
      
      this.knobsGraphics.circle(knobX, knobY, KNOB_RADIUS);
      this.knobsGraphics.fill({ color: KNOB_COLOR });
      this.knobsGraphics.stroke({ color: KNOB_STROKE_COLOR, width: KNOB_STROKE_WIDTH });
    }
  }

  _onPointerDown(e) {
    const pos = e.getLocalPosition(this);
    const closest = this._getClosestBeam(pos.x, pos.y);
    
    if (closest) {
      this._draggingBeamIndex = closest.index;
      this._pointerId = e.pointerId ?? null;
      
      // Set value based on position
      const meters = this._pixelsToMeters(closest.pixelDistance, closest.index);
      this.setValue(closest.index, meters);
    }
  }

  _onPointerMove(e) {
    if (this._draggingBeamIndex === null) return;
    if (this._pointerId != null && e.pointerId != null && e.pointerId !== this._pointerId) return;

    const pos = e.getLocalPosition(this);
    const projection = this._projectPointOntoBeam(pos.x, pos.y, this._draggingBeamIndex);
    
    if (!projection) return;
    
    const meters = this._pixelsToMeters(projection.pixelDistance, this._draggingBeamIndex);
    this.setValue(this._draggingBeamIndex, meters);
  }

  _onPointerUp(e) {
    if (this._draggingBeamIndex === null) return;
    if (this._pointerId != null && e.pointerId != null && e.pointerId !== this._pointerId) return;
    
    this._draggingBeamIndex = null;
    this._pointerId = null;
  }
}

export default RadarBeamSlider;