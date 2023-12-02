// User config (will be properly parameterized in the future)

const options = {
  colors: {
    bull: [0.26666666666666666, 0.592156862745098, 0.5098039215686274],
    bear: [0.8549019607843137, 0.27450980392156865, 0.2901960784313726]
  },
  scaleExtent: [.2, 5],
};

const userProvidedData = fc.randomFinancial()(100);

const chartContainer = "chart-container";

const indicators = [
  {
    name: (i) => `Simple Moving Average (${i.options.length})`,
    type: "line",
    options: {
      color: "#1111AA",
      length: 20,
    },
    fn: (bar, options) => {
      return round2(sma(bar, options.length, "close"));
    },
  },
];

// Library code

// Misc helpers first

function deepCopy(obj) {
  // Handle null, undefined, and non-object values
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    var copiedArray = [];
    for (var i = 0; i < obj.length; i++) {
      copiedArray[i] = deepCopy(obj[i]);
    }
    return copiedArray;
  }

  // Handle Objects
  if (obj instanceof Object) {
    var copiedObj = {};
    for (var key in obj) {
      // Ensure the property belongs to the object, not inherited
      if (obj.hasOwnProperty(key)) {
        copiedObj[key] = deepCopy(obj[key]);
      }
    }
    return copiedObj;
  }

  // If it's a function or other type, return it as is
  return obj;
}

function generateRandomString(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function hexToRgba(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const a = 1; // alpha value is 1 for full opacity
  return [r, g, b, a];
}

function round2(num) {
  return Math.round(num * 100) / 100;
}

const transparent = [0, 0, 0, 0];

function removeObjectFromArray(array, object) {
  const index = array.indexOf(object);
  if (index > -1) {
    array.splice(index, 1);
  }
}

// Imported icons

const iconoirEyeSvg = '<?xml version="1.0" encoding="UTF-8"?><svg width="24px" height="24px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M3 13C6.6 5 17.4 5 21 13" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 17C10.3431 17 9 15.6569 9 14C9 12.3431 10.3431 11 12 11C13.6569 11 15 12.3431 15 14C15 15.6569 13.6569 17 12 17Z" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
const iconoirXmarkSvg = '<?xml version="1.0" encoding="UTF-8"?><svg width="24px" height="24px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M6.75827 17.2426L12.0009 12M17.2435 6.75736L12.0009 12M12.0009 12L6.75827 6.75736M12.0009 12L17.2435 17.2426" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
const iconoirSettingsSvg = '<?xml version="1.0" encoding="UTF-8"?><svg width="24px" height="24px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000"><path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M19.6224 10.3954L18.5247 7.7448L20 6L18 4L16.2647 5.48295L13.5578 4.36974L12.9353 2H10.981L10.3491 4.40113L7.70441 5.51596L6 4L4 6L5.45337 7.78885L4.3725 10.4463L2 11V13L4.40111 13.6555L5.51575 16.2997L4 18L6 20L7.79116 18.5403L10.397 19.6123L11 22H13L13.6045 19.6132L16.2551 18.5155C16.6969 18.8313 18 20 18 20L20 18L18.5159 16.2494L19.6139 13.598L21.9999 12.9772L22 11L19.6224 10.3954Z" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

// Supply some utility functions for indicators

function sma(bar, length, accessor) {
  let sum = 0;
  for (var i = 0; i < length; i++) {
    if (bar[i][accessor] == null) {
      return;
    }
    sum += bar[i][accessor];
  }
  return sum / length;
}

// Transform the data into our special objects so that it can be more useful for creating indicators

function createWrappedDatum(datum, index, arr) {
  return new Proxy(datum, {
    get(target, prop) {
      if (typeof prop === 'string' && !isNaN(prop)) {
        const value = arr[index - Number(prop)];
        if (value == null) {
          return {};
        }
        return value;
      }
      return target[prop];
    }
  });
}

const data = userProvidedData.map((datum, index, arr) => createWrappedDatum(datum, index, arr));

// Define stateful objects and their member functions

const state = {
  currentBar: null,
  volumeVisible: true,
  indicators: [],
};

const priceChangeCallbacks = [];

priceChangeCallbacks.push(bar => state.currentBar = bar);

const mousePos = { x: -1, y: -1 }

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

// Then we manually create the HTML elements we will need

function createFormFromObject(elem, obj, callback) {
  // Create the form element
  var form = document.createElement('form');
  form.style.textAlign = 'left';
  form.style.marginTop = '1em';

  // Function to gather form data and call the callback
  function gatherDataAndCallCallback() {
    var formData = {};
    for (var i = 0; i < form.elements.length; i++) {
      var formElement = form.elements[i];
      if (formElement.name) {
        formData[formElement.name] = formElement.value;
      }
    }
    callback(formData);
  }

  // Iterate over each property in the object
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Create a container for each row
      var row = document.createElement('div');
      row.style.marginBottom = '10px';
      row.style.marginLeft = '0.5em';

      // Create a label for the input
      var label = document.createElement('label');
      label.textContent = key + ': ';
      label.style.marginRight = '10px';
      label.style.display = 'inline-block';
      label.style.width = '100px';

      // Create the input element
      var input = document.createElement('input');
      input.name = key;
      input.value = obj[key];

      // Determine the type of the input
      if (typeof obj[key] === 'string') {
        if (obj[key].startsWith('#')) {
          input.type = 'color';
        } else {
          input.type = 'text';
        }
      } else if (typeof obj[key] === 'number') {
        input.type = 'number';
      }

      // Add blur event listener to call callback when input loses focus
      input.addEventListener('blur', gatherDataAndCallCallback);

      // Append the label and input to the row
      row.appendChild(label);
      row.appendChild(input);

      // Append the row to the form
      form.appendChild(row);
    }
  }

  elem.appendChild(form);
}

var style = document.createElement('style');
style.type = 'text/css';
style.innerHTML = '.info-box-hover-effect:hover { background-color: rgba(0, 0, 0, 0.1); }';
document.getElementsByTagName('head')[0].appendChild(style);

const container = document.getElementById(chartContainer);
container.style.display = "flex";
container.style.flexDirection = "column";
container.style.fontSize = '1.2em';

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
infoBoxElem.style.padding = "0.4em 0.6em 0.4em 0.4em";
infoBoxElem.style.backgroundColor = "#eee";
infoBoxElem.style.userSelect = "none";
infoBoxElem.style.width = "24em";
container.appendChild(infoBoxElem);

const ohlcBoxElem = document.createElement("div");
ohlcBoxElem.style.padding = '0.3em';

const ohlcElements = {
  open: document.createElement("span"),
  high: document.createElement("span"),
  low: document.createElement("span"),
  close: document.createElement("span"),
};

priceChangeCallbacks.push(bar => {
  ohlcElements.open.innerHTML = round2(bar.open);
  ohlcElements.high.innerHTML = round2(bar.high);
  ohlcElements.low.innerHTML = round2(bar.low);
  ohlcElements.close.innerHTML = round2(bar.close);
});

const openLabel = document.createElement("span");
openLabel.innerHTML = "O: ";
const highLabel = document.createElement("span");
highLabel.innerHTML = " H: ";
const lowLabel = document.createElement("span");
lowLabel.innerHTML = " L: ";
const closeLabel = document.createElement("span");
closeLabel.innerHTML = " C: ";

ohlcElements.open.style.fontWeight = "bold";
ohlcElements.high.style.fontWeight = "bold";
ohlcElements.low.style.fontWeight = "bold";
ohlcElements.close.style.fontWeight = "bold";

ohlcBoxElem.appendChild(openLabel);
ohlcBoxElem.appendChild(ohlcElements.open);
ohlcBoxElem.appendChild(highLabel);
ohlcBoxElem.appendChild(ohlcElements.high);
ohlcBoxElem.appendChild(lowLabel);
ohlcBoxElem.appendChild(ohlcElements.low);
ohlcBoxElem.appendChild(closeLabel);
ohlcBoxElem.appendChild(ohlcElements.close);
infoBoxElem.appendChild(ohlcBoxElem);

infoBoxItems = [];

function addToInfoBox(indicator, visibilityToggleFn, valueFn, removeCb) {
  const newItemElem = document.createElement("div")
  const id = generateRandomString(8);
  newItemElem.id = id;
  if (indicator.state) {
    indicator.state.elementId = id;
  }
  newItemElem.style.width = "100%";
  newItemElem.style.padding = "0 0.3em";
  newItemElem.style.display = "flex";
  newItemElem.style.alignItems = "center";

  const newItemLabel = document.createElement("span");
  newItemLabel.className = "label";
  newItemLabel.innerHTML = indicator.name(indicator) + ": ";

  newItemElem.appendChild(newItemLabel);

  const valueElem = document.createElement("span");
  valueElem.style.fontWeight = "bold";
  valueElem.style.marginLeft = "0.3em";
  newItemElem.appendChild(valueElem);

  const rightSideElems = document.createElement("span");
  rightSideElems.style.flex = "1";
  rightSideElems.style.textAlign = "right";
  newItemElem.appendChild(rightSideElems);

  const toggleElem = document.createElement("span");
  toggleElem.innerHTML = iconoirEyeSvg;
  toggleElem.style.paddingLeft = '.1em';
  toggleElem.style.cursor = "pointer";
  rightSideElems.appendChild(toggleElem);

  infoBoxElem.insertBefore(newItemElem, infoBoxElem.children[infoBoxElem.children.length - 1])

  let toggled = true;

  toggleElem.addEventListener("click", () => {
    visibilityToggleFn();
    toggled = !toggled;
    if (!toggled) {
      newItemElem.style.opacity = 0.5;
    } else {
      newItemElem.style.opacity = 1;
    }
    render();
  });

  const infoBoxItem = {
    onValueChange: (bar) => {
      const value = valueFn(bar);
      if (isNaN(value)) {
        valueElem.innerHTML = "...";
      } else {
        valueElem.innerHTML = "" + valueFn(bar);
      }
    },
  };
  infoBoxItems.push(infoBoxItem);

  if (removeCb) {
    const removeElem = document.createElement("span");
    removeElem.innerHTML = iconoirXmarkSvg;
    removeElem.style.paddingLeft = '.1em';
    removeElem.style.cursor = "pointer";
    rightSideElems.appendChild(removeElem);

    const settingsElem = document.createElement("span");
    settingsElem.innerHTML = iconoirSettingsSvg;
    settingsElem.style.cursor = "pointer";
    rightSideElems.insertBefore(settingsElem, toggleElem);

    const [settingsPopup, settingsContents, showSettingsPopup] = createPopup(indicator.name(indicator));
    createFormFromObject(settingsContents, indicator.options, opts => {
      indicator.options = opts;
      indicator.state.chartObjects.line.decorate(fc.webglStrokeColor(hexToRgba(indicator.options.color)))
      refreshInfoBox(indicator);
      render();
    });
    settingsElem.addEventListener("click", showSettingsPopup);

    removeElem.addEventListener("click", () => {
      newItemElem.remove();
      settingsPopup.remove();
      removeObjectFromArray(infoBoxItems, infoBoxItem);
      removeCb();
    });
  } else {
    rightSideElems.style.paddingRight = '1.65em';
  }
}

function refreshInfoBox(indicator) {
  const elem = document.getElementById(indicator.state.elementId);
  if (elem) {
    for (var i = 0; i < elem.children.length; i++) {
      if (elem.children[i].className === "label") {
        elem.children[i].innerHTML = indicator.name(indicator) + ": ";
      }
    }
  }
}

priceChangeCallbacks.push(bar => infoBoxItems.forEach(i => i.onValueChange(bar)));

const addIndicatorElem = document.createElement('div');
addIndicatorElem.innerHTML = 'Add Indicator';
addIndicatorElem.style.textDecoration = 'underline';
addIndicatorElem.style.cursor = 'pointer';
addIndicatorElem.style.padding = '0.3em 0 0 0.3em';
infoBoxElem.appendChild(addIndicatorElem);

addToInfoBox(
  { name: () => "Volume" },
  () => state.volumeVisible = !state.volumeVisible,
  (bar) => round2(bar.volume));

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


// Define the indicators

function addIndicator(indicator) {
  const { type, options, fn } = indicator;
  indicator.fn = (bar) => fn(bar, indicator.options);
  indicator.state = {
    enabled: true,
    chartObjects: {},
    values: [],
  };

  if (type === "line") {
    const line = fc
      .seriesWebglLine()
      .xScale(xScale)
      .yScale(yScale)
      .crossValue(d => d.date)
      .mainValue(indicator.fn)
      .decorate(fc.webglStrokeColor(hexToRgba(options.color)));
    indicator.state.chartObjects.line = line;
  }

  state.indicators.push(indicator);

  addToInfoBox(indicator, () => {
    indicator.state.enabled = !indicator.state.enabled;
    if (!indicator.state.enabled) {
      indicator.state.chartObjects.line.mainValue(_ => undefined);
    } else {
      indicator.state.chartObjects.line.mainValue(indicator.fn);
    }
  },
    (bar) => indicator.fn(bar),
    () => {
      removeObjectFromArray(state.indicators, indicator);
      removeFromWebglMultiSeries(indicator.state.chartObjects.line);
    });

  addToWebglMultiSeries(indicator.state.chartObjects.line);
}

function createPopup(titleText) {
  const popupContainer = document.createElement('div');
  popupContainer.style.position = 'absolute';
  popupContainer.style.backgroundColor = 'rgba(238, 238, 238, 0.5)';
  popupContainer.style.width = '100%';
  popupContainer.style.height = '100%';
  popupContainer.style.display = 'none';
  popupContainer.style.userSelect = 'none';

  popupContainer.onclick = function (e) {
    if (e.target === popupContainer) {
      popupContainer.style.display = 'none';
    }
  }

  const popup = document.createElement('div');
  popup.style.width = '400px';
  popup.style.margin = '100px auto';
  popup.style.backgroundColor = '#fff';
  popup.style.position = 'relative';
  popup.style.padding = '15px';
  popup.style.boxShadow = '0px 0px 10px rgba(0,0,0,0.5)';

  const title = document.createElement('div');
  title.innerHTML = titleText;
  title.style.fontSize = '1.5em';
  title.style.padding = '5px';

  const contents = document.createElement('div');

  const closeButton = document.createElement('div');
  closeButton.innerHTML = iconoirXmarkSvg;
  closeButton.style.position = 'absolute';
  closeButton.style.top = '20px';
  closeButton.style.right = '15px';
  closeButton.style.cursor = 'pointer';

  const hidePopup = function () {
    popupContainer.style.display = 'none';
  };
  closeButton.onclick = hidePopup;

  popup.appendChild(title);
  popup.appendChild(closeButton);
  popup.appendChild(contents);
  popupContainer.appendChild(popup);

  container.appendChild(popupContainer);

  return [popupContainer, contents, () => {
    popupContainer.style.display = 'block';
  }, hidePopup];
}

const [_, indicatorPopupContents, showIndicatorPopup] = createPopup('Add Indicator');

indicators.forEach(i => {
  const elem = document.createElement('div');
  elem.className = "info-box-hover-effect";
  elem.innerHTML = i.name(i);
  elem.style.marginTop = '1em';
  elem.style.cursor = 'pointer';
  elem.style.padding = '5px';
  elem.addEventListener('click', () => addIndicator(deepCopy(i)));
  indicatorPopupContents.appendChild(elem);
});

addIndicatorElem.addEventListener('click', showIndicatorPopup);

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
  .decorate(setFillColor(0.8));

const webglMulti = fc.seriesWebglMulti();
webglMulti
  .xScale(xScale)
  .yScale(yScale)
  .series([candlestick]);

function addToWebglMultiSeries(newSeries) {
  const existingSeries = webglMulti.series();
  webglMulti.series([...existingSeries, newSeries]);
  render();
}

function removeFromWebglMultiSeries(seriesToRemove) {
  const newSeries = webglMulti.series();
  removeObjectFromArray(newSeries, seriesToRemove);
  webglMulti.series(newSeries);
  render();
}

const ohlcChart = fc
  .chartCartesian(xScale, yScale)
  .webglPlotArea(webglMulti)
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

  priceChangeCallbacks.forEach(fn => fn(nearest));

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
    const transform = label === 'x-label' ? `translate(${mousePos.x},18)` : `translate(5,${mousePos.y})`;
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

priceChangeCallbacks.forEach(fn => fn(data[data.length - 1]));

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
