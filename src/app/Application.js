import Config from '../Config';
import Preloader from '../resources/preloader/Preloader';

class Application {
  constructor({ documentRef = document, windowRef = window, preloader } = {}) {
    this.document = documentRef;
    this.window = windowRef;

    this.config = new Config();

    this.preloader = preloader || new Preloader(this.document, { windowRef: this.window });
    [
      { moduleName: 'FontLoader', start: 0, end: 25, initialStatus: 'Loading fonts', doneStatus: 'Fonts loaded' },
      {
        moduleName: 'PixiLoader',
        start: 25,
        end: 40,
        initialStatus: 'Initializing renderer. It may take a moment...',
        doneStatus: 'Renderer initialized',
        createInstance: ({ Exported, preloader }) =>
          new Exported({
            windowRef: preloader.window,
            maxFPS: this.config.frameRate || 30,
            onAppReady: app => this.mountCanvas(app),
          }),
      },
      { moduleName: 'AssetLoader', start: 40, end: 85, initialStatus: 'Loading textures', doneStatus: 'Core assets loaded' },
      { moduleName: 'TrackLoader', start: 85, end: 95, initialStatus: 'Loading tracks', doneStatus: 'Tracks loaded' },
      {
        moduleName: 'EvolutionLoader',
        start: 95,
        end: 100,
        initialStatus: 'Initializing evolution',
        doneStatus: 'Evolution initialized',
        createInstance: ({ Exported, preloader }) =>
          new Exported({
            app: preloader.pixiLoader?.app,
            tracks: preloader.trackLoader?.loadedTracks || [],
            config: this.config,
            beforeInitialize: () => {
              this.config.setStandardMode();
            },
          }),
      },
    ].forEach(step => this.preloader.addLoader(step));

    this.app = null;
    this.evolution = null;
    this.resizeHandler = null;
  }

  async start() {
    try {
      await this.preloader.load();

      this.app = this.preloader.pixiLoader?.app;
      this.evolution = this.preloader.evolutionLoader?.evolution;
      if (!this.app) throw new Error('Renderer not initialized');
      if (!this.evolution) throw new Error('Evolution not initialized');

      this.bindResize();

      this.preloader.setProgress(100, 'Ready');
      this.preloader.hide();

      await this.evolution.runInLoop();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.preloader.show();
      this.preloader.setProgress(100, 'Load failed — check console for details');
      throw error;
    }
  }

  destroy() {
    if (this.evolution) {
      this.evolution.stopSimulation();
      this.evolution = null;
    }

    if (this.resizeHandler) {
      this.window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    if (this.app) {
      this.app.destroy(true, {
        children: true,
        texture: true,
        baseTexture: true,
        context: true,
      });
      this.app = null;
    }

    this.preloader.hide({ remove: true });
  }

  mountCanvas(app = this.app) {
    const appContainer = this.document.getElementById('app');
    if (!appContainer) {
      throw new Error('App container element #app not found');
    }

    if (!app?.canvas) {
      throw new Error('Renderer canvas not available');
    }

    if (appContainer.firstChild === app.canvas) {
      return;
    }

    if (appContainer.firstChild) {
      appContainer.replaceChild(app.canvas, appContainer.firstChild);
    } else {
      appContainer.appendChild(app.canvas);
    }
  }

  bindResize() {
    this.resizeHandler = () => {
      if (!this.app || !this.app.resize) return;
      const width = this.window.innerWidth;
      const height = this.window.innerHeight;
      this.app.resize(width, height);
      if (this.evolution) {
        this.evolution.scaleView(width, height);
      }
    };

    this.window.addEventListener('resize', this.resizeHandler);
  }
}

export default Application;
