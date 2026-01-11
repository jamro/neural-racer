import * as PIXI from 'pixi.js';
import SidePanel from './SidePanel';

class EmptyPanel extends SidePanel {
  constructor({showEvolveMessage = true}) {
    super();
    this._contentBoundaries = {x: 0, y: 0, width: 300, height: showEvolveMessage ? 340 : 300}

    const glowRadius = 80;
    const carGlow = new PIXI.Graphics();
    // Layered circles to emulate a sharper radial gradient (no blur, full alpha).
    carGlow.circle(0, 0, glowRadius);
    carGlow.fill({ color: 0x000000, alpha: 1 });
    carGlow.circle(0, 0, glowRadius * 0.7);
    carGlow.fill({ color: 0x3a0000, alpha: 1 });
    carGlow.circle(0, 0, glowRadius * 0.45);
    carGlow.fill({ color: 0x8d0000, alpha: 1 });
    carGlow.circle(0, 0, glowRadius * 0.25);
    carGlow.fill({ color: 0xf50000, alpha: 1 });
    carGlow.x = this._contentBoundaries.width / 2;
    carGlow.y = 250;
    carGlow.scale.set(1, 0.1);
    carGlow.filters = [new PIXI.BlurFilter({ strength: 6, resolution: 10 })];

    const carSymbol = new PIXI.Graphics();
    carSymbol.circle(0, 0, 50);
    carSymbol.fill(0xf50000);
    carSymbol.circle(0, 0, 35);
    carSymbol.fill(0x8d0000);
    carSymbol.x = this._contentBoundaries.width / 2;
    carSymbol.y = 190;
    this.masterContainer.addChild(carGlow, carSymbol);

    const arrow = new PIXI.Graphics();
    arrow.moveTo(0, 0);
    arrow.lineTo(20, -10);
    arrow.lineTo(-20, -10);
    arrow.lineTo(0, 0);
    arrow.fill(0x888888);
    arrow.scale.set(0.75, 0.75);
    arrow.x = this._contentBoundaries.width / 2;
    arrow.y = 130;
    this.masterContainer.addChild(arrow);

    let label = new PIXI.Text()
    label.style = {
      fontFamily: 'Exo2',
      fontSize: 22,
      fill: 0xffffff,
      align: 'center',
    }
    label.text = 'Click on a'
    label.anchor.set(0.5, 0);
    label.x = this._contentBoundaries.width / 2;
    label.y = 20;
    this.masterContainer.addChild(label);

    label = new PIXI.Text()
    label.style = {
      fontFamily: 'Exo2',
      fontSize: 28,
      fill: 0xffffff,
      align: 'center',
      fontWeight: 700,
    }
    label.text = 'car symbol'
    label.anchor.set(0.5, 0);
    label.x = this._contentBoundaries.width / 2;
    label.y = 45;
    this.masterContainer.addChild(label);

    label = new PIXI.Text()
    label.style = {
      fontFamily: 'Exo2',
      fontSize: 18,
      fill: 0xffffff,
      align: 'center',
    }
    label.text = 'to see the details,'
    label.anchor.set(0.5, 0);
    label.x = this._contentBoundaries.width / 2;
    label.y = 85;
    this.masterContainer.addChild(label);

    if (showEvolveMessage) {
      // Split the final hint so "Evolve" stays white while the rest is muted.
      const evolveLine = new PIXI.Container();
      const lineStyle = {
        fontFamily: 'Exo2',
        fontSize: 14,
        fill: 0x888888,
        align: 'center',
      };

      const evolvePrefix = new PIXI.Text();
      evolvePrefix.text = '...or '
      evolvePrefix.style = lineStyle
      evolvePrefix.x = 0;
      evolveLine.addChild(evolvePrefix);

      const evolveWord = new PIXI.Text();
      evolveWord.text = 'Evolve'
      evolveWord.style = {
        ...lineStyle,
        fill: 0xffffff,
        fontWeight: 700,
      }
      evolveWord.x = evolvePrefix.width;
      evolveLine.addChild(evolveWord);

      const evolveSuffix = new PIXI.Text();
      evolveSuffix.text = ' button to'
      evolveSuffix.style = lineStyle
      evolveSuffix.x = evolvePrefix.width + evolveWord.width;
      evolveLine.addChild(evolveSuffix);

      evolveLine.x = this._contentBoundaries.width / 2 - evolveLine.width / 2;
      evolveLine.y = 280;
      this.masterContainer.addChild(evolveLine);

      label = new PIXI.Text();
      label.text = 'improve driving skills.'
      label.style = {
        ...lineStyle,
        lineHeight: 22,
      }
      label.anchor.set(0.5, 0);
      label.x = this._contentBoundaries.width / 2;
      label.y = 280 + 22;
      this.masterContainer.addChild(label);
    }

  }
}

export default EmptyPanel;