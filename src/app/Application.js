import { Application as PixiApplication, Ticker } from 'pixi.js';
import Evolution from '../engine/evolution/Evolution';
import Config from '../Config';
import Preloader from '../loaders/Preloader';
import TrackLoader from '../loaders/TrackLoader';

class Application {
  constructor({ documentRef = document, windowRef = window } = {}) {
    this.document = documentRef;
    this.window = windowRef;

    this.preloader = new Preloader(this.document);
    this.trackLoader = new TrackLoader({ preloader: this.preloader });
    this.config = new Config();

    this.app = null;
    this.evolution = null;
    this.resizeHandler = null;
  }

  async start() {
    try {
      this.preloader.show();
      await this.preloader.load();

      await this.initializeRenderer();
      const tracks = await this.trackLoader.loadTracks();

      await this.initializeEvolution(tracks);

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

  async initializeRenderer() {
    this.preloader.setProgress(86, 'Initializing renderer');

    this.app = new PixiApplication();
    await this.app.init({
      resizeTo: this.window,
      backgroundColor: 0xa19a41,
      antialias: true,
      resolution: this.window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.mountCanvas();
  }

  async initializeEvolution(tracks) {
    this.preloader.setProgress(96, 'Initializing evolution');

    Ticker.shared.maxFPS = this.config.frameRate || 30;
    this.config.setStandardMode();

    this.evolution = new Evolution(this.app, tracks);
    await this.evolution.initialize(this.config);

    this.bindResize();
  }

  mountCanvas() {
    const appContainer = this.document.getElementById('app');
    if (!appContainer) {
      throw new Error('App container element #app not found');
    }

    if (appContainer.firstChild) {
      appContainer.replaceChild(this.app.canvas, appContainer.firstChild);
    } else {
      appContainer.appendChild(this.app.canvas);
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
