/**
 * @deprecated This file is kept for backward compatibility.
 * Use AssetLoader.js instead: import { loadCarTexture, getCarTexture, ... } from './loaders/AssetLoader';
 */

// Re-export all car texture functions from AssetLoader
export {
    loadCarTexture,
    getCarTexture,
    loadGhostTexture,
    getGhostTexture,
    loadShadowTexture,
    getShadowTexture
} from './AssetLoader';
