// User config (will be properly parameterized in the future)

const options = {
  colors: {
    bull: [0.26666666666666666, 0.592156862745098, 0.5098039215686274],
    bear: [0.8549019607843137, 0.27450980392156865, 0.2901960784313726]
  },
  scaleExtent: [.2, 5],
};

const data = fc.randomFinancial()(100);

const chartContainer = "chart-container";

// Library code

// First we manually create the HTML elements we will need

const container = document.getElementById(chartContainer);
container.style.display = "flex";
container.style.flexDirection = "column";

const ohlcChartElem = document.createElement("div");
ohlcChartElem.id = "ohlc-chart";
ohlcChartElem.style.flex = 4;
container.appendChild(ohlcChartElem);

const volumeChartElem = document.createElement("div");
volumeChartElem.id = "volume-chart";
volumeChartElem.style.flex = 1;
container.appendChild(volumeChartElem);

const infoBoxElem = document.createElement("div");
infoBoxElem.id = "info-box";
infoBoxElem.style.position = "absolute";
infoBoxElem.style.padding = "0.7em";
infoBoxElem.style.backgroundColor = "#eee";
infoBoxElem.style.userSelect = "none";
infoBoxElem.style.width = "20em";
infoBoxElem.style.fontSize = "14px";
container.appendChild(infoBoxElem);

const ohlcBoxElem = document.createElement("div");

const ohlcvElements = {
  open: document.createElement("span"),
  high: document.createElement("span"),
  low: document.createElement("span"),
  close: document.createElement("span"),
  volume: document.createElement("span"),
};

const openLabel = document.createElement("span");
openLabel.innerHTML = "O: ";
const highLabel = document.createElement("span");
highLabel.innerHTML = " H: ";
const lowLabel = document.createElement("span");
lowLabel.innerHTML = " L: ";
const closeLabel = document.createElement("span");
closeLabel.innerHTML = " C: ";

ohlcvElements.open.style.fontWeight = "bold";
ohlcvElements.high.style.fontWeight = "bold";
ohlcvElements.low.style.fontWeight = "bold";
ohlcvElements.close.style.fontWeight = "bold";
ohlcvElements.volume.style.fontWeight = "bold";

ohlcBoxElem.appendChild(openLabel);
ohlcBoxElem.appendChild(ohlcvElements.open);
ohlcBoxElem.appendChild(highLabel);
ohlcBoxElem.appendChild(ohlcvElements.high);
ohlcBoxElem.appendChild(lowLabel);
ohlcBoxElem.appendChild(ohlcvElements.low);
ohlcBoxElem.appendChild(closeLabel);
ohlcBoxElem.appendChild(ohlcvElements.close);
infoBoxElem.appendChild(ohlcBoxElem);

const volumeBoxElem = document.createElement("div")
volumeBoxElem.style.width = "fit-content";
volumeBoxElem.style.cursor = "pointer";
volumeBoxElem.style.marginTop = "0.2em";

const volumeLabel = document.createElement("span");
volumeLabel.innerHTML = "Volume: ";

volumeBoxElem.appendChild(volumeLabel);
volumeBoxElem.appendChild(ohlcvElements.volume);
infoBoxElem.appendChild(volumeBoxElem);

// Define stateful objects and their member functions

const state = {
  currentBar: null,
  volumeVisible: true,
};

function toggleVolumeVisible() {
  state.volumeVisible = !state.volumeVisible;
  if (!state.volumeVisible) {
    volumeBoxElem.style.opacity = 0.5;
  } else {
    volumeBoxElem.style.opacity = 1;
  }
  render();
}

volumeBoxElem.addEventListener("click", toggleVolumeVisible);

function updateCurrentPrices(bar) {
  state.currentBar = bar;
  ohlcvElements.open.innerHTML = round2(bar.open);
  ohlcvElements.high.innerHTML = round2(bar.high);
  ohlcvElements.low.innerHTML = round2(bar.low);
  ohlcvElements.close.innerHTML = round2(bar.close);
  ohlcvElements.volume.innerHTML = round2(bar.volume);
}

updateCurrentPrices(data[data.length - 1]);

const mousePos = { x: -1, y: -1 }

// Quick helper function

function round2(num) {
  return Math.round(num * 100) / 100;
}

// Now for some style helper functions

const setFillColor = (opacity) => {
  return (program, data) => {
    fc.webglFillColor()
      .value(d => {
        if (d.close >= d.open) {
          return [...options.colors.bull, opacity];
        } else {
          return [...options.colors.bear, opacity];
        }
      })
      .data(data)(program)
  };
};

// Here is some hacky CSS to make the OHLC and Volume chart stick so closely to each other
function specialgrid(sel) {
  return sel.each(function () {
    const self = d3.select(this);
    self.style('display', 'grid');
    self.style('display', '-ms-grid');
    self.style('grid-template-columns', 'minmax(0em,max-content) 0fr 1fr 0fr minmax(0em,max-content)');
    self.style('-ms-grid-columns', 'minmax(0em,max-content) 0fr 1fr 0fr minmax(0em,max-content)');
    self.style('grid-template-rows', 'minmax(0em,max-content) 0fr 1fr 0fr minmax(0em,max-content)');
    self.style('-ms-grid-rows', 'minmax(0em,max-content) 0fr 1fr 0fr minmax(0em,max-content)');
  });
}

function flatgrid(sel) {
  return sel.each(function () {
    const self = d3.select(this);
    self.style('grid-template-rows', 'minmax(0em, max-content) 0fr 0fr 0fr minmax(0em, max-content)');
    self.style('-ms-grid-rows', 'minmax(0em, 0em) 0fr 0fr 0fr minmax(0em, 0em)');
  });
}

function attr(k, v) {
  return function (sel) {
    return sel.each(function () {
      const self = d3.select(this);
      self.style(k, v);
    });
  };
}

const displayNone = attr('display', 'none');

// Set up the zooming and scaling

function paddedAccessors() {
  return [d => d.high + (d.high - d.low) / 3, d => d.low - (d.high - d.low) / 3];
}

const xScale = d3.scaleTime().domain(fc.extentDate().accessors([d => d.date])(data));
const yScale = d3.scaleLinear().domain(fc.extentLinear().accessors(paddedAccessors())(data));

const zoom = fc
  .zoom()
  .duration(0)
  .scaleExtent([.2, 5])
  .on('zoom', e => {
    mousePos.x = e.sourceEvent.layerX;
    mousePos.y = e.sourceEvent.layerY;
    const visibleData = data.filter(d => xScale(d.date) >= 0 && xScale(d.date) <= d3.select('#ohlc-chart').node().clientWidth);
    const newDomain = fc.extentLinear().accessors(paddedAccessors())(visibleData);
    yScale.domain(newDomain);
    render();
  });

// Define the base charts

const candlestick = fc.autoBandwidth(fc.seriesWebglCandlestick())
  .decorate(setFillColor(1))
const lowLine = fc.seriesSvgLine();

const volumeValues = data.map(d => d.volume);
const maxVolume = Math.max(...volumeValues);
const minVolume = Math.min(...volumeValues);
const volumeScale = d3.scaleLinear().domain([minVolume / 1.3, maxVolume]);

const volume = fc.autoBandwidth(fc.seriesWebglBar())
  .crossValue(d => d.date)
  .mainValue(d => d.volume)
  .decorate(setFillColor(0.8))

const ohlcChart = fc
  .chartCartesian(xScale, yScale)
  .webglPlotArea(candlestick)
  .svgPlotArea(lowLine)
  .decorate(sel => {
    sel.enter().call(specialgrid);
    sel.enter()
      .select('.svg-plot-area')
      .call(attr('border-bottom', '1px solid rgba(0, 0, 0, 0.1)'));
    sel.enter()
      .selectAll('.plot-area')
      .call(zoom, xScale, yScale)
    sel.enter()
      .selectAll('.x-axis')
      .call(displayNone, zoom, xScale);
    sel.enter()
      .selectAll('.top-label')
      .call(displayNone);
    sel.enter()
      .selectAll('svg')
      .call(attr("font-size", "14px"));
  });

const volumeChart = fc
  .chartCartesian(xScale, volumeScale)
  .webglPlotArea(volume)
  .svgPlotArea(lowLine)
  .decorate(sel => {
    sel.enter().call(specialgrid);
    sel.enter()
      .selectAll('.plot-area')
      .call(zoom, xScale, yScale)
    sel.enter()
      .selectAll('.x-axis')
      .call(zoom, xScale);
    sel.enter()
      .selectAll('.top-label')
      .call(displayNone);
    sel.enter()
      .selectAll('.right-axis svg')
      .call(displayNone);
    sel.enter()
      .selectAll('svg')
      .call(attr("font-size", "14px"));
  });

// The next chunk of code deals with getting the crosshair to work exactly the way I want

function annotationLine(sel) {
  sel.enter()
    .selectAll('g.annotation-line > line')
    .each(function () {
      const self = d3.select(this);
      self.style('stroke-opacity', '.8');
      self.style('stroke-dasharray', '4');
    });
}

const crosshair = fc.annotationSvgCrosshair()
  .xScale(xScale)
  .yScale(yScale)
  .xLabel(_ => "")
  .yLabel(_ => "")
  .decorate(sel => {
    sel.call(annotationLine);
  });

const crosshairVertical = fc.annotationSvgCrosshair()
  .xScale(xScale)
  .yScale(yScale)
  .xLabel(_ => "")
  .yLabel(_ => "")
  .decorate(sel => {
    sel.select('.horizontal').style('visibility', 'hidden');
    sel.select('.point').style('visibility', 'hidden');
    sel.call(annotationLine);
  });

let shiftKeyPressed = false;

document.addEventListener('keydown', (e) => {
  if (e.key === 'Shift') {
    shiftKeyPressed = true;
    updateCrosshair();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') {
    shiftKeyPressed = false;
    updateCrosshair();
  }
});

function snapMouseToOHLC(nearest) {
  const openY = yScale(nearest.open);
  const highY = yScale(nearest.high);
  const lowY = yScale(nearest.low);
  const closeY = yScale(nearest.close);

  const ohlcValues = [openY, highY, lowY, closeY];

  // Find the nearest OHLC value to the current mouse Y position
  const nearestValue = ohlcValues.reduce((prev, curr) => {
    return (Math.abs(curr - mousePos.y) < Math.abs(prev - mousePos.y) ? curr : prev);
  });

  mousePos.x = xScale(nearest.date);
  mousePos.y = nearestValue;
}

function updateCrosshair() {
  const xValue = xScale.invert(mousePos.x);
  const nearest = data.reduce((prev, curr) => {
    return (Math.abs(curr.date - xValue) < Math.abs(prev.date - xValue) ? curr : prev);
  });

  if (shiftKeyPressed) {
    snapMouseToOHLC(nearest);
  }

  updateCurrentPrices(nearest);

  renderCrosshair();
}

const notInBounds = ({ x, y }) => {
  return x < 0 || y < 0 || x > xScale.range()[1] || y > yScale.range()[0];
};

function renderCrosshair() {
  d3.select('#ohlc-chart svg')
    .datum([mousePos])
    .call(crosshair);

  d3.select('#volume-chart svg')
    .datum([mousePos])
    .call(crosshairVertical);

  // Some complicated code follows to make the x and y axis labels work smoothly

  const xLabelText = state.currentBar != null ? state.currentBar.date.toLocaleString() : "";
  const xLabel = d3.select("#x-label");

  const yLabelText = round2(yScale.invert(mousePos.y));
  const yLabel = d3.select("#y-label");

  if (notInBounds(mousePos)) {
    xLabel.remove();
    yLabel.remove();
    return;
  }

  const adjustLabel = (g, rect1, rect2, text) => {
    const label = g.attr('id');
    const transform = label === 'x-label' ? `translate(${mousePos.x},16)` : `translate(0,${mousePos.y})`;
    g.attr('transform', transform);
    rect1.style('fill', 'white');
    rect2.style('fill', 'black');
    text.text(label === 'x-label' ? xLabelText : yLabelText).style('fill', 'white');

    const textNode = text.node();
    const bbox = textNode.getBBox();

    rect1.attr('x', bbox.x - 5)
      .attr('y', bbox.y - 5)
      .attr('width', bbox.width + 10)
      .attr('height', bbox.height + 10);

    rect2.attr('x', bbox.x - 5)
      .attr('y', bbox.y - 5)
      .attr('width', bbox.width + 10)
      .attr('height', bbox.height + 10);

    g.raise();
  };

  if (xLabel.empty()) {
    d3.select('#volume-chart .bottom-axis svg')
      .each(function () {
        const self = d3.select(this);
        const g = self.append('g').attr('id', 'x-label');
        const rect1 = g.append('rect').attr('id', 'rect1');
        const rect2 = g.append('rect').attr('id', 'rect2');
        const text = g.append('text');
        adjustLabel(g, rect1, rect2, text);
      });
  } else {
    xLabel.each(function () {
      const g = d3.select(this);
      const rect1 = g.select('rect#rect1');
      const rect2 = g.select('rect#rect2');
      const text = g.select('text');
      adjustLabel(g, rect1, rect2, text);
    });
  }

  if (yLabel.empty()) {
    d3.select('#ohlc-chart .right-axis svg')
      .each(function () {
        const self = d3.select(this);
        const g = self.append('g').attr('id', 'y-label');
        const rect1 = g.append('rect').attr('id', 'rect1');
        const rect2 = g.append('rect').attr('id', 'rect2');
        const text = g.append('text');
        adjustLabel(g, rect1, rect2, text);
      });
  } else {
    yLabel.each(function () {
      const g = d3.select(this);
      const rect1 = g.select('rect#rect1');
      const rect2 = g.select('rect#rect2');
      const text = g.select('text');
      adjustLabel(g, rect1, rect2, text);
    });
  }
}

d3.select('#ohlc-chart')
  .on("mousemove", e => {
    mousePos.x = e.layerX;
    mousePos.y = e.layerY;

    // layerX gets a weirdly small value when you mouse over the y axis labels
    const limitX = xScale.range()[1];
    if (Math.abs(e.layerX - e.clientX) > 50) {
      mousePos.x = limitX;
    }
    // but then if you go too far to the side of the y axis labels, layerX gets big again
    if (e.layerX > limitX) {
      mousePos.x = limitX;
    }

    updateCrosshair();
  });

// To close it out, define the charts and render them

function render() {
  d3.select('#ohlc-chart')
    .datum(data)
    .call(ohlcChart);

  d3.select('#volume-chart')
    .datum(data)
    .call(volumeChart);

  if (!state.volumeVisible) {
    d3.selectAll('#volume-chart .plot-area').call(displayNone);
    d3.selectAll('#volume-chart .cartesian-chart').call(flatgrid);
    d3.selectAll('#volume-chart').call(attr("flex", "0"));
  } else {
    d3.selectAll('#volume-chart .plot-area').call(attr('display', 'block'));
    d3.selectAll('#volume-chart .cartesian-chart').call(specialgrid);
    d3.selectAll('#volume-chart').call(attr("flex", "1"));
  }

  renderCrosshair();
}

render();
