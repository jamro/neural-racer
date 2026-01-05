import * as PIXI from 'pixi.js';

const CHART_AREA_PADDING = 10;
const CURRENT_POPULATION_BAR_WIDTH = 30;
const TOP_PADDING = 10;
const BOTTOM_PADDING = 30;
const LEFT_PADDING = 40;
const RIGHT_PADDING = 10;

const SCALE_MIN_DEFAULT = 0;
const SCALE_MAX_DEFAULT = 1.3;

export default class PercentileChart extends PIXI.Container {
  constructor(width, height) {
    super();
    this.data = []
    this.currentPopulationMax = 0;
    this.currentPopulationP70 = 0;
    this.masterContainer = new PIXI.Container();
    this.addChild(this.masterContainer);
    this.masterContainer.x = LEFT_PADDING;
    this.masterContainer.y = height + CHART_AREA_PADDING + TOP_PADDING;

    this.chartColor = 0x7777ff;
    this.areaWidth = width;
    this.areaHeight = height;
    this.scaleShape = new PIXI.Graphics();

    this.vScaleMin = SCALE_MIN_DEFAULT;
    this.vScaleMax = SCALE_MAX_DEFAULT;
    this.canvas = new PIXI.Graphics();
    this.currentPopulationBar = new PIXI.Graphics();
    this.scaleOverlay = new PIXI.Graphics();

    this.top25Label = new PIXI.Text()
    this.top25Label.style = {
      fontFamily: 'Exo2',
      fontSize: 9,
      fill: 0xdedede,
    };
    this.top25Label.text = 'TOP\n25%';
    this.top25Label.anchor.set(0.5, 0);

    this.timeLabel = new PIXI.Text()
    this.timeLabel.style = {
      fontFamily: 'Exo2',
      fontSize: 9,
      fill: 0xdedede,
    };
    this.timeLabel.text = 'TIME';
    this.timeLabel.anchor.set(0.5, 0);


    this.passLabel = new PIXI.Text()
    this.passLabel.style = {
      fontFamily: 'Exo2',
      fontSize: 9,
      fill: 0xdedede,
    };
    this.passLabel.text = 'PASS\nZONE';
    this.passLabel.anchor.set(1, 0.5);
    
    this.masterContainer.addChild(this.currentPopulationBar);
    this.masterContainer.addChild(this.canvas);
    this.masterContainer.addChild(this.scaleOverlay);
    this.masterContainer.addChild(this.scaleShape);
    this.masterContainer.addChild(this.top25Label);
    this.masterContainer.addChild(this.timeLabel);
    this.masterContainer.addChild(this.passLabel);

    this.scaleView(width, height);
  }

  _drawPercentile(data, percentileIndex1, percentileIndex2, fillStyle, strokeStyle) {
    const range = this.vScaleMax - this.vScaleMin;
    const step = this.areaWidth / (data.length - 1);
    const t = (y) => - this.areaHeight * (y - this.vScaleMin) / range;
    this.canvas.moveTo(0, t(data[0][percentileIndex1]));
    for(let i = 1; i < data.length; i++) {
      this.canvas.lineTo(i * step, t(data[i][percentileIndex1]));
    }
    this.canvas.lineTo(this.areaWidth, t(data[data.length - 1][percentileIndex2]));
    for(let i = data.length - 2; i >= 0; i--) {
      this.canvas.lineTo(i * step, t(data[i][percentileIndex2]));
    }
    this.canvas.lineTo(0, t(data[0][percentileIndex1]));
    this.canvas.fill({...fillStyle});
    if(strokeStyle) {
      this.canvas.stroke({...strokeStyle});
    }
  }

  updateCurrentPopulation(p75Score, maxScore) {
    if(!p75Score || !maxScore) return;
    this.currentPopulationMax = maxScore;
    this.currentPopulationP70 = p75Score;
    const range = this.vScaleMax - this.vScaleMin;
    const t = (y) => - this.areaHeight * (Math.min(y, this.vScaleMax) - this.vScaleMin) / range;
    this.currentPopulationBar.clear();
    const rectX = this.areaWidth + CURRENT_POPULATION_BAR_WIDTH*0.25
    const rectY = t(Math.min(this.vScaleMax, maxScore))
    const rectWidth = CURRENT_POPULATION_BAR_WIDTH*0.75
    const rectHeight = -t(Math.min(this.vScaleMax, maxScore)) + t(Math.min(this.vScaleMax, p75Score))
    this.currentPopulationBar.rect(rectX, rectY, rectWidth, rectHeight);
    this.currentPopulationBar.fill({
      color: this.chartColor,
      alpha: 1,
    });
    this.currentPopulationBar.stroke({
      color: this.chartColor,
      alpha: 0.2,
      width: 2.5,
    });
    this.currentPopulationBar.rect(rectX, rectY, rectWidth, rectHeight);
    this.currentPopulationBar.stroke({
      color: this.chartColor,
      alpha: 0.2,
      width: 5,
    });
  }

  /**
   * Data format: 2D array. each sub-array contains 5 values: [min, p25, median, p75, max]
   */
  updateHistory(data) {
    this.data = data;
    this.canvas.clear();
    this.scaleOverlay.clear();
    this.currentPopulationBar.clear();
    
    this.vScaleMax = Math.max(...data.flat(), SCALE_MAX_DEFAULT);
    this.vScaleMin = SCALE_MIN_DEFAULT;
    const range = this.vScaleMax - this.vScaleMin;
  
    const t = (y) => - this.areaHeight * (y - this.vScaleMin) / range;

    // area below 100%
    this.scaleOverlay.rect(0, t(1)-1, this.areaWidth + CURRENT_POPULATION_BAR_WIDTH + 1, - t(1)+1);
    this.scaleOverlay.fill({
      color: 0x000000,
      alpha: 0.25,
    });
    const barMin = -CHART_AREA_PADDING*0.5
    const barMax = this.areaWidth + CURRENT_POPULATION_BAR_WIDTH + CHART_AREA_PADDING*0.5;
    for(let i = barMin; i < barMax; i += 10) {
      this.scaleOverlay.moveTo(i + 2, t(1));
      this.scaleOverlay.lineTo(Math.min(i + 7, barMax), t(1));
      this.scaleOverlay.stroke({
        color: 0xffffff,
        alpha: 1,
        width: 2,
      });
    }

    if(data.length < 2) return;

    this._drawPercentile(data, 0, 1, {
      color: this.chartColor,
      alpha: 0.15,
    });
    this._drawPercentile(data, 1, 2, {
      color: this.chartColor,
      alpha: 0.3,
    });
    this._drawPercentile(data, 2, 3, {
      color: this.chartColor,
      alpha: 0.45,
    });
    this._drawPercentile(data, 3, 4, {
      color: this.chartColor,
      alpha: 1,
    }, {
      color: this.chartColor,
      alpha: 0.2,
      width: 2.5,
    });
    this._drawPercentile(data, 3, 4, {
      color: this.chartColor,
      alpha: 1,
    }, {
      color: this.chartColor,
      alpha: 0.2,
      width: 5,
    });

    this.passLabel.y = - this.areaHeight * (((this.vScaleMax + 1) / 2) - this.vScaleMin) / (this.vScaleMax - this.vScaleMin);
  }

  get canvasWidth() {
    return this.areaWidth + CHART_AREA_PADDING + CURRENT_POPULATION_BAR_WIDTH + LEFT_PADDING + RIGHT_PADDING;
  }
  get canvasHeight() {
    return this.areaHeight + CHART_AREA_PADDING + TOP_PADDING + BOTTOM_PADDING;
  }
  
  scaleView(width, height) {
    this.areaWidth = width - (CHART_AREA_PADDING + CURRENT_POPULATION_BAR_WIDTH + LEFT_PADDING + RIGHT_PADDING)
    this.areaHeight = height - (CHART_AREA_PADDING + TOP_PADDING + BOTTOM_PADDING)
    
    this.scaleShape.clear();
    this.scaleShape.moveTo(0, 0);
    this.scaleShape.lineTo(this.areaWidth + CURRENT_POPULATION_BAR_WIDTH + CHART_AREA_PADDING*0.5, 0);
    this.scaleShape.moveTo(0, 0);
    this.scaleShape.lineTo(0, -this.areaHeight - CHART_AREA_PADDING*0.5);
    this.scaleShape.stroke({ 
      color: 0xffffff, 
      alpha: 0.5, 
      width: 1 
    });

    this.masterContainer.x = LEFT_PADDING;
    this.masterContainer.y = this.areaHeight + CHART_AREA_PADDING + TOP_PADDING;

    this.top25Label.x = this.areaWidth + CURRENT_POPULATION_BAR_WIDTH*(0.25+0.8/2);
    this.top25Label.y = 2;
    this.timeLabel.x = this.areaWidth/2
    this.timeLabel.y = 7;
    this.passLabel.x = -2
    this.passLabel.y = - this.areaHeight * (((this.vScaleMax + 1) / 2) - this.vScaleMin) / (this.vScaleMax - this.vScaleMin);    
    
    this.updateCurrentPopulation(this.currentPopulationP70, this.currentPopulationMax);
    this.updateHistory(this.data);
  }


}