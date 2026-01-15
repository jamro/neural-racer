import SvgTrackLoader from './SvgTrackLoader';

/**
 * Handles loading track SVGs with optional progress reporting.
 */
class TrackLoader {
  constructor({ preloader, progressRange = { start: 90, end: 96 } } = {}) {
    this.preloader = preloader;
    this.progressRange = progressRange;
    this.progressReporter = null;
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

  /**
   * Load all tracks, reporting progress through the provided preloader.
   * @param {Array<{url: string}>} tracks
   * @returns {Promise<Array>}
   */
  async loadTracks(tracks = this.defaultTracks) {
    const total = tracks.length;
    if (total === 0) return [];

    this.progressReporter = this.preloader?.createTrackReporter
      ? this.preloader.createTrackReporter(total, this.progressRange)
      : null;

    const loadedTracks = [];
    let completed = 0;

    for (const { url } of tracks) {
      const track = await SvgTrackLoader.load(url);
      loadedTracks.push(track);

      completed += 1;
      this.reportProgress(completed);
    }

    return loadedTracks;
  }

  reportProgress(completed) {
    if (this.progressReporter) this.progressReporter(completed);
  }
}

export default TrackLoader;
