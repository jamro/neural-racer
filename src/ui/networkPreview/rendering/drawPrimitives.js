import {
  NODE_RADIUS,
  INPUT_STROKE_ALPHA,
  OUTPUT_T_HORIZONTAL_SCALE,
  OUTPUT_T_VERTICAL_SCALE,
  OUTPUT_T_SCALE_ALPHA
} from '../NetworkPreviewConstants.js';

export function drawRoundedRectTop(canvas, x, y, w, h, r, color, alpha) {
  canvas.moveTo(x + r, y);
  canvas.arc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  canvas.lineTo(x + w, y + h);
  canvas.lineTo(x, y + h);
  canvas.lineTo(x, y + r);
  canvas.arc(x + r, y + r, r, Math.PI, 0, false);
  canvas.fill({ color, alpha });
}

export function drawRoundedRectBottom(canvas, x, y, w, h, r, color, alpha) {
  canvas.moveTo(x, y);
  canvas.lineTo(x + w, y);
  canvas.lineTo(x + w, y + h - r);
  canvas.arc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  canvas.lineTo(x + r, y + h);
  canvas.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  canvas.fill({ color, alpha });
}

export function drawInputNode(canvas, pos, node, groups, nodeColor, fillAlpha, strokeColor) {
  const rectSize = NODE_RADIUS * 2;

  let nodeIndex = 0;
  let isInGroup = false;
  let positionInGroup = -1;
  let groupSize = 1;

  for (let g = 0; g < groups.length; g++) {
    if (node >= nodeIndex && node < nodeIndex + groups[g]) {
      isInGroup = groups[g] > 1;
      positionInGroup = node - nodeIndex;
      groupSize = groups[g];
      break;
    }
    nodeIndex += groups[g];
  }

  const x = pos.x - rectSize / 2;
  const y = pos.y - rectSize / 2;
  const isTopInGroup = isInGroup && positionInGroup === 0;
  const isBottomInGroup = isInGroup && positionInGroup === groupSize - 1;

  if (isTopInGroup) {
    drawRoundedRectTop(canvas, x, y, rectSize, rectSize, NODE_RADIUS, nodeColor, fillAlpha);
  } else if (isBottomInGroup) {
    drawRoundedRectBottom(canvas, x, y, rectSize, rectSize, NODE_RADIUS, nodeColor, fillAlpha);
  } else if (isInGroup) {
    canvas.rect(x, y, rectSize, rectSize);
    canvas.fill({ color: nodeColor, alpha: fillAlpha });
  } else {
    canvas.circle(pos.x, pos.y, NODE_RADIUS);
    canvas.fill({ color: nodeColor, alpha: fillAlpha });
    canvas.circle(pos.x, pos.y, NODE_RADIUS);
    canvas.stroke({ color: strokeColor, width: 1, alpha: INPUT_STROKE_ALPHA });
  }
}

export function drawOutputNode(canvas, pos, outputSignal, nodeColor, fillAlpha, strokeColor, strokeWidth, strokeAlpha) {
  canvas.circle(pos.x, pos.y, NODE_RADIUS);
  canvas.fill({ color: nodeColor, alpha: fillAlpha });
  canvas.circle(pos.x, pos.y, NODE_RADIUS);
  canvas.stroke({ color: strokeColor, width: strokeWidth, alpha: strokeAlpha });

  const startX = pos.x + NODE_RADIUS;
  const endX = startX + OUTPUT_T_HORIZONTAL_SCALE;
  const centerY = pos.y;
  const topY = centerY - OUTPUT_T_VERTICAL_SCALE / 2;
  const bottomY = centerY + OUTPUT_T_VERTICAL_SCALE / 2;

  canvas.moveTo(startX, centerY);
  canvas.lineTo(endX, centerY);
  canvas.moveTo(endX, topY);
  canvas.lineTo(endX, bottomY);
  canvas.stroke({ color: 0xFFFFFF, width: 1, alpha: OUTPUT_T_SCALE_ALPHA });

  if (outputSignal !== undefined) {
    const clampedValue = Math.max(-1, Math.min(1, outputSignal));
    const progressY = centerY - (clampedValue * OUTPUT_T_VERTICAL_SCALE / 2);
    canvas.moveTo(endX, centerY);
    canvas.lineTo(endX, progressY);
    canvas.stroke({ color: nodeColor, width: 2, alpha: 0.8 });
  }
}


