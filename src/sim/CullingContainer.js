import * as PIXI from 'pixi.js';


const DEBUG_CULLING = false;

class CullingContainer extends PIXI.Container {
    constructor() {
        super();
        this.renderRect = new PIXI.Rectangle(0, 0, 0, 0);

        if(DEBUG_CULLING) {
          this.debugRect = new PIXI.Graphics();
          this.addChild(this.debugRect);
          this.debugTextField = new PIXI.Text();
          this.addChild(this.debugTextField);
          this.debugTextField.style = {
            fontFamily: 'Arial',
            fontSize: 12,
            fill: 0xffffff,
            stroke: 0x0000ff,
            strokeThickness: 3
          }
          this.debugTextField.text = 'DEBUG HERE';
        }
    }

    renderArea(x, y, width, height) {
      this.renderRect.x = x;
      this.renderRect.y = y;
      this.renderRect.width = width;
      this.renderRect.height = height;

      if(DEBUG_CULLING) {
        this.debugRect.clear();
      }

      let allObjectsCount = 0;
      let visibleObjectsCount = 0;
      for(let i = 0; i < this.children.length; i++) {
        allObjectsCount++;
        const child = this.children[i];
        if(DEBUG_CULLING && (child == this.debugRect || child == this.debugTextField)) continue
        
        if(!child.boundsRect && child.constructor.name == 'Graphics') {
          child.boundsRect = new PIXI.Rectangle(0, 0, 0, 0);
          child.boundsRect.x = child.x + child.bounds.minX
          child.boundsRect.y = child.y + child.bounds.minY
          child.boundsRect.width = child.bounds.maxX - child.bounds.minX
          child.boundsRect.height = child.bounds.maxY - child.bounds.minY
        } else if(!child.boundsRect && child.constructor.name == 'Sprite') {
          child.boundsRect = new PIXI.Rectangle(0, 0, 0, 0);
          
          // Calculate bounding rect for rotated sprite
          if (child.rotation !== 0) {
            const w = child.width;
            const h = child.height;
            const pivotX = child.pivot?.x || 0;
            const pivotY = child.pivot?.y || 0;
            const rotation = child.rotation;
            const cos = Math.cos(rotation);
            const sin = Math.sin(rotation);
            
            // Get the four corners relative to pivot
            const corners = [
              { x: -pivotX, y: -pivotY },
              { x: w - pivotX, y: -pivotY },
              { x: -pivotX, y: h - pivotY },
              { x: w - pivotX, y: h - pivotY }
            ];
            
            // Rotate each corner
            const rotatedCorners = corners.map(corner => ({
              x: corner.x * cos - corner.y * sin,
              y: corner.x * sin + corner.y * cos
            }));
            
            // Find min/max x and y
            const xs = rotatedCorners.map(c => c.x);
            const ys = rotatedCorners.map(c => c.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            
            // Set bounds rect (add object position)
            child.boundsRect.x = child.x + minX;
            child.boundsRect.y = child.y + minY;
            child.boundsRect.width = maxX - minX;
            child.boundsRect.height = maxY - minY;
          } else {
            // No rotation, use simple bounds
            child.boundsRect.x = child.x;
            child.boundsRect.y = child.y;
            child.boundsRect.width = child.width;
            child.boundsRect.height = child.height;
          }
        }

        if(!child.boundsRect) {
          console.warn('No bounds rect for child. Object will not be culled.');
          continue;
        }

        const isIntersecting = child.boundsRect.intersects(this.renderRect);
        child.visible = isIntersecting;
        child.renderable = isIntersecting;
        if(isIntersecting) visibleObjectsCount++;
        if(DEBUG_CULLING) {
          this.debugRect.rect(child.boundsRect.x, child.boundsRect.y, child.boundsRect.width, child.boundsRect.height);
          this.debugRect.stroke({ color: 0xffffff, width: 1 });
        }
      }

      if(DEBUG_CULLING) {
        this.debugRect.rect(this.renderRect.x, this.renderRect.y, this.renderRect.width, this.renderRect.height);
        this.debugRect.stroke({ color: 0x0000ff, width: 20, alpha: 0.5 });

        this.debugTextField.x = this.renderRect.x + this.renderRect.width - this.debugTextField.width -10;
        this.debugTextField.y = this.renderRect.y + this.renderRect.height - this.debugTextField.height - 10;
        this.debugTextField.text = `Objects rendered: ${visibleObjectsCount} / ${allObjectsCount}`;

        this.setChildIndex(this.debugRect, this.children.length - 1);
        this.setChildIndex(this.debugTextField, this.children.length - 1);
      }
    }
}

export default CullingContainer;