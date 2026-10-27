/* Curated ticker database for the diversity calculator.
 *
 * Fields per entry:
 *   t   ticker
 *   n   full name
 *   sec sector bucket (single sector for individual stocks)
 *   type 'stock' | 'etf'
 *   ac  asset class: us_equity | intl_equity | bond | reit | commodity | crypto | cash
 *   b   breadth = effective number of underlying holdings (1 for a single stock)
 *   sw  optional sector-weight map for ETFs (fractions summing to ~1)
 *
 * Sector-weight presets for broad equity funds mirror approximate S&P 500 / total-market weights.
 */

// Approximate broad U.S. market sector weights (S&P 500-ish).
const SP = {
  "Technology": 0.30, "Financials": 0.13, "Health Care": 0.12,
  "Consumer Discretionary": 0.10, "Communication Services": 0.09, "Industrials": 0.08,
  "Consumer Staples": 0.06, "Energy": 0.04, "Utilities": 0.025,
  "Real Estate": 0.023, "Materials": 0.022
};
// Nasdaq-100 style (tech + comms heavy).
const NDX = {
  "Technology": 0.50, "Communication Services": 0.16, "Consumer Discretionary": 0.18,
  "Health Care": 0.06, "Consumer Staples": 0.05, "Industrials": 0.05
};
// Developed/emerging international equity spread.
const INTL = {
  "Financials": 0.20, "Industrials": 0.14, "Technology": 0.13, "Consumer Discretionary": 0.12,
  "Health Care": 0.10, "Consumer Staples": 0.08, "Materials": 0.08, "Communication Services": 0.06,
  "Energy": 0.05, "Utilities": 0.03, "Real Estate": 0.01
};

const STOCKS = [
  // ---- Mega-cap / popular individual stocks ----
  { t:"AAPL", n:"Apple Inc.", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"MSFT", n:"Microsoft Corp.", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"NVDA", n:"NVIDIA Corp.", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"GOOGL", n:"Alphabet Inc. (Class A)", sec:"Communication Services", type:"stock", ac:"us_equity", b:1 },
  { t:"GOOG", n:"Alphabet Inc. (Class C)", sec:"Communication Services", type:"stock", ac:"us_equity", b:1 },
  { t:"AMZN", n:"Amazon.com Inc.", sec:"Consumer Discretionary", type:"stock", ac:"us_equity", b:1 },
  { t:"META", n:"Meta Platforms Inc.", sec:"Communication Services", type:"stock", ac:"us_equity", b:1 },
  { t:"TSLA", n:"Tesla Inc.", sec:"Consumer Discretionary", type:"stock", ac:"us_equity", b:1 },
  { t:"BRK.B", n:"Berkshire Hathaway (Class B)", sec:"Financials", type:"stock", ac:"us_equity", b:1 },
  { t:"AVGO", n:"Broadcom Inc.", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"JPM", n:"JPMorgan Chase & Co.", sec:"Financials", type:"stock", ac:"us_equity", b:1 },
  { t:"V", n:"Visa Inc.", sec:"Financials", type:"stock", ac:"us_equity", b:1 },
  { t:"MA", n:"Mastercard Inc.", sec:"Financials", type:"stock", ac:"us_equity", b:1 },
  { t:"UNH", n:"UnitedHealth Group", sec:"Health Care", type:"stock", ac:"us_equity", b:1 },
  { t:"LLY", n:"Eli Lilly & Co.", sec:"Health Care", type:"stock", ac:"us_equity", b:1 },
  { t:"JNJ", n:"Johnson & Johnson", sec:"Health Care", type:"stock", ac:"us_equity", b:1 },
  { t:"XOM", n:"Exxon Mobil Corp.", sec:"Energy", type:"stock", ac:"us_equity", b:1 },
  { t:"CVX", n:"Chevron Corp.", sec:"Energy", type:"stock", ac:"us_equity", b:1 },
  { t:"WMT", n:"Walmart Inc.", sec:"Consumer Staples", type:"stock", ac:"us_equity", b:1 },
  { t:"PG", n:"Procter & Gamble", sec:"Consumer Staples", type:"stock", ac:"us_equity", b:1 },
  { t:"KO", n:"Coca-Cola Co.", sec:"Consumer Staples", type:"stock", ac:"us_equity", b:1 },
  { t:"PEP", n:"PepsiCo Inc.", sec:"Consumer Staples", type:"stock", ac:"us_equity", b:1 },
  { t:"COST", n:"Costco Wholesale", sec:"Consumer Staples", type:"stock", ac:"us_equity", b:1 },
  { t:"HD", n:"Home Depot Inc.", sec:"Consumer Discretionary", type:"stock", ac:"us_equity", b:1 },
  { t:"MCD", n:"McDonald's Corp.", sec:"Consumer Discretionary", type:"stock", ac:"us_equity", b:1 },
  { t:"NKE", n:"Nike Inc.", sec:"Consumer Discretionary", type:"stock", ac:"us_equity", b:1 },
  { t:"DIS", n:"Walt Disney Co.", sec:"Communication Services", type:"stock", ac:"us_equity", b:1 },
  { t:"NFLX", n:"Netflix Inc.", sec:"Communication Services", type:"stock", ac:"us_equity", b:1 },
  { t:"CRM", n:"Salesforce Inc.", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"ORCL", n:"Oracle Corp.", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"ADBE", n:"Adobe Inc.", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"AMD", n:"Advanced Micro Devices", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"INTC", n:"Intel Corp.", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"CSCO", n:"Cisco Systems", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"QCOM", n:"Qualcomm Inc.", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"IBM", n:"IBM Corp.", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"TXN", n:"Texas Instruments", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"PYPL", n:"PayPal Holdings", sec:"Financials", type:"stock", ac:"us_equity", b:1 },
  { t:"BAC", n:"Bank of America", sec:"Financials", type:"stock", ac:"us_equity", b:1 },
  { t:"WFC", n:"Wells Fargo & Co.", sec:"Financials", type:"stock", ac:"us_equity", b:1 },
  { t:"GS", n:"Goldman Sachs Group", sec:"Financials", type:"stock", ac:"us_equity", b:1 },
  { t:"MS", n:"Morgan Stanley", sec:"Financials", type:"stock", ac:"us_equity", b:1 },
  { t:"ABBV", n:"AbbVie Inc.", sec:"Health Care", type:"stock", ac:"us_equity", b:1 },
  { t:"MRK", n:"Merck & Co.", sec:"Health Care", type:"stock", ac:"us_equity", b:1 },
  { t:"PFE", n:"Pfizer Inc.", sec:"Health Care", type:"stock", ac:"us_equity", b:1 },
  { t:"TMO", n:"Thermo Fisher Scientific", sec:"Health Care", type:"stock", ac:"us_equity", b:1 },
  { t:"ABT", n:"Abbott Laboratories", sec:"Health Care", type:"stock", ac:"us_equity", b:1 },
  { t:"DHR", n:"Danaher Corp.", sec:"Health Care", type:"stock", ac:"us_equity", b:1 },
  { t:"BA", n:"Boeing Co.", sec:"Industrials", type:"stock", ac:"us_equity", b:1 },
  { t:"CAT", n:"Caterpillar Inc.", sec:"Industrials", type:"stock", ac:"us_equity", b:1 },
  { t:"GE", n:"GE Aerospace", sec:"Industrials", type:"stock", ac:"us_equity", b:1 },
  { t:"HON", n:"Honeywell International", sec:"Industrials", type:"stock", ac:"us_equity", b:1 },
  { t:"UPS", n:"United Parcel Service", sec:"Industrials", type:"stock", ac:"us_equity", b:1 },
  { t:"UBER", n:"Uber Technologies", sec:"Industrials", type:"stock", ac:"us_equity", b:1 },
  { t:"LIN", n:"Linde plc", sec:"Materials", type:"stock", ac:"us_equity", b:1 },
  { t:"NEE", n:"NextEra Energy", sec:"Utilities", type:"stock", ac:"us_equity", b:1 },
  { t:"PLTR", n:"Palantir Technologies", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"SHOP", n:"Shopify Inc.", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"COIN", n:"Coinbase Global", sec:"Financials", type:"stock", ac:"us_equity", b:1 },
  { t:"SQ", n:"Block Inc.", sec:"Financials", type:"stock", ac:"us_equity", b:1 },
  { t:"SOFI", n:"SoFi Technologies", sec:"Financials", type:"stock", ac:"us_equity", b:1 },
  { t:"F", n:"Ford Motor Co.", sec:"Consumer Discretionary", type:"stock", ac:"us_equity", b:1 },
  { t:"GM", n:"General Motors", sec:"Consumer Discretionary", type:"stock", ac:"us_equity", b:1 },
  { t:"RIVN", n:"Rivian Automotive", sec:"Consumer Discretionary", type:"stock", ac:"us_equity", b:1 },
  { t:"LCID", n:"Lucid Group", sec:"Consumer Discretionary", type:"stock", ac:"us_equity", b:1 },
  { t:"SBUX", n:"Starbucks Corp.", sec:"Consumer Discretionary", type:"stock", ac:"us_equity", b:1 },
  { t:"T", n:"AT&T Inc.", sec:"Communication Services", type:"stock", ac:"us_equity", b:1 },
  { t:"VZ", n:"Verizon Communications", sec:"Communication Services", type:"stock", ac:"us_equity", b:1 },
  { t:"MU", n:"Micron Technology", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"MRNA", n:"Moderna Inc.", sec:"Health Care", type:"stock", ac:"us_equity", b:1 },
  { t:"GILD", n:"Gilead Sciences", sec:"Health Care", type:"stock", ac:"us_equity", b:1 },
  { t:"SMCI", n:"Super Micro Computer", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"MSTR", n:"MicroStrategy Inc.", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"DELL", n:"Dell Technologies", sec:"Technology", type:"stock", ac:"us_equity", b:1 },
  { t:"BABA", n:"Alibaba Group", sec:"Consumer Discretionary", type:"stock", ac:"intl_equity", b:1 },
  { t:"TSM", n:"Taiwan Semiconductor", sec:"Technology", type:"stock", ac:"intl_equity", b:1 },
  { t:"NVO", n:"Novo Nordisk", sec:"Health Care", type:"stock", ac:"intl_equity", b:1 },
  { t:"ASML", n:"ASML Holding", sec:"Technology", type:"stock", ac:"intl_equity", b:1 },

  // ---- Broad U.S. equity ETFs ----
  { t:"VOO", n:"Vanguard S&P 500 ETF", sec:"Diversified", type:"etf", ac:"us_equity", b:500, sw:SP },
  { t:"SPY", n:"SPDR S&P 500 ETF Trust", sec:"Diversified", type:"etf", ac:"us_equity", b:500, sw:SP },
  { t:"IVV", n:"iShares Core S&P 500 ETF", sec:"Diversified", type:"etf", ac:"us_equity", b:500, sw:SP },
  { t:"VTI", n:"Vanguard Total Stock Market ETF", sec:"Diversified", type:"etf", ac:"us_equity", b:3500, sw:SP },
  { t:"ITOT", n:"iShares Core S&P Total U.S. Stock", sec:"Diversified", type:"etf", ac:"us_equity", b:2500, sw:SP },
  { t:"SCHB", n:"Schwab U.S. Broad Market ETF", sec:"Diversified", type:"etf", ac:"us_equity", b:2500, sw:SP },
  { t:"QQQ", n:"Invesco QQQ (Nasdaq-100)", sec:"Technology", type:"etf", ac:"us_equity", b:100, sw:NDX },
  { t:"QQQM", n:"Invesco Nasdaq-100 ETF", sec:"Technology", type:"etf", ac:"us_equity", b:100, sw:NDX },
  { t:"DIA", n:"SPDR Dow Jones Industrial Avg", sec:"Diversified", type:"etf", ac:"us_equity", b:30, sw:SP },
  { t:"IWM", n:"iShares Russell 2000 (small cap)", sec:"Diversified", type:"etf", ac:"us_equity", b:2000, sw:{ "Industrials":0.18,"Financials":0.17,"Health Care":0.16,"Technology":0.14,"Consumer Discretionary":0.11,"Energy":0.07,"Real Estate":0.06,"Materials":0.05,"Consumer Staples":0.03,"Utilities":0.03 } },
  { t:"VUG", n:"Vanguard Growth ETF", sec:"Technology", type:"etf", ac:"us_equity", b:200, sw:NDX },
  { t:"VTV", n:"Vanguard Value ETF", sec:"Diversified", type:"etf", ac:"us_equity", b:340, sw:{ "Financials":0.22,"Health Care":0.18,"Industrials":0.13,"Consumer Staples":0.11,"Technology":0.09,"Energy":0.08,"Utilities":0.06,"Consumer Discretionary":0.05,"Materials":0.04,"Communication Services":0.04 } },
  { t:"SCHD", n:"Schwab U.S. Dividend Equity ETF", sec:"Diversified", type:"etf", ac:"us_equity", b:100, sw:{ "Financials":0.18,"Health Care":0.15,"Consumer Staples":0.14,"Industrials":0.14,"Energy":0.12,"Technology":0.10,"Consumer Discretionary":0.07,"Materials":0.05,"Communication Services":0.03,"Utilities":0.02 } },
  { t:"VYM", n:"Vanguard High Dividend Yield ETF", sec:"Diversified", type:"etf", ac:"us_equity", b:450, sw:{ "Financials":0.21,"Health Care":0.14,"Consumer Staples":0.13,"Industrials":0.12,"Technology":0.10,"Energy":0.09,"Utilities":0.07,"Consumer Discretionary":0.06,"Communication Services":0.04,"Materials":0.04 } },

  // ---- International equity ETFs ----
  { t:"VXUS", n:"Vanguard Total International Stock", sec:"Diversified", type:"etf", ac:"intl_equity", b:8000, sw:INTL },
  { t:"VEA", n:"Vanguard FTSE Developed Markets", sec:"Diversified", type:"etf", ac:"intl_equity", b:4000, sw:INTL },
  { t:"VWO", n:"Vanguard FTSE Emerging Markets", sec:"Diversified", type:"etf", ac:"intl_equity", b:5000, sw:INTL },
  { t:"IEFA", n:"iShares Core MSCI EAFE ETF", sec:"Diversified", type:"etf", ac:"intl_equity", b:2800, sw:INTL },
  { t:"EEM", n:"iShares MSCI Emerging Markets", sec:"Diversified", type:"etf", ac:"intl_equity", b:1200, sw:INTL },
  { t:"VT", n:"Vanguard Total World Stock ETF", sec:"Diversified", type:"etf", ac:"us_equity", b:9500, sw:SP },

  // ---- Sector ETFs ----
  { t:"XLK", n:"Technology Select Sector SPDR", sec:"Technology", type:"etf", ac:"us_equity", b:65, sw:{ "Technology":1 } },
  { t:"XLF", n:"Financial Select Sector SPDR", sec:"Financials", type:"etf", ac:"us_equity", b:70, sw:{ "Financials":1 } },
  { t:"XLE", n:"Energy Select Sector SPDR", sec:"Energy", type:"etf", ac:"us_equity", b:23, sw:{ "Energy":1 } },
  { t:"XLV", n:"Health Care Select Sector SPDR", sec:"Health Care", type:"etf", ac:"us_equity", b:63, sw:{ "Health Care":1 } },
  { t:"XLY", n:"Consumer Discretionary SPDR", sec:"Consumer Discretionary", type:"etf", ac:"us_equity", b:52, sw:{ "Consumer Discretionary":1 } },
  { t:"XLP", n:"Consumer Staples Select SPDR", sec:"Consumer Staples", type:"etf", ac:"us_equity", b:38, sw:{ "Consumer Staples":1 } },
  { t:"XLI", n:"Industrial Select Sector SPDR", sec:"Industrials", type:"etf", ac:"us_equity", b:78, sw:{ "Industrials":1 } },
  { t:"XLU", n:"Utilities Select Sector SPDR", sec:"Utilities", type:"etf", ac:"us_equity", b:31, sw:{ "Utilities":1 } },
  { t:"SMH", n:"VanEck Semiconductor ETF", sec:"Technology", type:"etf", ac:"us_equity", b:25, sw:{ "Technology":1 } },
  { t:"SOXX", n:"iShares Semiconductor ETF", sec:"Technology", type:"etf", ac:"us_equity", b:30, sw:{ "Technology":1 } },
  { t:"ARKK", n:"ARK Innovation ETF", sec:"Technology", type:"etf", ac:"us_equity", b:35, sw:{ "Technology":0.6,"Health Care":0.2,"Consumer Discretionary":0.1,"Communication Services":0.1 } },
  { t:"IBIT", n:"iShares Bitcoin Trust", sec:"Crypto", type:"etf", ac:"crypto", b:1, sw:{ "Crypto":1 } },
  { t:"GBTC", n:"Grayscale Bitcoin Trust", sec:"Crypto", type:"etf", ac:"crypto", b:1, sw:{ "Crypto":1 } },

  // ---- Bonds / fixed income ----
  { t:"BND", n:"Vanguard Total Bond Market ETF", sec:"Fixed Income", type:"etf", ac:"bond", b:10000, sw:{ "Fixed Income":1 } },
  { t:"AGG", n:"iShares Core U.S. Aggregate Bond", sec:"Fixed Income", type:"etf", ac:"bond", b:11000, sw:{ "Fixed Income":1 } },
  { t:"BNDX", n:"Vanguard Total Intl Bond ETF", sec:"Fixed Income", type:"etf", ac:"bond", b:6000, sw:{ "Fixed Income":1 } },
  { t:"TLT", n:"iShares 20+ Year Treasury Bond", sec:"Fixed Income", type:"etf", ac:"bond", b:40, sw:{ "Fixed Income":1 } },
  { t:"SHY", n:"iShares 1-3 Year Treasury Bond", sec:"Fixed Income", type:"etf", ac:"bond", b:90, sw:{ "Fixed Income":1 } },
  { t:"TIP", n:"iShares TIPS Bond ETF", sec:"Fixed Income", type:"etf", ac:"bond", b:50, sw:{ "Fixed Income":1 } },
  { t:"HYG", n:"iShares High Yield Corp Bond", sec:"Fixed Income", type:"etf", ac:"bond", b:1200, sw:{ "Fixed Income":1 } },
  { t:"LQD", n:"iShares Investment Grade Corp Bond", sec:"Fixed Income", type:"etf", ac:"bond", b:2500, sw:{ "Fixed Income":1 } },
  { t:"MUB", n:"iShares National Muni Bond ETF", sec:"Fixed Income", type:"etf", ac:"bond", b:5500, sw:{ "Fixed Income":1 } },

  // ---- Real estate ----
  { t:"VNQ", n:"Vanguard Real Estate ETF", sec:"Real Estate", type:"etf", ac:"reit", b:160, sw:{ "Real Estate":1 } },
  { t:"SCHH", n:"Schwab U.S. REIT ETF", sec:"Real Estate", type:"etf", ac:"reit", b:120, sw:{ "Real Estate":1 } },
  { t:"O", n:"Realty Income Corp.", sec:"Real Estate", type:"stock", ac:"reit", b:1 },
  { t:"PLD", n:"Prologis Inc.", sec:"Real Estate", type:"stock", ac:"reit", b:1 },

  // ---- Commodities / gold ----
  { t:"GLD", n:"SPDR Gold Shares", sec:"Commodity", type:"etf", ac:"commodity", b:1, sw:{ "Commodity":1 } },
  { t:"IAU", n:"iShares Gold Trust", sec:"Commodity", type:"etf", ac:"commodity", b:1, sw:{ "Commodity":1 } },
  { t:"SLV", n:"iShares Silver Trust", sec:"Commodity", type:"etf", ac:"commodity", b:1, sw:{ "Commodity":1 } },
  { t:"DBC", n:"Invesco DB Commodity Index", sec:"Commodity", type:"etf", ac:"commodity", b:14, sw:{ "Commodity":1 } },
  { t:"USO", n:"United States Oil Fund", sec:"Commodity", type:"etf", ac:"commodity", b:1, sw:{ "Commodity":1 } },

  // ---- Crypto (proxy tickers people type) ----
  { t:"BITO", n:"ProShares Bitcoin Strategy ETF", sec:"Crypto", type:"etf", ac:"crypto", b:1, sw:{ "Crypto":1 } },
  { t:"ETHE", n:"Grayscale Ethereum Trust", sec:"Crypto", type:"etf", ac:"crypto", b:1, sw:{ "Crypto":1 } }
];

// Human-readable labels for asset classes.
const ASSET_LABELS = {
  us_equity: "U.S. Equity", intl_equity: "International Equity", bond: "Bonds",
  reit: "Real Estate", commodity: "Commodities", crypto: "Crypto", cash: "Cash"
};

if (typeof module !== "undefined") module.exports = { STOCKS, ASSET_LABELS };
