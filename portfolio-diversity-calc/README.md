# 📊 Portfolio Diversity Score

A single-page web app: type in your stocks and ETFs (by ticker or name), set each
position's weight, and get an instant **0–100 diversity score** for your portfolio —
with a sector-exposure breakdown and plain-English tips.

> **🔗 Live demo: https://portfolio-diversity-calc.vercel.app/**

Everything runs in the browser. No accounts, no server, no data leaves your machine.

---

## Features

- **Search-as-you-type** across ~120 popular stocks and ETFs — by ticker (`VOO`, `TSLA`)
  or by name (`Apple`, `Nvidia`). Keyboard-navigable (↑/↓/Enter).
- **Equal distribution by default** — positions you don't type a weight into automatically
  split the allocation evenly (add 3 → 33.3% each). Type a value to pin a position; the rest
  re-balance around it. **Normalize to 100%** and **Weight equally** are one-click too.
- **Live 0–100 diversity score** with a color-coded gauge and rating.
- **Sub-scores** for position spread, sector spread, and asset-class spread.
- **Sector-exposure bars** and **contextual tips** ("your largest position is 60% of the
  portfolio…").

## How the score works

The score combines three sub-scores, each measured with an *effective count* derived from a
[Herfindahl–Hirschman Index](https://en.wikipedia.org/wiki/Herfindahl%E2%80%93Hirschman_index)
(HHI) — the standard concentration measure. `effective count = 1 / Σ(weightᵢ²)`.

| Sub-score | Weight | What it measures |
|-----------|:------:|------------------|
| **Position spread** | 45% | Effective number of underlying positions. ETFs are decomposed by their breadth, so one broad-market ETF counts as hundreds of small positions — a single stock counts as one. |
| **Sector spread** | 30% | Effective number of sectors after decomposing each holding into its sector weights (GICS-style buckets). |
| **Asset-class spread** | 25% | Effective number of asset classes: U.S. equity, international, bonds, real estate, commodities, crypto. |

Each sub-score is mapped onto 0–1 (position spread on a log scale where ≈50 effective
positions is "full marks"; sector spread where ≈8 sectors is full; asset-class spread where
3+ balanced classes is full), then blended into the final 0–100.

**Example scores** (from the built-in test cases):

| Portfolio | Score |
|-----------|:-----:|
| `AAPL` 100% | 4 |
| 10 tech stocks, equal weight | 30 |
| `QQQ` 100% | 57 |
| `VOO` 100% | 70 |
| Classic 3-fund (`VTI`/`VXUS`/`BND`) | 90+ |
| `VOO`/`VXUS`/`BND`/`VNQ`/`GLD` | 100 |

## Run locally

It's a static site — just open it, or serve it:

```bash
# option A: open the file directly
open index.html

# option B: serve it (any static server works)
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project structure

```
index.html   markup + styles
stocks.js     curated ticker database (sector, type, breadth, asset class, sector weights)
app.js        search/autocomplete, holdings UI, and the scoring engine
```

## Adding tickers

Add an entry to the `STOCKS` array in `stocks.js`:

```js
{ t:"XYZ", n:"Example Corp.", sec:"Technology", type:"stock", ac:"us_equity", b:1 }
```

For an ETF, set `type:"etf"`, a `b` (breadth = effective number of holdings), and an optional
`sw` sector-weight map. See the top of `stocks.js` for the field reference.

## Disclaimer

Educational tool only. The diversity score is a heuristic based on position, sector, and
asset-class concentration. It is **not** investment advice, and it doesn't account for
factor exposure, correlations between specific holdings, or your personal circumstances.
