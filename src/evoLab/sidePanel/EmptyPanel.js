import * as PIXI from 'pixi.js';
import SidePanel from './SidePanel';

class EmptyPanel extends SidePanel {
  constructor() {
    super();
    this._contentBoundaries = {x: 0, y: 0, width: 300, height: 300}

    const carSymbol = new PIXI.Graphics();
    carSymbol.circle(0, 0, 50);
    carSymbol.fill(0xf50000);
    carSymbol.circle(0, 0, 35);
    carSymbol.fill(0x8d0000);
    carSymbol.x = this._contentBoundaries.width / 2;
    carSymbol.y = 190;
    this.masterContainer.addChild(carSymbol);

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
    label.text = 'to see the details'
    label.anchor.set(0.5, 0);
    label.x = this._contentBoundaries.width / 2;
    label.y = 85;
    this.masterContainer.addChild(label);

  }
}

export default EmptyPanel;