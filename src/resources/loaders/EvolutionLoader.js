import AbstractLoader from './AbstractLoader';

export default class EvolutionLoader extends AbstractLoader {
  constructor({ app, tracks = [], config, beforeInitialize } = {}) {
    super();
    this.app = app;
    this.tracks = tracks;
    this.config = config;
    this.beforeInitialize = beforeInitialize;
    this.evolution = null;
  }

  async start(progressCallback) {
    const report = typeof progressCallback === 'function' ? progressCallback : () => {};

    report(0, 'Loading evolution module');
    const mod = await import('../../engine/evolution/Evolution');
    const Evolution = mod?.default;
    if (!Evolution) {
      throw new Error('Evolution module does not have a default export');
    }

    report(35, 'Creating evolution');
    this.evolution = new Evolution(this.app, this.tracks);

    report(70, 'Initializing evolution');
    if (typeof this.beforeInitialize === 'function') {
      this.beforeInitialize();
    }
    await this.evolution.initialize(this.config);

    report(100, 'Evolution initialized');
  }
}

