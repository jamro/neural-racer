import * as PIXI from 'pixi.js';

// Static texture cache - load once, reuse for all car instances
let carTexturePromise = null;
let carTexture = null;

/**
 * Loads the car texture. Returns a promise that resolves to the texture.
 * The texture is cached after first load.
 * @returns {Promise<PIXI.Texture>}
 */
export async function loadCarTexture() {
    if (carTexture) {
        return carTexture;
    }
    if (!carTexturePromise) {
        carTexturePromise = PIXI.Assets.load('assets/img/car_small.png');
        carTexture = await carTexturePromise;
    } else {
        carTexture = await carTexturePromise;
    }
    return carTexture;
}

/**
 * Gets the car texture if it's already loaded, otherwise returns null.
 * Use this if you need synchronous access (texture must be preloaded).
 * @returns {PIXI.Texture|null}
 */
export function getCarTexture() {
    return carTexture || null;
}

// Static texture cache for ghost - load once, reuse for all car instances
let ghostTexturePromise = null;
let ghostTexture = null;

/**
 * Loads the ghost texture. Returns a promise that resolves to the texture.
 * The texture is cached after first load.
 * @returns {Promise<PIXI.Texture>}
 */
export async function loadGhostTexture() {
    if (ghostTexture) {
        return ghostTexture;
    }
    if (!ghostTexturePromise) {
        ghostTexturePromise = PIXI.Assets.load('assets/img/ghost_small.png');
        ghostTexture = await ghostTexturePromise;
    } else {
        ghostTexture = await ghostTexturePromise;
    }
    return ghostTexture;
}

/**
 * Gets the ghost texture if it's already loaded, otherwise returns null.
 * Use this if you need synchronous access (texture must be preloaded).
 * @returns {PIXI.Texture|null}
 */
export function getGhostTexture() {
    return ghostTexture || null;
}

// Static texture cache for shadow - load once, reuse for all car instances
let shadowTexturePromise = null;
let shadowTexture = null;

/**
 * Loads the shadow texture. Returns a promise that resolves to the texture.
 * The texture is cached after first load.
 * @returns {Promise<PIXI.Texture>}
 */
export async function loadShadowTexture() {
    if (shadowTexture) {
        return shadowTexture;
    }
    if (!shadowTexturePromise) {
        shadowTexturePromise = PIXI.Assets.load('assets/img/shadow_small.png');
        shadowTexture = await shadowTexturePromise;
    } else {
        shadowTexture = await shadowTexturePromise;
    }
    return shadowTexture;
}

/**
 * Gets the shadow texture if it's already loaded, otherwise returns null.
 * Use this if you need synchronous access (texture must be preloaded).
 * @returns {PIXI.Texture|null}
 */
export function getShadowTexture() {
    return shadowTexture || null;
}

