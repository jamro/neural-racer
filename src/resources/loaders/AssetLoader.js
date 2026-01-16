import AbstractLoader from './AbstractLoader';
import { loadTextures, getTextureKeys } from '../Assets';

export default class AssetLoader extends AbstractLoader {
  constructor() {
    super();
  }

  async start(progressCallback) {
    await loadTextures(getTextureKeys(), (pct, text) => progressCallback(pct, text));
  }
}