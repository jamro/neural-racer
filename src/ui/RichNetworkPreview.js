import * as PIXI from 'pixi.js';
import NetworkPreview from './networkPreview/NetworkPreview';
import { getUiTurnIconTexture, getUiThrottleIconTexture } from '../loaders/AssetLoader';
import { COLOR_POSITIVE, COLOR_NEGATIVE } from './networkPreview/NetworkPreviewConstants';
import CarSensorPreview from './CarSensorPreview';

const LEFT_PADDING = 330;
const RIGHT_PADDING = 80;
const TOP_PADDING = 10;
const BOTTOM_PADDING = 10;


class RichNetworkPreview extends PIXI.Container {
  constructor() {
    super();

    // Setup master container
    this.masterContainer = new PIXI.Container();

    // Create network diagram
    this.netDiagram = new NetworkPreview([
      { range: [0, 8], group: true },
      { index: 9, artificialSources: [3, 5] },
      { index: 10, artificialSources: [3, 5] },
      { index: 11, artificialSources: [0,1,2,6,7,8] },
      { index: 12, artificialSources: [0,1,2,3,4,5,6,7,8] },
      { index: 13 },
      { index: 14 },
      { range: [15, 16], group: true }
    ]);
    this.masterContainer.addChild(this.netDiagram);

    // general purpose canvas
    this.canvas = new PIXI.Graphics();

    // Create icons
    this.turnIcon = new PIXI.Sprite(getUiTurnIconTexture());
    this.throttleIcon = new PIXI.Sprite(getUiThrottleIconTexture());
    this.turnIcon.anchor.set(0, 0.5);
    this.throttleIcon.anchor.set(0, 0.5);
    this.turnIcon.alpha = 0.8;
    this.throttleIcon.alpha = 0.8;
    this.masterContainer.addChild(this.turnIcon);
    this.masterContainer.addChild(this.throttleIcon);

    // Create labels
    this.radarLabel = this.addLabel("Radar Beams");
    this.radarLabel.anchor.set(1, 0.5);
    this.turnHistoryLabel = this.addLabel("Steering Wheel");
    this.turnHistoryLabel.anchor.set(1, 0.5);
    this.speedLabel = this.addLabel("Speed");
    this.speedLabel.anchor.set(1, 0.5);
    this.tractionLabel = this.addLabel("Traction");
    this.tractionLabel.anchor.set(1, 0.5);

    // Position all elements
    this.netDiagram.x = LEFT_PADDING;
    this.netDiagram.y = TOP_PADDING;

    this.turnIcon.x = this.netDiagram.x + this.netDiagram.canvasWidth + 33;
    this.turnIcon.y = this.netDiagram.y + this.netDiagram.canvasHeight * 0.25;
    this.turnIcon.anchor.set(0.5, 0.5);
    this.turnIcon.scale.set(0.45);
    
    this.throttleIcon.x = this.netDiagram.x + this.netDiagram.canvasWidth + 33;
    this.throttleIcon.y = this.netDiagram.y + this.netDiagram.canvasHeight * 0.75;
    this.throttleIcon.anchor.set(0.5, 0.5);
    this.throttleIcon.scale.set(0.45);

    this.radarLabel.x = this.netDiagram.x - 25;
    this.radarLabel.y = this.netDiagram.y + this.netDiagram.canvasHeight * 0.238 - 7;
    this.radarLabel.scale.set(1, 1);

    this.turnHistoryLabel.x = this.netDiagram.x - 25;
    this.turnHistoryLabel.y = this.netDiagram.y + this.netDiagram.canvasHeight * 0.54 - 7;
    this.turnHistoryLabel.scale.set(1, 1);

    this.speedLabel.x = this.netDiagram.x - 25;
    this.speedLabel.y = this.netDiagram.y + this.netDiagram.canvasHeight * 0.7 - 7;
    this.speedLabel.scale.set(1, 1);

    this.tractionLabel.x = this.netDiagram.x - 25;
    this.tractionLabel.y = this.netDiagram.y + this.netDiagram.canvasHeight * 0.88 - 7;
    this.tractionLabel.scale.set(1, 1);

    const labelCirclePos = 23
    this.canvas.circle(
      this.turnIcon.x + labelCirclePos,
      this.turnIcon.y - labelCirclePos,
      5
    );
    this.canvas.fill({
      color: COLOR_POSITIVE,
    });
    this.canvas.circle(
      this.turnIcon.x + labelCirclePos,
      this.turnIcon.y + labelCirclePos,
      5
    );
    this.canvas.fill({
      color: COLOR_NEGATIVE,
    });



    this.canvas.circle(
      this.throttleIcon.x + labelCirclePos,
      this.throttleIcon.y - labelCirclePos,
      5
    );
    this.canvas.fill({
      color: COLOR_POSITIVE,
    });

    this.canvas.circle(
      this.throttleIcon.x + labelCirclePos,
      this.throttleIcon.y + labelCirclePos,
      5
    );
    this.canvas.fill({
      color: COLOR_NEGATIVE,
    });

    this.carSensorPreview = new CarSensorPreview();
    this.carSensorPreview.scale.set(0.65);
    this.carSensorPreview.x = this.netDiagram.x - 250
    this.carSensorPreview.y = this.netDiagram.y + this.netDiagram.canvasHeight * 0.5;
    this.masterContainer.addChild(this.carSensorPreview);


    const bendX1 = this.carSensorPreview.x + 250 * this.carSensorPreview.scale.x;
    const bendX2 = this.carSensorPreview.x + 100 * this.carSensorPreview.scale.x;
    this.drawConnection(
      this.netDiagram.x - 3,
      this.netDiagram.y + this.netDiagram.canvasHeight * 0.238,
      this.carSensorPreview.x + 50 * this.carSensorPreview.scale.x,
      this.carSensorPreview.y - 90 * this.carSensorPreview.scale.y,
      bendX1, bendX2, 9
    );

    this.drawConnection(
      this.netDiagram.x - 3,
      this.netDiagram.y + this.netDiagram.canvasHeight * 0.54,
      this.carSensorPreview.x - 10 * this.carSensorPreview.scale.x,
      this.carSensorPreview.y - 15 * this.carSensorPreview.scale.y,
      bendX1, bendX2
    )

    this.drawConnection(
      this.netDiagram.x - 3,
      this.netDiagram.y + this.netDiagram.canvasHeight * 0.704,
      this.carSensorPreview.x + 38 * this.carSensorPreview.scale.x,
      this.carSensorPreview.y + 20 * this.carSensorPreview.scale.y,
      bendX1, bendX2
    );

    this.drawConnection(
      this.netDiagram.x - 3,
      this.netDiagram.y + this.netDiagram.canvasHeight * 0.884,
      this.carSensorPreview.x + 40 * this.carSensorPreview.scale.x,
      this.carSensorPreview.y + 80 * this.carSensorPreview.scale.y,
      bendX1, bendX2, 2
    );

    this.masterContainer.addChild(this.canvas);


    const righLabel = this.addLabel("R", { fill: 0x000000, fontSize: 7 });
    righLabel.anchor.set(0.5, 0.5);
    righLabel.x = this.turnIcon.x + labelCirclePos,
    righLabel.y = this.turnIcon.y - labelCirclePos;

    const leftLabel = this.addLabel("L", { fill: 0x000000, fontSize: 7 });
    leftLabel.anchor.set(0.5, 0.5);
    leftLabel.x = this.turnIcon.x + labelCirclePos,
    leftLabel.y = this.turnIcon.y + labelCirclePos;

    const upLabel = this.addLabel("+", { fill: 0x000000, fontSize: 12 });
    upLabel.anchor.set(0.5, 0.5);
    upLabel.x = this.throttleIcon.x + labelCirclePos,
    upLabel.y = this.throttleIcon.y - labelCirclePos;

    const downLabel = this.addLabel("-", { fill: 0x000000, fontSize: 12 });
    downLabel.anchor.set(0.5, 0.5);
    downLabel.x = this.throttleIcon.x + labelCirclePos,
    downLabel.y = this.throttleIcon.y + labelCirclePos;


    this.addChild(this.masterContainer);
  }

  addLabel(text, props={}) {
    const label = new PIXI.Text()
    this.masterContainer.addChild(label);
    label.style = {
      fontFamily: 'Exo2',
      fontSize: 10,
      fill: 0xffffff,
      fontStyle: 'normal',
      ...props
    };
    label.x = 10;
    label.y = 10;
    label.text = text;
    return label;
  }

  get canvasWidth() {
    return this.netDiagram.canvasWidth + LEFT_PADDING + RIGHT_PADDING;
  }

  get canvasHeight() {
    return this.netDiagram.canvasHeight + TOP_PADDING + BOTTOM_PADDING;
  }


  renderView(neuralNet, genome, activations) {
    this.netDiagram.renderView(neuralNet, genome, activations);
  }

  scaleView(width, height) {
    const scaleW = width / this.canvasWidth;
    const scaleH = height / this.canvasHeight;
    const scale = Math.min(scaleW, scaleH);
    this.masterContainer.scale.set(scale, scale);
    this.masterContainer.x = width/2 - this.canvasWidth * scale / 2
    this.masterContainer.y = height/2 - this.canvasHeight * scale / 2
  }


  drawConnection(x1, y1, x2, y2, bendX1, bendX2, fork=1) {
    this.drawCurvedConnection(bendX1, y1, bendX2, y2, 1, 0x888888);
     
    const forkDistance = 25
    const forgSegment = 6
    const forkHeight = (fork-1)*forgSegment


    if(fork > 1) {
      x1 -= forkDistance;
      for(let fy = y1-forkHeight/2; fy <= y1+forkHeight/2; fy += forgSegment) {
        this.drawCurvedConnection(x1 + forkDistance, fy, x1, y1, 1, 0x888888);
      }
    }

    this.canvas.moveTo(x1, y1);
    this.canvas.lineTo(bendX1, y1);
    this.canvas.moveTo(bendX2, y2);
    this.canvas.lineTo(x2, y2);
    this.canvas.stroke({
      color: 0x888888,
      width: 1,
      alpha: 1,
    });

    this.canvas.circle(x2, y2, 7);
    this.canvas.fill({
      color: 0x000000,
      alpha: 0.3,
    });
    this.canvas.stroke({
      color: 0xffffff,
      width: 1,
      alpha: 0.3,
    });
    this.canvas.circle(x2, y2, 1.5);
    this.canvas.fill({
      color: 0xffffff,
    });
  }

  drawCurvedConnection(x1, y1, x2, y2, alpha=0.5, color=0xffffff) {
    // Smooth cubic Bezier where the tangent at both ends is horizontal:
    // - Start tangent horizontal  => control point 1 has y == y1
    // - End tangent horizontal    => control point 2 has y == y2
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dir = dx >= 0 ? 1 : -1;

    // Control point horizontal offset: big enough to show curvature, but bounded.
    const absDx = Math.abs(dx);
    const controlDist = Math.max(20, Math.min(80, absDx * 0.5));

    const cx1 = x1 + dir * controlDist;
    const cy1 = y1; // keep start flat
    const cx2 = x2 - dir * controlDist;
    const cy2 = y2; // keep end flat

    // If points are extremely close, fall back to a straight line (avoids tiny loops).
    const isTiny = absDx < 2 && Math.abs(dy) < 2;

    this.canvas.moveTo(x1, y1);
    if (isTiny) {
      this.canvas.lineTo(x2, y2);
    } else {
      this.canvas.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
    }
    this.canvas.stroke({
      color: color,
      width: 1,
      alpha: alpha,
    });
  }
}

export default RichNetworkPreview;