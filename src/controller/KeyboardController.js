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
            
            // Handle state change: key pressed
            if (event.key === 'ArrowUp') {
                this.car.throttle(1);
            } else if (event.key === 'ArrowDown') {
                this.car.breakCar(1);
            } else if (event.key === 'ArrowLeft') {
                // If right is also pressed, cancel turn
                if (this.keys.ArrowRight) {
                    this.car.turn(0);
                } else {
                    this.car.turn(-1);
                }
            } else if (event.key === 'ArrowRight') {
                // If left is also pressed, cancel turn
                if (this.keys.ArrowLeft) {
                    this.car.turn(0);
                } else {
                    this.car.turn(1);
                }
            }
        }
    }

    handleKeyUp(event) {
        if (event.key in this.keys && this.keys[event.key]) {
            this.keys[event.key] = false;
            
            // Handle state change: key released
            if (event.key === 'ArrowUp') {
                this.car.throttle(0);
            } else if (event.key === 'ArrowDown') {
                this.car.breakCar(0);
            } else if (event.key === 'ArrowLeft') {
                // If right is still pressed, turn right
                if (this.keys.ArrowRight) {
                    this.car.turn(1);
                } else {
                    this.car.turn(0);
                }
            } else if (event.key === 'ArrowRight') {
                // If left is still pressed, turn left
                if (this.keys.ArrowLeft) {
                    this.car.turn(-1);
                } else {
                    this.car.turn(0);
                }
            }
        }
    }

    destroy() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
    }
}

export default KeyboardController;

