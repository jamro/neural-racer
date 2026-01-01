import { openDB } from 'idb';

/**
 * Database class for persisting evolution state using IndexedDB.
 * Uses two object stores:
 * - evolution: Object containing { currentTrackIndex, completedTracks, epoch }
 * - genomes: Array (serialized genomes)
 */
class Database {
  constructor(filename = 'current-evolution') {
    this.filename = filename;
    this.dbName = 'neural-racer-evolution';
    this.dbVersion = 2;
  }

  /**
   * Open or create the IndexedDB database with all object stores.
   * @returns {Promise<IDBPDatabase>} Database instance
   */
  async _openDB() {
    return openDB(this.dbName, this.dbVersion, {
      upgrade(db, oldVersion) {
        // Clean up old object stores if migrating from version 1
        if (oldVersion < 2) {
          if (db.objectStoreNames.contains('currentTrackIndex')) {
            db.deleteObjectStore('currentTrackIndex');
          }
          if (db.objectStoreNames.contains('completedTracks')) {
            db.deleteObjectStore('completedTracks');
          }
          if (db.objectStoreNames.contains('epoch')) {
            db.deleteObjectStore('epoch');
          }
        }
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('evolution')) {
          db.createObjectStore('evolution');
        }
        if (!db.objectStoreNames.contains('genomes')) {
          db.createObjectStore('genomes');
        }
      },
    });
  }

  /**
   * Store evolution state across two object stores.
   * @param {Object} data - Plain object containing evolution state:
   *   - currentTrackIndex: number
   *   - completedTracks: number[]
   *   - epoch: number
   *   - genomes: Array (serialized genomes)
   */
  async storeEvolution(data) {
    const db = await this._openDB();
    const tx = db.transaction(['evolution', 'genomes'], 'readwrite');

    const evolutionData = {
      currentTrackIndex: data.currentTrackIndex,
      completedTracks: data.completedTracks,
      epoch: data.epoch,
    };

    await Promise.all([
      tx.objectStore('evolution').put(evolutionData, this.filename),
      tx.objectStore('genomes').put(data.genomes, this.filename),
    ]);

    await tx.done;
  }

  /**
   * Load evolution state from two object stores.
   * @returns {Object|null} Plain object with evolution state, or null if not found
   */
  async loadEvolution() {
    const db = await this._openDB();
    const tx = db.transaction(['evolution', 'genomes'], 'readonly');

    const [evolution, genomes] = await Promise.all([
      tx.objectStore('evolution').get(this.filename),
      tx.objectStore('genomes').get(this.filename),
    ]);

    // If any required field is missing, return null
    if (evolution === undefined || genomes === undefined) {
      return null;
    }

    return {
      currentTrackIndex: evolution.currentTrackIndex,
      completedTracks: evolution.completedTracks,
      epoch: evolution.epoch,
      genomes,
    };
  }

  /**
   * Clear stored evolution state from all object stores.
   */
  async clearEvolution() {
    const db = await this._openDB();
    const tx = db.transaction(['evolution', 'genomes'], 'readwrite');

    await Promise.all([
      tx.objectStore('evolution').delete(this.filename),
      tx.objectStore('genomes').delete(this.filename),
    ]);

    await tx.done;
  }
}

export default Database;
