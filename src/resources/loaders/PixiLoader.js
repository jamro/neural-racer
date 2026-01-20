import AbstractLoader from './AbstractLoader';
import { Application as PixiApplication, Ticker } from 'pixi.js';

export default class PixiLoader extends AbstractLoader {
  constructor({ windowRef = window, pixiOptions = {}, onAppReady, maxFPS } = {}) {
    super();
    this.app = null;
    this.window = windowRef;
    this.pixiOptions = pixiOptions;
    this.onAppReady = onAppReady;
    this.maxFPS = maxFPS;
  }

  async start(progressCallback) {
    const report = typeof progressCallback === 'function' ? progressCallback : () => {};
    report(0, 'Creating Pixi application');
    if (Number.isFinite(this.maxFPS) && this.maxFPS > 0) {
      Ticker.shared.maxFPS = this.maxFPS;
    }
    this.app = new PixiApplication();
    progressCallback(10, 'Initializing Pixi application');
    await this.app.init({
      resizeTo: this.window,
      backgroundColor: 0x000000,
      antialias: true,
      resolution: this.window.devicePixelRatio || 1,
      autoDensity: true,
      ...this.pixiOptions,
    });
    report(95, 'Pixi application initialized');
    if (typeof this.onAppReady === 'function') {
      await this.onAppReady(this.app);
    }
    report(100, 'Renderer initialized');
  }
}