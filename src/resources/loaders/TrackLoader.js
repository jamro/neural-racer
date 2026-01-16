import AbstractLoader from './AbstractLoader';
import SvgTrackLoader from './track/SvgTrackLoader';

/**
 * Handles loading track SVGs with optional progress reporting.
 */
class TrackLoader extends AbstractLoader {
  constructor() {
    super();
    this.loadedTracks = [];
  }

  get defaultTracks() {
    return [
      { url: 'assets/tracks/lesson_001.svg' },
      { url: 'assets/tracks/lesson_002.svg' },
      { url: 'assets/tracks/lesson_003.svg' },
      { url: 'assets/tracks/lesson_004.svg' },
      { url: 'assets/tracks/lesson_005.svg' },
      { url: 'assets/tracks/lesson_006.svg' },
    ];
  }

  async start(onProgress = (pct, text) => {}) {
    this.loadedTracks = await this.loadTracks(this.defaultTracks, onProgress);
  }

  /**
   * Load all tracks, reporting progress through the provided callback.
   * @param {Array<{url: string}>} tracks
   * @param {(pct: number, text: string) => void} onProgress
   * @returns {Promise<Array>}
   */
  async loadTracks(tracks = this.defaultTracks, onProgress = () => {}) {
    const report = (pct, text) => {
      try {
        onProgress(Math.max(0, Math.min(100, Math.round(pct))), text);
      } catch {
        // ignore progress callback errors
      }
    };

    const total = tracks.length;
    if (total === 0) {
      this.loadedTracks = [];
      report(100, 'No tracks to load');
      return this.loadedTracks;
    }

    const loadedTracks = [];
    let completed = 0;

    report(0, `Loading tracks (0/${total})`);
    for (const { url } of tracks) {
      const track = await SvgTrackLoader.load(url);
      loadedTracks.push(track);

      completed += 1;
      report((completed / total) * 100, `Loaded track (${completed}/${total})`);
    }

    this.loadedTracks = loadedTracks;
    report(100, `Tracks loaded (${total}/${total})`);
    return this.loadedTracks;
  }
}

export default TrackLoader;
