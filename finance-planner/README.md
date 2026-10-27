# Northstar — How long until you can buy it

**Live site: https://tejas-ml.github.io/finance-planner/**

Name an item and the price you already know. Say how much you’ll invest each month and the return you expect from stocks — or cash, or a mix. Northstar tells you how long until you can buy it.

## What it does

- **Time to buy** — months until your savings plus monthly investments, compounding at the expected annual return, cover the price
- **Ready date** — the calendar month that path lands
- **What the market adds** — how much of the pile is compounding vs. money you put in

The price you type is the price. Inflation is optional, and off by default, so a locked-in quote stays put.

Everything runs in the browser. Your numbers stay on your machine.

## How to use it

1. Enter current savings and how much you’ll invest each month
2. Pick where it’s invested (Cash / Mix / Stocks) or drag the expected annual return
3. Add items — a car, a wedding, a house down payment — with the price you know
4. Read **Ready in**, then drag the monthly amount to see the wait shrink

Demo data is included so the plan is readable on first open. **Reset demo** restores it.

Each item’s wait assumes that item is what the monthly investment is for.

## How the math works

Starting savings grow at the expected annual return, compounded monthly, and you add the monthly investment at the end of each month. The wait is the first month the balance is at least the item’s price.

If you turn inflation on, the price itself grows while you wait, so housing or tuition can take longer than a locked sticker price.

Figures are estimates, not advice.

## Run locally

Open `index.html` in a browser, or:

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).
