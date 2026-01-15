import CarPreviewPanel from './CarPreviewPanel';
import StaticNetworkPreview from '../../../presentation/common/networkPreview/staticPreview/StaticNetworkPreview';
import EvoNetworkPreview from '../../../presentation/common/networkPreview/staticPreview/EvoNetworkPreview';
import * as PIXI from 'pixi.js';

function numberToLetter(n) {
  return String.fromCharCode(64 + n);
}

class ChildCarPreviewPanel extends CarPreviewPanel {
  constructor(props = {
    parents: [],
    carName: '????',
    source: 'unknown',
  }) {
    super(props);
    this.testDriveButton.visible = true;
    this.neuralTestButton.visible = true;

    this.title.text = 'CAR EVOLUTION'

    // Replace the default (single-color) preview from CarPreviewPanel with a
    // crossover-aware preview (child colored by parent provenance).
    if (this.networkPreview) {
      this.masterContainer.removeChild(this.networkPreview);
      this.networkPreview.destroy?.({ children: true });
      this.networkPreview = null;
    }

    const parent1 = props.parents?.[0]?.car ?? null;
    const parent2 = props.parents?.[1]?.car ?? null;

    const w = this._contentBoundaries.width * 0.8;
    const h = this._contentBoundaries.width * 0.35;

    if (props.car && parent1 && parent2) {
      this.networkPreview = new EvoNetworkPreview(
        w,
        h,
        props.car.neuralNet,
        props.car.genome,
        0xededed,        // childColor (new/mutated elements)
        parent1.neuralNet,
        parent1.genome,
        0xFF6600,        // parent 1
        parent2.neuralNet,
        parent2.genome,
        0x6666FF         // parent 2
      );
    } else if (props.car) {
      // Fallback when parents are not available
      this.networkPreview = new StaticNetworkPreview(
        w,
        h,
        props.car.neuralNet,
        props.car.genome,
        0xFFFFFF
      );
    }

    if (this.networkPreview) {
      this.networkPreview.x = this._contentBoundaries.width * 0.5 - this.networkPreview.canvasWidth * 0.5;
      this.networkPreview.y = 190;
      this.masterContainer.addChild(this.networkPreview);
      this.addArrow(this._contentBoundaries.width*0.5, 185);
    }

    this.addArrow(this._contentBoundaries.width*0.5, 355);
    this.addCarPreview(395, props.carName);

    // parent networks
    if(props.parents.length  === 2) {
      this.addParentNetworkPreview(props);
    } else {
      this.addLabel(
        this._contentBoundaries.width*0.5,
        100, 
        "SOURCE", 
        {
          fontSize: 10,
          fill: 0x888888,
          align: 'center',
        }
      )
      const sourceText = {
        'offspring': 'OFFSPRING',
        'elite': 'ELITE',
        'hallOfFame': 'HALL OF FAME',
        'random': 'RANDOM',
        'unknown': 'UNKNOWN',
      }
      this.addLabel(
        this._contentBoundaries.width*0.5,
        115, 
        sourceText[props.source] || 'UNKNOWN', 
        {
          fontSize: 32,
          fill: 0x888888,
          align: 'center',
        }
      )
    }
    
  }

  addParentNetworkPreview(props) {
    const colors = [0xFF6600, 0x6666FF];
    for(let i = 0; i < props.parents.length; i++) {
      const parent = props.parents[i];
      const networkPreview = new StaticNetworkPreview(
        this._contentBoundaries.width * 0.8,
        this._contentBoundaries.width * 0.5,
        parent.car.neuralNet,
        parent.car.genome,
        colors[i]
      );
      networkPreview.scale.set(0.5);
      networkPreview.x = this._contentBoundaries.width*0.5 - networkPreview.canvasWidth*(0.52 - (i % 2)*0.53);
      networkPreview.y = 65
      this.masterContainer.addChild(networkPreview);

      this.addLabel(
        networkPreview.x + networkPreview.canvasWidth*0.5*networkPreview.scale.x, 
        145, 
        "PARENT " + numberToLetter(i+1), 
        {
          fontSize: 10,
          fill: 0x888888,
        }
      );

      this.addLabel(
        this._contentBoundaries.width*0.5,
        305, 
        "EVOLVED NEURAL NETWORK\n(CHILD)", 
        {
          fontSize: 10,
          fill: 0x888888,
          align: 'center',
        }
      );

    }

  }

}

export default ChildCarPreviewPanel;