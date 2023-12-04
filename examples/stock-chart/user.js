FirChart("chart-container", fc.randomFinancial()(100), {
  colors: {
    bull: "#449883",
    bear: "#db464a",
  },
  scaleExtent: [.2, 5],
  indicators: [
    "sma",
    "ema",
    "atr",
    "keltnerChannels",
    "bollingerBands",
    "rsi",
  ],
});