import PreloaderView from './PreloaderView';

const LOADER_IMPORTERS = {
  FontLoader: () => import('../loaders/FontLoader'),
  AssetLoader: () => import('../loaders/AssetLoader'),
  TrackLoader: () => import('../loaders/TrackLoader'),
  PixiLoader: () => import('../loaders/PixiLoader'),
  EvolutionLoader: () => import('../loaders/EvolutionLoader'),
};

const clampPct = pct => Math.max(0, Math.min(100, pct));
const lowerFirst = str => (str ? str.charAt(0).toLowerCase() + str.slice(1) : str);

class Preloader {
  constructor(doc, { windowRef = window } = {}) {
    this.doc = doc;
    this.window = windowRef;
    this.view = new PreloaderView(doc);
    this.loaders = [];
  }

  show() {
    this.view.show();
  }

  hide({ remove = true } = {}) {
    this.view.hide({ remove });
  }

  setProgress(progressPercent, statusText = '') {
    this.view.setProgress(progressPercent, statusText);
  }

  /**
   * Returns a mapper that projects a local 0-100 range into the given start/end
   * and applies it to the preloader progress with the provided status text.
   * Ensures consistent progress handling across asset types.
   */
  createRangeReporter(start, end, initialStatus = '') {
    this.setProgress(start, initialStatus);
    const span = end - start;
    return (localPercent, statusText = '') => {
      const p = clampPct(localPercent);
      this.setProgress(start + (p / 100) * span, statusText);
    };
  }

  addLoader(
    moduleNameOrConfig,
    start,
    end,
    initialStatus = '',
    options = {}
  ) {
    const config =
      moduleNameOrConfig && typeof moduleNameOrConfig === 'object'
        ? moduleNameOrConfig
        : { moduleName: moduleNameOrConfig, start, end, initialStatus, ...options };

    const {
      moduleName,
      doneStatus,
      exportName = 'default',
      name,
      createInstance,
    } = config;

    const importer = LOADER_IMPORTERS[moduleName];
    if (!importer) {
      throw new Error(`Unknown loader module "${moduleName}"`);
    }

    const entry = {
      moduleName,
      importer,
      exportName,
      instance: null,
      start: config.start,
      end: config.end,
      initialStatus: config.initialStatus || '',
      doneStatus: doneStatus || '',
      name: name || lowerFirst(moduleName),
      createInstance,
    };

    this.loaders.push(entry);
  }

  async ensureLoaderInstance(entry) {
    if (entry.instance) return entry.instance;

    const mod = await entry.importer();
    const Exported = mod?.[entry.exportName];
    if (!Exported) {
      throw new Error(`Loader "${entry.moduleName}" does not export "${entry.exportName}"`);
    }

    entry.instance = entry.createInstance
      ? await entry.createInstance({ Exported, preloader: this })
      : new Exported();

    if (entry.name) this[entry.name] = entry.instance;
    return entry.instance;
  }

  async load() {
    this.show();
    this.setProgress(0, 'Starting');

    for (const entry of this.loaders) {
      const { start, end, initialStatus, doneStatus } = entry;
      const report = this.createRangeReporter(start, end, initialStatus);

      const instance = await this.ensureLoaderInstance(entry);
      await instance.start(report);
      if (doneStatus) {
        this.setProgress(end, doneStatus);
      }
    }
  }
}

export default Preloader;