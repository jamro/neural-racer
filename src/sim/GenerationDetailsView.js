import * as PIXI from 'pixi.js';

class GenerationDetailsView extends PIXI.Container {
  constructor() {
    super();
    this.generation = null
    this.bg = new PIXI.Graphics();
    this.bg.rect(2, 2, 198, 198);
    this.bg.fill({
      color: 0x000000,
      alpha: 0.8
    });
    this.addChild(this.bg);

    this.statusTextField = new PIXI.Text();
    this.statusTextField.style = { 
      fontFamily: 'Courier New',
      fontSize: 12, 
      lineHeight: 16,
      fill: 0xffffff 
    };
    this.statusTextField.x = 10;
    this.statusTextField.y = 10;
    this.addChild(this.statusTextField);
  }

  render() {
    if (!this.generation) return;

    const history = []
    let pointer = this.generation.parent;
    while(pointer && history.length < 7) {
      // find top score. sort in descending order.
      const scores = pointer.scores.sort((a, b) => b - a);
      const topScore = scores[0];
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      history.push({
        epoch: pointer.epoch,
        topScore: topScore,
        averageScore: averageScore
      })
      pointer = pointer.parent;
    }


    this.statusTextField.text = "Epoch: " + this.generation.epoch + "\n" +
        "Size: " + this.generation.activeCount + " / " + this.generation.totalCount + "\n\n" +
        "History:\n" + (history.map(h => h.epoch + ": " + ((100*h.topScore).toFixed(2)) + " (avg: " + ((100*h.averageScore).toFixed(2)) + ")").join("\n") || "-")
  }
  
}

export default GenerationDetailsView;