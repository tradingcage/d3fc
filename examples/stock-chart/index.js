const data = fc.randomFinancial()(100);

// Red: BF6A27
const red = [0.7490196078431373, 0.41568627450980394, 0.15294117647058825];
// Green: 80C83D
const green = [0.5019607843137255, 0.7843137254901961, 0.23921568627450981];

function paddedAccessors() {
  return [d => d.high + (d.high - d.low) / 3, d => d.low - (d.high - d.low) / 3];
}

const xScale = d3.scaleTime().domain(fc.extentDate().accessors([d => d.date])(data));
const yScale = d3.scaleLinear().domain(fc.extentLinear().accessors(paddedAccessors())(data));

const candlestick = fc.autoBandwidth(fc.seriesWebglCandlestick());
const gridline = fc.annotationCanvasGridline();
const lowLine = fc.seriesSvgLine().crossValue(d => d.date).mainValue(d => d.low);

const zoom = fc
  .zoom()
  .scaleExtent([.2, 5])
  .on('zoom', () => {
    const visibleData = data.filter(d => xScale(d.date) >= 0 && xScale(d.date) <= d3.select('#ohlc-chart').node().clientWidth);
    const newDomain = fc.extentLinear().accessors(paddedAccessors())(visibleData);
    yScale.domain(newDomain);
    render();
  });

const volumeValues = data.map(d => d.volume);
const maxVolume = Math.max(...volumeValues);
const minVolume = Math.min(...volumeValues);
const volumeScale = d3.scaleLinear().domain([minVolume / 1.3, maxVolume]);

const volume = fc.autoBandwidth(fc.seriesWebglBar())
  .crossValue(d => d.date)
  .mainValue(d => d.volume)
  .decorate((program, data) => {
    fc.webglFillColor()
      .value(d => {
        if (d.close >= d.open) {
          return [...green, 0.8];
        } else {
          return [...red, 0.8];
        }
      })
      .data(data)(program)
    })

const ohlcChart = fc
  .chartCartesian(xScale, yScale)
  .webglPlotArea(candlestick)
  .canvasPlotArea(gridline)
  .svgPlotArea(lowLine)
  .decorate(sel => {
    sel.enter()
      .selectAll('.plot-area')
      .call(zoom, xScale, yScale);
    sel.enter()
      .selectAll('.x-axis')
      .call(zoom, xScale);
  });

const volumeChart = fc
  .chartCartesian(xScale, volumeScale)
  .webglPlotArea(volume)
  .decorate(sel => {
    sel.enter()
      .selectAll('.plot-area')
      .call(zoom, xScale, volumeScale);
    sel.enter()
      .selectAll('.x-axis')
      .call(zoom, xScale);
  });


function render() {
  d3.select('#ohlc-chart')
    .datum(data)
    .call(ohlcChart);

  d3.select('#volume-chart')
    .datum(data)
    .call(volumeChart);
}

render();
