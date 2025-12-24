import * as PIXI from 'pixi.js';

class CarView extends PIXI.Container {
    constructor(w, h, radarAngularRange) {
        super();
        this.body = new PIXI.Graphics();

        this.radarAngularRange = radarAngularRange;

        // wheels
        this.body.rect(5, -2, 10, 29);
        this.body.rect(35, -2, 10, 29);
        this.body.fill(0x000000);

        // body
        this.body.rect(0, 0, 50, 25);
        this.body.fill(0xaa0000);

        // headlights
        this.body.circle(47, 21, 2);
        this.body.circle(47, 4, 2);
        this.body.fill(0xffff00);

        // windshield
        this.body.rect(22, 2, 10, 21);
        this.body.rect(7, 4, 5, 17);
        this.body.fill(0xddddff);

        this.body.x = -25;
        this.body.y = -12.5;

        this.body.scale.set(w / 50, h / 25);
        this.body.x = -25 * (w / 50);
        this.body.y = -12.5 * (h / 25);

        this.addChild(this.body);

        this.radar = new PIXI.Graphics();
        this.radar.scale.set(w / 50, h / 25);
        this.radar.moveTo(0, 0);
        this.addChild(this.radar);

        this.crash = new PIXI.Graphics();
        this.crash.moveTo(-15, -15);
        this.crash.lineTo(15, 15);
        this.crash.stroke({ color: 0xff0000, width: 5 });
        this.crash.moveTo(-15, 15);
        this.crash.lineTo(15, -15);
        this.crash.stroke({ color: 0xff0000, width: 5 });
        this.addChild(this.crash);
        this.crash.visible = false;

        this._isActive = false;
        this.active = false;
    }

    setCrashed(isCrashed) {
        if (isCrashed) {
            this.crash.visible = true;
            this.radar.visible = false;
            this.body.visible = false;
        } else {
            this.crash.visible = false;
            this.body.visible = true;
        }
    }

    set active(isActive) {
        this.radar.visible = isActive && !this.crash.visible;
        this._isActive = isActive;
    }

    get active() {
      return this._isActive;
    }

    renderRadar(beamsLengths) {
        if (!this.radar.visible) return;
        this.radar.clear();
        const angleStep = this.radarAngularRange / (beamsLengths.length - 1);
        for (let index = 0; index < beamsLengths.length; index++) {
          const length = beamsLengths[index];
          const angle = this.radarAngularRange / 2 - angleStep * index;
          this.radar.moveTo(0, 0);
          this.radar.lineTo(
            length * Math.cos(angle), 
            length * Math.sin(angle)
          );
          this.radar.stroke({ color: 0xffffff, width: 3, alpha: 0.3 });
        }
    }
}

export default CarView;