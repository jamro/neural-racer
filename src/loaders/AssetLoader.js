import * as PIXI from 'pixi.js';

/**
 * Unified texture registry configuration.
 * All texture assets are defined here with their asset URLs.
 * Textures are automatically loaded and cached by PIXI.Assets.
 */
const TEXTURE_REGISTRY = {
    // Car textures
    car: 'assets/img/car_small.png',
    ghost: 'assets/img/ghost_small.png',
    shadow: 'assets/img/shadow_small.png',
    tire_mark: 'assets/img/tire_mark.png',
    
    // Track textures
    grass: 'assets/img/grass.png',
    dust: 'assets/img/dust.png',
    trackBg001: 'assets/img/track_bg_001.png',
    trackBg002: 'assets/img/track_bg_002.png',
    trackBg003: 'assets/img/track_bg_003.png',
    trackBg004: 'assets/img/track_bg_004.png',
    trackBg005: 'assets/img/track_bg_005.png',
    
    // Tires textures
    tires001: 'assets/img/tires001.png',
    tires002: 'assets/img/tires002.png',
    tires003: 'assets/img/tires003.png',
    tires004: 'assets/img/tires004.png',
    tires005: 'assets/img/tires005.png',
    tires006: 'assets/img/tires006.png',
    tires007: 'assets/img/tires007.png',
    tires008: 'assets/img/tires008.png',
    tires009: 'assets/img/tires009.png',
    tires010: 'assets/img/tires010.png',
    tires011: 'assets/img/tires011.png',
    tires012: 'assets/img/tires012.png',
    tires013: 'assets/img/tires013.png',
    tires014: 'assets/img/tires014.png',
    tires015: 'assets/img/tires015.png',
    tires016: 'assets/img/tires016.png',
    
    // Bush textures
    bush001: 'assets/img/bush001.png',
    bush002: 'assets/img/bush002.png',
    bush003: 'assets/img/bush003.png',
    bush004: 'assets/img/bush004.png',
    bush005: 'assets/img/bush005.png',
    bush006: 'assets/img/bush006.png',
    bush007: 'assets/img/bush007.png',
    bush008: 'assets/img/bush008.png',
    bush009: 'assets/img/bush009.png',

    // ruin
    ruin001: 'assets/img/ruin001.png',
    ruin002: 'assets/img/ruin002.png',
    ruin003: 'assets/img/ruin003.png',
    ruin004: 'assets/img/ruin004.png',
    ruin005: 'assets/img/ruin005.png',
    
    // Edge textures
    edge001: 'assets/img/edge001.png',
    edge002: 'assets/img/edge002.png',
    edge003: 'assets/img/edge003.png',
    edge004: 'assets/img/edge004.png',
    edge005: 'assets/img/edge005.png',
    edge006: 'assets/img/edge006.png',
    edge007: 'assets/img/edge007.png',
    edge008: 'assets/img/edge008.png',
    edge009: 'assets/img/edge009.png',
    edge010: 'assets/img/edge010.png',
    edge011: 'assets/img/edge011.png',
    edge012: 'assets/img/edge012.png',
    edge013: 'assets/img/edge013.png',
    edge014: 'assets/img/edge014.png',
    edge015: 'assets/img/edge015.png',
    edge016: 'assets/img/edge016.png',
    edge017: 'assets/img/edge017.png',
    edge018: 'assets/img/edge018.png',
    edge019: 'assets/img/edge019.png',
    edge020: 'assets/img/edge020.png',
    edge021: 'assets/img/edge021.png',
    edge022: 'assets/img/edge022.png',

    crates_001: 'assets/img/crates_001.png',
    crates_002: 'assets/img/crates_002.png',
    crates_003: 'assets/img/crates_003.png',
    crates_004: 'assets/img/crates_004.png',
    crates_005: 'assets/img/crates_005.png',
    crates_006: 'assets/img/crates_006.png',
    crates_007: 'assets/img/crates_007.png',
    crates_008: 'assets/img/crates_008.png',

    // Finishline textures
    finishline001: 'assets/img/finishline001.png',
};

// Promise cache to prevent duplicate concurrent loads
const texturePromises = {};

/**
 * Generic function to load a texture by key.
 * Returns a promise that resolves to the texture.
 * The texture is cached internally by PIXI.Assets.load().
 * @param {string} textureKey - The key from TEXTURE_REGISTRY
 * @returns {Promise<PIXI.Texture>}
 */
export async function loadTexture(textureKey) {
    const url = TEXTURE_REGISTRY[textureKey];
    if (!url) {
        throw new Error(`Texture key "${textureKey}" not found in registry`);
    }
    
    if (!texturePromises[textureKey]) {
        texturePromises[textureKey] = PIXI.Assets.load(url);
    }
    return await texturePromises[textureKey];
}

/**
 * Generic function to get a texture by key if it's already loaded, otherwise returns null.
 * Use this if you need synchronous access (texture must be preloaded).
 * @param {string} textureKey - The key from TEXTURE_REGISTRY
 * @returns {PIXI.Texture|null}
 */
export function getTexture(textureKey) {
    const url = TEXTURE_REGISTRY[textureKey];
    if (!url) {
        return null;
    }
    return PIXI.Assets.get(url) || null;
}

/**
 * Load multiple textures by their keys.
 * @param {string[]} textureKeys - Array of texture keys from TEXTURE_REGISTRY
 * @returns {Promise<Object<string, PIXI.Texture>>} - Object mapping keys to textures
 */
export async function loadTextures(textureKeys) {
    const promises = textureKeys.map(key => 
        loadTexture(key).then(texture => ({ key, texture }))
    );
    const results = await Promise.all(promises);
    return results.reduce((acc, { key, texture }) => {
        acc[key] = texture;
        return acc;
    }, {});
}

/**
 * Get all available texture keys from the registry.
 * @returns {string[]}
 */
export function getTextureKeys() {
    return Object.keys(TEXTURE_REGISTRY);
}

// Car textures exports
export async function loadCarTexture() { return await loadTexture('car'); }
export function getCarTexture() { return getTexture('car'); }
export async function loadGhostTexture() { return await loadTexture('ghost'); }
export function getGhostTexture() { return getTexture('ghost'); }
export async function loadShadowTexture() { return await loadTexture('shadow'); }
export function getShadowTexture() { return getTexture('shadow'); }
export async function loadTireMarkTexture() { return await loadTexture('tire_mark'); }
export function getTireMarkTexture() { return getTexture('tire_mark'); }

// Grass texture exports
export async function loadGrassTexture() { return await loadTexture('grass'); }
export function getGrassTexture() { return getTexture('grass'); }

// Dust texture exports
export async function loadDustTexture() { return await loadTexture('dust'); }
export function getDustTexture() { return getTexture('dust'); }

// Track background texture exports
export async function loadTrackBg001Texture() { return await loadTexture('trackBg001'); }
export function getTrackBg001Texture() { return getTexture('trackBg001'); }
export async function loadTrackBg002Texture() { return await loadTexture('trackBg002'); }
export function getTrackBg002Texture() { return getTexture('trackBg002'); }
export async function loadTrackBg003Texture() { return await loadTexture('trackBg003'); }
export function getTrackBg003Texture() { return getTexture('trackBg003'); }
export async function loadTrackBg004Texture() { return await loadTexture('trackBg004'); }
export function getTrackBg004Texture() { return getTexture('trackBg004'); }
export async function loadTrackBg005Texture() { return await loadTexture('trackBg005'); }
export function getTrackBg005Texture() { return getTexture('trackBg005'); }

// Tires texture exports
export async function loadTires001Texture() { return await loadTexture('tires001'); }
export function getTires001Texture() { return getTexture('tires001'); }
export async function loadTires002Texture() { return await loadTexture('tires002'); }
export function getTires002Texture() { return getTexture('tires002'); }
export async function loadTires003Texture() { return await loadTexture('tires003'); }
export function getTires003Texture() { return getTexture('tires003'); }
export async function loadTires004Texture() { return await loadTexture('tires004'); }
export function getTires004Texture() { return getTexture('tires004'); }
export async function loadTires005Texture() { return await loadTexture('tires005'); }
export function getTires005Texture() { return getTexture('tires005'); }
export async function loadTires006Texture() { return await loadTexture('tires006'); }
export function getTires006Texture() { return getTexture('tires006'); }
export async function loadTires007Texture() { return await loadTexture('tires007'); }
export function getTires007Texture() { return getTexture('tires007'); }
export async function loadTires008Texture() { return await loadTexture('tires008'); }
export function getTires008Texture() { return getTexture('tires008'); }
export async function loadTires009Texture() { return await loadTexture('tires009'); }
export function getTires009Texture() { return getTexture('tires009'); }
export async function loadTires010Texture() { return await loadTexture('tires010'); }
export function getTires010Texture() { return getTexture('tires010'); }
export async function loadTires011Texture() { return await loadTexture('tires011'); }
export function getTires011Texture() { return getTexture('tires011'); }
export async function loadTires012Texture() { return await loadTexture('tires012'); }
export function getTires012Texture() { return getTexture('tires012'); }
export async function loadTires013Texture() { return await loadTexture('tires013'); }
export function getTires013Texture() { return getTexture('tires013'); }
export async function loadTires014Texture() { return await loadTexture('tires014'); }
export function getTires014Texture() { return getTexture('tires014'); }
export async function loadTires015Texture() { return await loadTexture('tires015'); }
export function getTires015Texture() { return getTexture('tires015'); }
export async function loadTires016Texture() { return await loadTexture('tires016'); }
export function getTires016Texture() { return getTexture('tires016'); }

// Bush texture exports
export async function loadBush001Texture() { return await loadTexture('bush001'); }
export function getBush001Texture() { return getTexture('bush001'); }
export async function loadBush002Texture() { return await loadTexture('bush002'); }
export function getBush002Texture() { return getTexture('bush002'); }
export async function loadBush003Texture() { return await loadTexture('bush003'); }
export function getBush003Texture() { return getTexture('bush003'); }
export async function loadBush004Texture() { return await loadTexture('bush004'); }
export function getBush004Texture() { return getTexture('bush004'); }
export async function loadBush005Texture() { return await loadTexture('bush005'); }
export function getBush005Texture() { return getTexture('bush005'); }
export async function loadBush006Texture() { return await loadTexture('bush006'); }
export function getBush006Texture() { return getTexture('bush006'); }
export async function loadBush007Texture() { return await loadTexture('bush007'); }
export function getBush007Texture() { return getTexture('bush007'); }
export async function loadBush008Texture() { return await loadTexture('bush008'); }
export function getBush008Texture() { return getTexture('bush008'); }
export async function loadBush009Texture() { return await loadTexture('bush009'); }
export function getBush009Texture() { return getTexture('bush009'); }

// Edge texture exports
export async function loadEdge001Texture() { return await loadTexture('edge001'); }
export function getEdge001Texture() { return getTexture('edge001'); }
export async function loadEdge002Texture() { return await loadTexture('edge002'); }
export function getEdge002Texture() { return getTexture('edge002'); }
export async function loadEdge003Texture() { return await loadTexture('edge003'); }
export function getEdge003Texture() { return getTexture('edge003'); }
export async function loadEdge004Texture() { return await loadTexture('edge004'); }
export function getEdge004Texture() { return getTexture('edge004'); }
export async function loadEdge005Texture() { return await loadTexture('edge005'); }
export function getEdge005Texture() { return getTexture('edge005'); }
export async function loadEdge006Texture() { return await loadTexture('edge006'); }
export function getEdge006Texture() { return getTexture('edge006'); }
export async function loadEdge007Texture() { return await loadTexture('edge007'); }
export function getEdge007Texture() { return getTexture('edge007'); }
export async function loadEdge008Texture() { return await loadTexture('edge008'); }
export function getEdge008Texture() { return getTexture('edge008'); }
export async function loadEdge009Texture() { return await loadTexture('edge009'); }
export function getEdge009Texture() { return getTexture('edge009'); }
export async function loadEdge010Texture() { return await loadTexture('edge010'); }
export function getEdge010Texture() { return getTexture('edge010'); }
export async function loadEdge011Texture() { return await loadTexture('edge011'); }
export function getEdge011Texture() { return getTexture('edge011'); }
export async function loadEdge012Texture() { return await loadTexture('edge012'); }
export function getEdge012Texture() { return getTexture('edge012'); }
export async function loadEdge013Texture() { return await loadTexture('edge013'); }
export function getEdge013Texture() { return getTexture('edge013'); }
export async function loadEdge014Texture() { return await loadTexture('edge014'); }
export function getEdge014Texture() { return getTexture('edge014'); }
export async function loadEdge015Texture() { return await loadTexture('edge015'); }
export function getEdge015Texture() { return getTexture('edge015'); }
export async function loadEdge016Texture() { return await loadTexture('edge016'); }
export function getEdge016Texture() { return getTexture('edge016'); }
export async function loadEdge017Texture() { return await loadTexture('edge017'); }
export function getEdge017Texture() { return getTexture('edge017'); }
export async function loadEdge018Texture() { return await loadTexture('edge018'); }
export function getEdge018Texture() { return getTexture('edge018'); }
export async function loadEdge019Texture() { return await loadTexture('edge019'); }
export function getEdge019Texture() { return getTexture('edge019'); }
export async function loadEdge020Texture() { return await loadTexture('edge020'); }
export function getEdge020Texture() { return getTexture('edge020'); }
export async function loadEdge021Texture() { return await loadTexture('edge021'); }
export function getEdge021Texture() { return getTexture('edge021'); }
export async function loadEdge022Texture() { return await loadTexture('edge022'); }
export function getEdge022Texture() { return getTexture('edge022'); }

// Ruin texture exports
export async function loadRuin001Texture() { return await loadTexture('ruin001'); }
export function getRuin001Texture() { return getTexture('ruin001'); }
export async function loadRuin002Texture() { return await loadTexture('ruin002'); }
export function getRuin002Texture() { return getTexture('ruin002'); }
export async function loadRuin003Texture() { return await loadTexture('ruin003'); }
export function getRuin003Texture() { return getTexture('ruin003'); }
export async function loadRuin004Texture() { return await loadTexture('ruin004'); }
export function getRuin004Texture() { return getTexture('ruin004'); }
export async function loadRuin005Texture() { return await loadTexture('ruin005'); }
export function getRuin005Texture() { return getTexture('ruin005'); }

// Finishline texture exports
export async function loadFinishline001Texture() { return await loadTexture('finishline001'); }
export function getFinishline001Texture() { return getTexture('finishline001'); }

// Crates texture exports
export async function loadCrate001Texture() { return await loadTexture('crates001'); }
export function getCrate001Texture() { return getTexture('crates001'); }
export async function loadCrate002Texture() { return await loadTexture('crates002'); }
export function getCrate002Texture() { return getTexture('crates002'); }
export async function loadCrate003Texture() { return await loadTexture('crates003'); }
export function getCrate003Texture() { return getTexture('crates003'); }
export async function loadCrate004Texture() { return await loadTexture('crates004'); }
export function getCrate004Texture() { return getTexture('crates004'); }
