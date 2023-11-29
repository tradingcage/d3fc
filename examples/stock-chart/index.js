const options = {
  colors: {
    bull: [0.26666666666666666, 0.592156862745098, 0.5098039215686274],
    bear: [0.8549019607843137, 0.27450980392156865, 0.2901960784313726]
  },
  snapToOHLC: true
};

const data = fc.randomFinancial()(100);

const currentPrices = {
  date: document.getElementById("current-price-date"),
  open: document.getElementById("current-price-open"),
  high: document.getElementById("current-price-high"),
  low: document.getElementById("current-price-low"),
  close: document.getElementById("current-price-close"),
  volume: document.getElementById("current-price-volume"),
};

function round2(num) {
  return Math.round(num * 100) / 100;
}

function updateCurrentPrices(bar) {
  currentPrices.date.innerHTML = bar.date.toLocaleString();
  currentPrices.open.innerHTML = round2(bar.open);
  currentPrices.high.innerHTML = round2(bar.high);
  currentPrices.low.innerHTML = round2(bar.low);
  currentPrices.close.innerHTML = round2(bar.close);
  currentPrices.volume.innerHTML = round2(bar.volume);
}

updateCurrentPrices(data[data.length - 1]);

const mousePos = {x: -1, y: -1}

function paddedAccessors() {
  return [d => d.high + (d.high - d.low) / 3, d => d.low - (d.high - d.low) / 3];
}

const xScale = d3.scaleTime().domain(fc.extentDate().accessors([d => d.date])(data));
const yScale = d3.scaleLinear().domain(fc.extentLinear().accessors(paddedAccessors())(data));

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

const candlestick = fc.autoBandwidth(fc.seriesWebglCandlestick())
  .decorate(setFillColor(1))
const gridline = fc.annotationCanvasGridline();
const lowLine = fc.seriesSvgLine();

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

const volumeValues = data.map(d => d.volume);
const maxVolume = Math.max(...volumeValues);
const minVolume = Math.min(...volumeValues);
const volumeScale = d3.scaleLinear().domain([minVolume / 1.3, maxVolume]);

const volume = fc.autoBandwidth(fc.seriesWebglBar())
  .crossValue(d => d.date)
  .mainValue(d => d.volume)
  .decorate(setFillColor(0.8))

function annotationLine(sel) {
  sel.enter()
    .selectAll('g.annotation-line > line')
    .each(function() {
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

function hide(sel) {
  return sel.each(function() {
    const self = d3.select(this);
    self.style('display', 'none');
  });
};

function nogrid(sel) {
  return sel.each(function() {
    const self = d3.select(this);
    self.style('display', 'grid');
    self.style('display', '-ms-grid');
    self.style('grid-template-columns', 'minmax(0em,max-content) 0fr 1fr 0fr minmax(0em,max-content)');
    self.style('-ms-grid-columns', 'minmax(0em,max-content) 0fr 1fr 0fr minmax(0em,max-content)');
    self.style('grid-template-rows', 'minmax(0em,max-content) 0fr 1fr 0fr minmax(0em,max-content)');
    self.style('-ms-grid-rows', 'minmax(0em,max-content) 0fr 1fr 0fr minmax(0em,max-content)');
  });
}

function fontsize(fs) {
  return function(sel) {
    return sel.each(function() {
      const self = d3.select(this);
      self.style("font-size", fs + "px");
    });
  };
}


const ohlcChart = fc
  .chartCartesian(xScale, yScale)
  .webglPlotArea(candlestick)
  .canvasPlotArea(gridline)
  .svgPlotArea(lowLine)
  .decorate(sel => {
    sel.enter().call(nogrid);
    sel.enter()
      .selectAll('.plot-area')
      .call(zoom, xScale, yScale)
    sel.enter()
      .selectAll('.x-axis')
      .call(hide, zoom, xScale);
    sel.enter()
      .selectAll('.top-label')
      .call(hide);
  });

const volumeChart = fc
  .chartCartesian(xScale, volumeScale)
  .webglPlotArea(volume)
  .svgPlotArea(lowLine)
  .decorate(sel => {
    sel.enter().call(nogrid);
    sel.enter()
      .selectAll('.plot-area')
      .call(zoom, xScale, yScale)
    sel.enter()
      .selectAll('.x-axis')
      .call(zoom, xScale);
    sel.enter()
      .selectAll('.top-label')
      .call(hide);
    sel.enter()
      .selectAll('.right-axis svg')
      .call(hide);
    sel.enter()
      .selectAll('svg')
      .call(fontsize(14));
  });

const notInBounds = ({x, y}) => {
  return x < 0 || y < 0 || x > xScale.range()[1] || y > yScale.range()[0];
};

function render() {
  d3.select('#ohlc-chart')
    .datum(data)
    .call(ohlcChart);

  d3.select('#volume-chart')
    .datum(data)
    .call(volumeChart);

  renderCrosshair();
}

function renderCrosshair() {
  d3.select('#ohlc-chart svg')
    .datum([mousePos])
    .call(crosshair);

  d3.select('#volume-chart svg')
    .datum([mousePos])
    .call(crosshairVertical);

  const xLabelText = currentPrices.date.innerHTML;
  const xLabel = d3.select("#x-label");

  if (notInBounds(mousePos)) {
    xLabel.remove();
    return;
  }

  if (xLabel.empty()) {
    d3.select('#volume-chart .bottom-axis svg')
      .each(function() {
        const self = d3.select(this);
        const g = self.append('g')
                      .attr('id', 'x-label')
                      .attr('transform', `translate(${mousePos.x},16)`);

        const rect1 = g.append('rect')
                       .attr('id', 'rect1')
                       .style('fill', 'white');

        const rect2 = g.append('rect')
                       .attr('id', 'rect2')
                       .style('fill', 'black');

        const text = g.append('text')
                      .text(xLabelText)
                      .style('fill', 'white');

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
      });
  } else {
    xLabel.each(function() {
      const g = d3.select(this);
      g.attr('transform', `translate(${mousePos.x},16)`);
      const rect1 = g.select('rect#rect1').style('fill', 'white');
      const rect2 = g.select('rect#rect2').style('fill', 'black');

      const text = g.select('text')
                    .text(xLabelText);

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
    });
  }
}

function getNearestOHLC(x, y) {
  const xValue = xScale.invert(x);
  const nearest = data.reduce((prev, curr) => {
    return (Math.abs(curr.date - xValue) < Math.abs(prev.date - xValue) ? curr : prev);
  });
  const openY = yScale(nearest.open);
  const highY = yScale(nearest.high);
  const lowY = yScale(nearest.low);
  const closeY = yScale(nearest.close);

  const ohlcValues = [nearest.open, nearest.high, nearest.low, nearest.close];
  const nearestValue = ohlcValues.reduce((prevVal, currVal) => {
    const prev = yScale(prevVal);
    const curr = yScale(currVal);
    return (Math.abs(curr - mousePos.y) < Math.abs(prev - mousePos.y) ? currVal : prevVal);
  });

  return {
    date: nearest.date,
    value: nearestValue,
  };
}

function snapMouseToOHLC(nearest) {
  // Convert OHLC values to y-coordinates
  const openY = yScale(nearest.open);
  const highY = yScale(nearest.high);
  const lowY = yScale(nearest.low);
  const closeY = yScale(nearest.close);

  // Array of OHLC y-coordinates
  const ohlcValues = [openY, highY, lowY, closeY];

  // Find the nearest OHLC value to the current mouse Y position
  const nearestValue = ohlcValues.reduce((prev, curr) => {
    return (Math.abs(curr - mousePos.y) < Math.abs(prev - mousePos.y) ? curr : prev);
  });

  // Set mousePos.x to the x-coordinate of the OHLC bar
  mousePos.x = xScale(nearest.date);

  // Set mousePos.y to the nearest OHLC value's y-coordinate
  mousePos.y = nearestValue;
}

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

d3.select('#ohlc-chart')
  .on("mousemove", e => {
    console.log(e);
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

render();
