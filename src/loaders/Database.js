import { openDB } from 'idb';

class Database {
  constructor(filename = 'current-evolution') {
    this.filename = filename;
    this.dbName = 'neural-racer-evolution';
    this.dbVersion = 2;
  }

  async _openDB() {
    return openDB(this.dbName, this.dbVersion, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('evolution')) {
          db.createObjectStore('evolution');
        }
        if (!db.objectStoreNames.contains('generations')) {
          db.createObjectStore('generations');
        }
      },
    });
  }

  async storeEvolution(data) {
    const db = await this._openDB();
    const tx = db.transaction(['evolution', 'generations'], 'readwrite');

    const evolutionData = {
      currentTrackIndex: data.currentTrackIndex,
      completedTracks: data.completedTracks,
    };

    await Promise.all([
      tx.objectStore('evolution').put(evolutionData, this.filename),
      tx.objectStore('generations').put(data.generation, this.filename),
    ]);

    await tx.done;
  }

  /**
   * Load evolution state from two object stores.
   * @returns {Object|null} Plain object with evolution state, or null if not found
   */
  async loadEvolution() {
    const db = await this._openDB();
    const tx = db.transaction(['evolution', 'generations'], 'readonly');

    const [evolution, generation] = await Promise.all([
      tx.objectStore('evolution').get(this.filename),
      tx.objectStore('generations').get(this.filename),
    ]);

    // If any required field is missing, return null
    if (evolution === undefined || generation === undefined) {
      return null;
    }

    return {
      currentTrackIndex: evolution.currentTrackIndex,
      completedTracks: evolution.completedTracks,
      epoch: evolution.epoch,
      generation
    };
  }

  /**
   * Clear stored evolution state from all object stores.
   */
  async clearEvolution() {
    const db = await this._openDB();
    const tx = db.transaction(['evolution', 'generations'], 'readwrite');

    await Promise.all([
      tx.objectStore('evolution').delete(this.filename),
      tx.objectStore('generations').delete(this.filename),
    ]);

    await tx.done;
  }
}

export default Database;
