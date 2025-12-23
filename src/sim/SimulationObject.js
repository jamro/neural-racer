
const PIXELS_PER_METER_SCALE = 50 / 4;  // 50 pixels is 4 meters5


/**
 * Base class for all simulation objects.
 * All objects added to the simulation must implement update() and render() methods.
 */
class SimulationObject {
    constructor() {
        // Validate that required methods are implemented
        if (this.constructor === SimulationObject) {
            throw new Error('SimulationObject is an abstract class and cannot be instantiated directly');
        }
    }

    /**
     * Update the simulation state of this object.
     * Called at the simulation rate (typically faster than render rate).
     * @param {number} delta - Time elapsed since last update in seconds
     */
    update(delta) {
        throw new Error('update() method must be implemented by subclass');
    }

    /**
     * Render/update the visual representation of this object.
     * Called at the render rate (typically display refresh rate).
     * @param {number} delta - Time elapsed since last render in seconds
     */
    render(delta) {
        throw new Error('render() method must be implemented by subclass');
    }

    pixelsToMeters(pixels) {
        return pixels / PIXELS_PER_METER_SCALE;
    }

    metersToPixels(meters) {
        return meters * PIXELS_PER_METER_SCALE;
    }
}

export default SimulationObject;

