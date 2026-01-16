import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { getUiFrameHorizontalLineTexture, getUiTrackIconTexture } from '../../resources/Assets';
import TextButton from '../common/TextButton';
import AutoPlayButton from './AutoPlayButton';

class BottomBar extends Container {
  constructor() {
    super();

    this.background = new Graphics();
    this.addChild(this.background);

    this.edge = new Sprite(getUiFrameHorizontalLineTexture());
    this.addChild(this.edge);

    this.trackIcon = new Sprite(getUiTrackIconTexture());
    this.addChild(this.trackIcon);
    
    this.trackIcon.anchor.set(0.5, 0.5);
    this.trackIcon.scale.set(0.55);

    this.trackLabel = new Text();
    this.trackLabel.style = {
      fontFamily: 'Exo2',
      fontSize: 16,
      fill: 0xffffff,
    };
    this.trackLabel.text = 'Track: ???';
    this.trackLabel.anchor.set(0, 0.5);
    this.addChild(this.trackLabel);

    this.populationLabel = new Text();
    this.populationLabel.style = {
      fontFamily: 'Exo2',
      fontSize: 12,
      fill: 0x888888,
    };
    this.populationLabel.text = 'Population Size: ???';
    this.populationLabel.anchor.set(0, 0.5);
    this.addChild(this.populationLabel);

    this.statsLabel = new Text();
    this.statsLabel.style = {
      fontFamily: 'Exo2',
      fontSize: 12,
      lineHeight: 16,
      fill: 0x888888,
    };
    this.statsLabel.text = 'Crashes: ?\nCompleted: ?\nAverage Speed: ?';
    this.statsLabel.anchor.set(0, 0.5);
    this.addChild(this.statsLabel);

    this._trackName = null;
    this._populationSize = null;

    this.trackName = '???';
    this.populationSize = 0;

    this.evolveButton = new TextButton("Evolve Next Generation", 20, false, true);
    this.evolveButton.visible = false;
    this.evolveButton.scale.set(1.2);
    this.addChild(this.evolveButton);

    this.raceButton = new TextButton("Start Single Race");
    this.raceButton.visible = false;
    this.raceButton.scale.set(1.2);
    this.addChild(this.raceButton);

    this.autoPlayButton = new AutoPlayButton("Auto Play");
    this.autoPlayButton.visible = false;
    this.autoPlayButton.scale.set(1.2);
    this.addChild(this.autoPlayButton);
  }

  set trackName(name) {
    this._trackName = name;
    this.trackLabel.text = 'Track: ' + name;
  }

  set populationSize(size) {
    this._populationSize = size;
    this.populationLabel.text = 'Population Size: ' + size + ' cars';
  }

  get trackName() {
    return this._trackName;
  }

  get populationSize() {
    return this._populationSize;
  }

  setStats(crashes, completed, averageSpeed) {
    this.statsLabel.text = 'Crashes: ' + crashes + ' cars\nCompleted: ' + completed + ' cars\nAverage Speed: ' + Math.round(averageSpeed*3.6) + ' km/h';
  }

  scaleView(width, height) {

    this.background.clear();
    this.background.rect(0, 0, width, height);
    this.background.fill({ color: 0x000000, alpha: 0.8 });

    const lineColors = [0x5c0000, 0x000000, 0x787eac];
    for(let i=0; i < lineColors.length; i++) {
      this.background.moveTo(300 + i - 1, 5);
      this.background.lineTo(300 + i - 1, height-5);
      this.background.stroke({
        color: lineColors[i],
        width: 1,
      });
    }

    this.edge.x = 0;
    this.edge.y = -this.edge.height;
    this.edge.width = width;

    this.autoPlayButton.x = width - this.autoPlayButton.buttonWidth - 50;
    this.autoPlayButton.y = height/2 - this.autoPlayButton.buttonHeight/2;

    this.raceButton.x = this.autoPlayButton.x - this.raceButton.buttonWidth - 50;
    this.raceButton.y = height/2 - this.raceButton.buttonHeight/2;

    this.evolveButton.x = width - this.evolveButton.buttonWidth - 60;
    this.evolveButton.y = height/2 - this.evolveButton.buttonHeight/2;

    this.trackIcon.x = 40;
    this.trackIcon.y = height/2-5

    this.trackLabel.x = 80;
    this.trackLabel.y = height/2 - 8

    this.populationLabel.x = 80;
    this.populationLabel.y = height/2 + 12;

    this.statsLabel.x = 320;
    this.statsLabel.y = height/2-2;
    this.statsLabel.visible = width > 800;
  }

}

export default BottomBar;
