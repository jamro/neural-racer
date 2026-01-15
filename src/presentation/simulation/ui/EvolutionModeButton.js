import TextButton from '../../common/TextButton';
import { 
  getUiEvoAutoTexture,
  getUiEvoManualTexture,
} from '../../../loaders/AssetLoader';
import * as PIXI from 'pixi.js';


class EvolutionModeButton extends TextButton {

  constructor() {
    super('Manual', 30, true);
    
    this.on('change', () => {
      this.refreshEvolutionAppearance();
    });

    this.autoIcon = new PIXI.Sprite(getUiEvoAutoTexture());
    this.autoIcon.anchor.set(0.5, 0.5);
    this.autoIcon.scale.set(0.2)
    this.autoIcon.y = this.buttonHeight / 2;
    this.autoIcon.x = 12
    this.addChild(this.autoIcon);
    this.autoIcon.visible = false;


    this.manualIcon = new PIXI.Sprite(getUiEvoManualTexture());
    this.manualIcon.anchor.set(0.5, 0.5);
    this.manualIcon.scale.set(0.2)
    this.manualIcon.y = this.buttonHeight / 2;
    this.manualIcon.x = 12
    this.manualIcon.alpha = 0.7
    this.addChild(this.manualIcon);
    this.manualIcon.visible = true;

    this.evoButtonReady = true
    this.refreshEvolutionAppearance();
  }

  get autoMode() {
    return this.value;
  }

  set autoMode(autoMode) {
    this.value = autoMode;
    this.refreshEvolutionAppearance();
  }

  refreshEvolutionAppearance() {
    if(!this.evoButtonReady) return;
    if(this.autoMode) {
      this.label.text = 'Auto Play';
      this.autoIcon.visible = true;
      this.manualIcon.visible = false;
    } else {
      this.label.text = 'Manual';
      this.autoIcon.visible = false;
      this.manualIcon.visible = true;
    }
  }

}

export default EvolutionModeButton;