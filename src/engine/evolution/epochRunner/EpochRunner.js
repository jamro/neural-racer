

const CONFIG_MODE_COOLDOWN = 11;
const CONFIG_MODE_STANDARD = 'standard';
const CONFIG_MODE_FINETUNING = 'finetuning';
const CONFIG_MODE_EXPLORATION = 'exploration';


export default class EpochRunner {
  
  constructor(evolution, allTracks) {
    this.evolution = evolution;
    this.allTracks = allTracks;

    this._configModeCooldown = 0;
    this._currentConfigMode = CONFIG_MODE_STANDARD;
    this._requestedConfigMode = CONFIG_MODE_STANDARD;
  }

  requestStandardConfigMode() {
    this._requestedConfigMode = CONFIG_MODE_STANDARD;
  }
  requestFinetuningConfigMode() {
    this._requestedConfigMode = CONFIG_MODE_FINETUNING;
  }
  requestExplorationConfigMode() {
    this._requestedConfigMode = CONFIG_MODE_EXPLORATION;
  }

  get isStandardConfigMode() {
    return this._currentConfigMode === CONFIG_MODE_STANDARD;
  }
  get isFinetuningConfigMode() {
    return this._currentConfigMode === CONFIG_MODE_FINETUNING;
  }
  get isExplorationConfigMode() {
    return this._currentConfigMode === CONFIG_MODE_EXPLORATION;
  }

  applyConfigMode() {
    this._configModeCooldown--;
    if(this._configModeCooldown <= 0 && this._requestedConfigMode !== this._currentConfigMode) {
      this._configModeCooldown = CONFIG_MODE_COOLDOWN;
      this._currentConfigMode = this._requestedConfigMode;
    }
    switch(this._currentConfigMode) {
      case CONFIG_MODE_STANDARD:
        this.evolution.config.setStandardMode();
        break;
      case CONFIG_MODE_FINETUNING:
        this.evolution.config.setFinetuningMode();
        break;
      case CONFIG_MODE_EXPLORATION:
        this.evolution.config.setExplorationMode();
        break;
      default:
        this.evolution.config.setStandardMode();
        break;
    }
  }

  async run() {
    throw new Error('Not implemented! must return generation');
  }

  serialize() {
    throw new Error('Not implemented! must return serialized data');
  }

  deserialize() {
    throw new Error('Not implemented! must deserialize data');
  }

  stop() {

  }

  scaleView() {

  }
}