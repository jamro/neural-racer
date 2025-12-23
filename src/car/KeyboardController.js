class KeyboardController {
    constructor(car) {
        this.car = car;
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    handleKeyDown(event) {
        if (event.key in this.keys && !this.keys[event.key]) {
            this.keys[event.key] = true;
            this.updateCarControls();
        }
    }

    handleKeyUp(event) {
        if (event.key in this.keys) {
            this.keys[event.key] = false;
            this.updateCarControls();
        }
    }

    updateCarControls() {
        // Handle throttle (up arrow)
        if (this.keys.ArrowUp) {
            this.car.throttle(0.5);
        } else {
            this.car.throttle(0);
        }



        // Handle turning (left/right arrows)
        if (this.keys.ArrowLeft && this.keys.ArrowRight) {
            // Both pressed - no turn
            this.car.turn(0);
        } else if (this.keys.ArrowLeft) {
            this.car.turn(-1);
        } else if (this.keys.ArrowRight) {
            this.car.turn(1);
        } else {
            this.car.turn(0);
        }
    }

    destroy() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
    }
}

export default KeyboardController;

