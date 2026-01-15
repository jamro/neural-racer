import * as PIXI from 'pixi.js';
import { getCarTexture, getShadowTexture } from '../../loaders/AssetLoader';

export default class CarSensorPreview extends PIXI.Container {
  constructor(options = {}) {
    super();

    this.showRadar = options.showRadar !== undefined ? options.showRadar : true;
    this.showTires = options.showTires !== undefined ? options.showTires : true;

    this.radarCanvas = new PIXI.Graphics();
    this.addChild(this.radarCanvas);
    this.tiresCanvas = new PIXI.Graphics();
    this.addChild(this.tiresCanvas);
    this.smokeCanvas = new PIXI.Graphics();
    this.addChild(this.smokeCanvas);

    this.carShadow = new PIXI.Sprite(getShadowTexture());
    this.carShadow.anchor.set(0.5, 0.5);
    this.addChild(this.carShadow);
    this.car = new PIXI.Sprite(getCarTexture());
    this.car.anchor.set(0.5, 0.5);
    this.car.rotation = -Math.PI *0.6;
    this.carShadow.rotation = this.car.rotation;
    this.addChild(this.car);


    if(this.showRadar) {
      this.drawRadar()
    }
    if(this.showTires) {
      this.drawTires()
    }
    
  }

  drawRadar() {
    this.radarCanvas.clear();
    const radarBeamAngles = [
      -75 * Math.PI / 180,
      -60 * Math.PI / 180,
      -45 * Math.PI / 180,
      -30 * Math.PI / 180,
      -15 * Math.PI / 180,
      0 * Math.PI / 180,
      +15 * Math.PI / 180,
      +30 * Math.PI / 180,
      +45 * Math.PI / 180,
      +60 * Math.PI / 180,
      +75 * Math.PI / 180,
    ]
    const radarX = 0 * Math.cos(this.car.rotation)
    const radarY = 0 * Math.sin(this.car.rotation)

    const beamLength = 120;
    for (let i=1; i<radarBeamAngles.length-1; i++) {
      const angle = radarBeamAngles[i]
      this.radarCanvas.beginPath();
      this.radarCanvas.moveTo(radarX, radarY);
      this.radarCanvas.lineTo(
        radarX + Math.cos(angle + this.car.rotation) * beamLength, 
        radarY + Math.sin(angle + this.car.rotation) * beamLength
      );
      this.radarCanvas.stroke({
        color: 0xffffff,
        width: 2,
        alpha: 0.1
      });
    }

    // draw radar circle as arch curved path beetween radarBeamAngles[0] radarBeamAngles[8]
    const steps = 16
    for (let i = 0; i < steps; i++) {
      const radius = i * beamLength / steps
      const startAngle = radarBeamAngles[0] + this.car.rotation
      const endAngle = radarBeamAngles[radarBeamAngles.length - 1] + this.car.rotation

      // Fill pass
      this.radarCanvas.beginPath();
      this.radarCanvas.moveTo(
        radarX + radius * Math.cos(startAngle), 
        radarY + radius * Math.sin(startAngle)
      );
      this.radarCanvas.arc(radarX, radarY, radius, startAngle, endAngle);
      this.radarCanvas.closePath();
      this.radarCanvas.fill({
        color: 0xffffff,
        alpha: 0.04
      });

      // Stroke pass
      this.radarCanvas.beginPath();
      this.radarCanvas.moveTo(
        radarX + radius * Math.cos(startAngle), 
        radarY + radius * Math.sin(startAngle)
      );
      this.radarCanvas.arc(radarX, radarY, radius, startAngle, endAngle);
      this.radarCanvas.stroke({
        color: 0xffffff,
        width: 1,
        alpha: 0.2
      });
    }
  }

  drawTires() {
    const carWidth = 30
    const carLength = 75

    const DRIFT = {
      // -1 = car drifts to the left (marks curve left), +1 = to the right
      side: -1,
      slipDeg: 26,

      // Tracks
      trackLen: 88,
      curveOut: 34,
      endOut: 14,
      segments: 22,
      coreOff: 0.8,
      jitterBase: 0.35,
      jitterGrow: 0.75,

      // Rear marks are stronger/longer than front
      rear: { strength: 1.0, lenMul: 1.05, curveMul: 1.0, endMul: 1.0 },
      front: { strength: 0.45, lenMul: 0.80, curveMul: 0.45, endMul: 0.55 },

      smoke: {
        puffs: 22,
        back0: 10,
        back1: 125,
        side0: 10,
        side1: 34,
        jitter0: 7,
        jitter1: 18,
        r0: 6,
        r1: 20,
        rRand: 6,
        alpha0: 0.18,
        alphaRand: 0.12,
        color: 0xdadada,
        blendMode: 'screen'
      }
    }

    const rot = this.car.rotation

    const basis = (angle) => ({
      forward: { x: Math.cos(angle), y: Math.sin(angle) },
      right: { x: Math.cos(angle - Math.PI / 2), y: Math.sin(angle - Math.PI / 2) },
    })

    const clamp01 = (v) => Math.max(0, Math.min(1, v))

    const strokeSeg = (x1, y1, x2, y2, style) => {
      this.tiresCanvas.moveTo(x1, y1)
      this.tiresCanvas.lineTo(x2, y2)
      this.tiresCanvas.stroke(style)
    }

    const cubic = (p0, c1, c2, p3, t) => {
      const it = 1 - t
      return (
        it * it * it * p0 +
        3 * it * it * t * c1 +
        3 * it * t * t * c2 +
        t * t * t * p3
      )
    }

    const carBasis = basis(rot)

    const wheel = (long, lat) => ({
      x: carBasis.forward.x * long + carBasis.right.x * lat,
      y: carBasis.forward.y * long + carBasis.right.y * lat,
    })

    // Wheel positions in local space (relative to preview center)
    const wheels = [
      wheel(+0.5 * carLength, +0.5 * carWidth),
      wheel(+0.5 * carLength, -0.5 * carWidth),
      wheel(-0.5 * carLength, +0.5 * carWidth),
      wheel(-0.5 * carLength, -0.5 * carWidth),
    ]

    // Key drift cue: travel direction (velocity) != facing direction (heading).
    const slipAngle = -DRIFT.side * (DRIFT.slipDeg * Math.PI / 180)
    const travelBasis = basis(rot + slipAngle)

    const drawWheelTrack = (p0, isRear) => {
      const T = isRear ? DRIFT.rear : DRIFT.front
      const strength = T.strength
      const len = DRIFT.trackLen * T.lenMul
      const curve = DRIFT.curveOut * T.curveMul
      const end = DRIFT.endOut * T.endMul

      // Cubic bezier:
      // - start aligned with car heading (wheel orientation)
      // - turn later into drift (travel basis)
      const p3 = {
        x: p0.x - travelBasis.forward.x * len + travelBasis.right.x * DRIFT.side * end,
        y: p0.y - travelBasis.forward.y * len + travelBasis.right.y * DRIFT.side * end,
      }
      const c1 = {
        x: p0.x - carBasis.forward.x * (len * 0.35),
        y: p0.y - carBasis.forward.y * (len * 0.35),
      }
      const c2 = {
        x: p0.x - travelBasis.forward.x * (len * 0.80) + travelBasis.right.x * DRIFT.side * curve,
        y: p0.y - travelBasis.forward.y * (len * 0.80) + travelBasis.right.y * DRIFT.side * curve,
      }

      let lastX = p0.x
      let lastY = p0.y

      for (let i = 1; i <= DRIFT.segments; i++) {
        const t = i / DRIFT.segments
        const fade = 1 - t
        const fade2 = fade * fade

        const jitter = (Math.random() - 0.5) * (DRIFT.jitterBase + DRIFT.jitterGrow * t)
        const x = cubic(p0.x, c1.x, c2.x, p3.x, t) + travelBasis.right.x * jitter
        const y = cubic(p0.y, c1.y, c2.y, p3.y, t) + travelBasis.right.y * jitter

        // Base “dusty” pass
        strokeSeg(lastX, lastY, x, y, {
          color: 0xffffff,
          width: (7.2 - 2.6 * t) * (0.85 + 0.35 * strength),
          alpha: (0.95 * fade2) * (0.60 + 0.55 * strength)
        })

        // Darker core pass (slightly offset sideways)
        const coreOff = DRIFT.coreOff * DRIFT.side
        strokeSeg(
          lastX + travelBasis.right.x * coreOff,
          lastY + travelBasis.right.y * coreOff,
          x + travelBasis.right.x * coreOff,
          y + travelBasis.right.y * coreOff,
          {
            color: 0x000000,
            width: (3.8 - 1.8 * t) * (0.80 + 0.40 * strength),
            alpha: clamp01((0.55 * fade) * (0.55 + 0.75 * strength))
          }
        )

        lastX = x
        lastY = y
      }
    }

    for (let wi = 0; wi < wheels.length; wi++) {
      drawWheelTrack(wheels[wi], wi >= 2)
    }

    // Smoke (rear tires) to sell the drifting effect.
    this.drawSmoke({
      rearLeft: wheels[2],
      rearRight: wheels[3],
      drift: DRIFT,
      travelBasis
    })

  }

  drawSmoke({ rearLeft, rearRight, drift, travelBasis }) {
    if (!this.smokeCanvas) return

    this.smokeCanvas.clear()
    // Pixi v8: blendMode supports strings (avoid PIXI.BLEND_MODES which no longer exists)
    this.smokeCanvas.blendMode = drift.smoke.blendMode

    const drawPuffs = (origin) => {
      for (let i = 0; i < drift.smoke.puffs; i++) {
        const t = i / (drift.smoke.puffs - 1)
        const fade = 1 - t
        const fade2 = fade * fade

        // Trails behind the wheel and slightly outward in drift direction.
        const back = drift.smoke.back0 + t * drift.smoke.back1
        const side = drift.side * (drift.smoke.side0 + t * drift.smoke.side1)

        const jitterX = (Math.random() - 0.5) * (drift.smoke.jitter0 + drift.smoke.jitter1 * t)
        const jitterY = (Math.random() - 0.5) * (drift.smoke.jitter0 + drift.smoke.jitter1 * t)

        const x = origin.x - travelBasis.forward.x * back + travelBasis.right.x * side + jitterX
        const y = origin.y - travelBasis.forward.y * back + travelBasis.right.y * side + jitterY

        const r = drift.smoke.r0 + t * drift.smoke.r1 + Math.random() * drift.smoke.rRand
        const alpha = (drift.smoke.alpha0 + Math.random() * drift.smoke.alphaRand) * fade2

        this.smokeCanvas.circle(x, y, r)
        this.smokeCanvas.fill({
          color: drift.smoke.color,
          alpha
        })
      }
    }

    drawPuffs(rearLeft)
    drawPuffs(rearRight)
  }

  destroy(options) {
    // Pixi v8 nuance: `Graphics.destroy({...})` will NOT destroy its GraphicsContext
    // unless you pass `{ context: true }` (or call destroy() with no options).
    // When we pass Container-style options from the parent (children/texture/baseTexture),
    // the internal GraphicsContext can stay alive and be retained by the renderer
    // (`GraphicsContextSystem._gpuContextHash`), which looks like a leak.
    const graphicsDestroyOptions =
      options && typeof options === 'object'
        ? { ...options, context: true }
        : { context: true };

    // Clear and destroy Graphics objects
    if (this.radarCanvas) {
      this.removeChild(this.radarCanvas);
      this.radarCanvas.clear();
      this.radarCanvas.destroy(graphicsDestroyOptions);
      this.radarCanvas = null;
    }
    if (this.tiresCanvas) {
      this.removeChild(this.tiresCanvas);
      this.tiresCanvas.clear();
      this.tiresCanvas.destroy(graphicsDestroyOptions);
      this.tiresCanvas = null;
    }
    if (this.smokeCanvas) {
      this.removeChild(this.smokeCanvas);
      this.smokeCanvas.clear();
      this.smokeCanvas.destroy(graphicsDestroyOptions);
      this.smokeCanvas = null;
    }

    // Destroy Sprite objects
    if (this.carShadow) {
      this.removeChild(this.carShadow);
      this.carShadow.destroy(options);
      this.carShadow = null;
    }
    if (this.car) {
      this.removeChild(this.car);
      this.car.destroy(options);
      this.car = null;
    }

    // Call parent destroy
    super.destroy(options);
  }
}
