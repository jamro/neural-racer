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

  async trimGenerationHistory(evolutionId, n = 10) {
    if (!evolutionId) {
      throw new Error('Evolution ID is required');
    }
    
    const db = await this._openDB();
    const tx = db.transaction(['generations'], 'readwrite');
    const store = tx.objectStore('generations');
    
    // Get all generations
    const allGenerations = await store.getAll();
    
    // Filter by evolutionId and sort by epoch (descending - highest first)
    const matchingGenerations = allGenerations
      .filter(gen => gen.evolutionId === evolutionId)
      .sort((a, b) => b.epoch - a.epoch);
    
    // Keep only the latest n generations
    const toDelete = matchingGenerations.slice(n);
    
    // Delete old generations
    await Promise.all(
      toDelete.map(gen => store.delete(gen.generationId))
    );
    
    await tx.done;
  }

  async storeGeneration(data, evolutionId) {
    if(!evolutionId) {
      throw new Error('Evolution ID is required');
    }
    const db = await this._openDB();
    const tx = db.transaction(['generations'], 'readwrite');
    await tx.objectStore('generations').put({evolutionId, ...data}, data.generationId);
    await tx.done;
  }

  async storeEvolution(data) {
    const db = await this._openDB();
    const tx = db.transaction(['evolution', 'generations'], 'readwrite');

    const evolutionData = {
      evolutionId: data.evolutionId,
      completedTracks: data.completedTracks,
      lastGenerationId: data.generation.generationId,
    };

    await Promise.all([
      tx.objectStore('evolution').put(evolutionData, this.filename),
      this.storeGeneration(data.generation, data.evolutionId),
    ]);

    await tx.done;
  }


  async loadGeneration(generationId) {
    const db = await this._openDB();
    const tx = db.transaction(['generations'], 'readonly');
    const generation = await tx.objectStore('generations').get(generationId);
    return generation;
  }

  async loadEvolution() {
    const db = await this._openDB();
    const tx = db.transaction(['evolution', 'generations'], 'readonly');
    const evolution = await tx.objectStore('evolution').get(this.filename);
    return evolution;
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
