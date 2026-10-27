/* Portfolio diversity calculator — UI + scoring engine. */
(function () {
  "use strict";

  // ---------- State ----------
  const holdings = []; // { t, n, sec, type, ac, b, sw, pct }
  const byTicker = Object.fromEntries(STOCKS.map(s => [s.t, s]));

  // ---------- Elements ----------
  const $ = id => document.getElementById(id);
  const searchEl = $("search");
  const suggEl = $("suggestions");
  const holdingsEl = $("holdings");
  const totalEl = $("total");
  const totalWarnEl = $("totalWarn");
  const countEl = $("count");

  // ================================================================
  //  Search / autocomplete
  // ================================================================
  let activeIdx = -1;
  let currentMatches = [];

  function search(qRaw) {
    const q = qRaw.trim().toLowerCase();
    if (!q) return [];
    const already = new Set(holdings.map(h => h.t));
    const scored = [];
    for (const s of STOCKS) {
      if (already.has(s.t)) continue;
      const tk = s.t.toLowerCase();
      const nm = s.n.toLowerCase();
      let score = -1;
      if (tk === q) score = 100;
      else if (tk.startsWith(q)) score = 90;
      else if (nm.startsWith(q)) score = 70;
      else if (tk.includes(q)) score = 50;
      else if (nm.includes(q)) score = 40;
      if (score >= 0) scored.push({ s, score });
    }
    scored.sort((a, b) => b.score - a.score || a.s.t.localeCompare(b.s.t));
    return scored.slice(0, 8).map(x => x.s);
  }

  function renderSuggestions(matches) {
    currentMatches = matches;
    activeIdx = -1;
    if (!matches.length) {
      const q = searchEl.value.trim();
      suggEl.innerHTML = q
        ? '<div class="sugg"><span class="none">No match for “' + escapeHtml(q) +
          '”. Try a ticker like VOO or a name like Apple.</span></div>'
        : "";
      suggEl.classList.toggle("open", !!q);
      return;
    }
    suggEl.innerHTML = matches.map((s, i) =>
      '<div class="sugg" data-i="' + i + '">' +
        '<span class="tkr">' + s.t + '</span>' +
        '<span class="nm">' + escapeHtml(s.n) + '</span>' +
        '<span class="tag">' + (s.type === "etf" ? "ETF" : "Stock") + '</span>' +
      '</div>'
    ).join("");
    suggEl.classList.add("open");
  }

  searchEl.addEventListener("input", () => renderSuggestions(search(searchEl.value)));
  searchEl.addEventListener("focus", () => { if (searchEl.value.trim()) renderSuggestions(search(searchEl.value)); });

  searchEl.addEventListener("keydown", e => {
    if (!suggEl.classList.contains("open")) return;
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const pick = activeIdx >= 0 ? currentMatches[activeIdx] : currentMatches[0];
      if (pick) addHolding(pick.t);
    } else if (e.key === "Escape") closeSuggestions();
  });

  function move(dir) {
    const items = suggEl.querySelectorAll(".sugg[data-i]");
    if (!items.length) return;
    activeIdx = (activeIdx + dir + items.length) % items.length;
    items.forEach((el, i) => el.classList.toggle("active", i === activeIdx));
    items[activeIdx].scrollIntoView({ block: "nearest" });
  }

  suggEl.addEventListener("mousedown", e => {
    const row = e.target.closest(".sugg[data-i]");
    if (!row) return;
    e.preventDefault();
    addHolding(currentMatches[+row.dataset.i].t);
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".search-box")) closeSuggestions();
  });

  function closeSuggestions() {
    suggEl.classList.remove("open");
    suggEl.innerHTML = "";
    activeIdx = -1;
  }

  // ================================================================
  //  Holdings
  // ================================================================
  function addHolding(ticker) {
    const s = byTicker[ticker];
    if (!s || holdings.some(h => h.t === ticker)) return;
    // New positions come in "unset" (touched=false) and are split equally with
    // every other unset position. The 100 is just the raw default before the
    // equal-distribution rebalance normalizes it.
    holdings.push(Object.assign({}, s, { pct: 100, touched: false }));
    rebalance();
    searchEl.value = "";
    closeSuggestions();
    searchEl.focus();
    render();
  }

  function removeHolding(ticker) {
    const i = holdings.findIndex(h => h.t === ticker);
    if (i >= 0) holdings.splice(i, 1);
    rebalance();
    render();
  }

  // Positions the user hasn't typed a value into share the leftover allocation
  // equally, so an all-default portfolio is always evenly weighted.
  function rebalance() {
    const untouched = holdings.filter(h => !h.touched);
    if (!untouched.length) return;
    const usedByTouched = holdings
      .filter(h => h.touched)
      .reduce((a, h) => a + h.pct, 0);
    const remaining = Math.max(0, 100 - usedByTouched);
    const each = round(remaining / untouched.length);
    untouched.forEach(h => h.pct = each);
  }

  function renderHoldings() {
    if (!holdings.length) {
      holdingsEl.innerHTML = '<div class="empty">No positions yet. Search above to add your first stock or ETF.</div>';
      return;
    }
    holdingsEl.innerHTML = holdings.map(h =>
      '<div class="row">' +
        '<div class="info">' +
          '<div class="tkr">' + h.t + ' <span style="color:var(--muted);font-weight:400">' + escapeHtml(h.n) + '</span></div>' +
          '<div class="meta">' + (h.type === "etf" ? "ETF" : "Stock") + ' · ' + h.sec + ' · ' + ASSET_LABELS[h.ac] + '</div>' +
        '</div>' +
        '<div class="pct">' +
          '<input type="number" min="0" max="100" step="0.5" value="' + h.pct + '" data-t="' + h.t + '" />' +
          '<span>%</span>' +
        '</div>' +
        '<button class="del" data-del="' + h.t + '" title="Remove">×</button>' +
      '</div>'
    ).join("");

    holdingsEl.querySelectorAll('input[data-t]').forEach(inp => {
      inp.addEventListener("input", () => {
        const h = holdings.find(x => x.t === inp.dataset.t);
        if (!h) return;
        // A typed value pins this position; the rest re-split what's left.
        h.touched = true;
        h.pct = clamp(parseFloat(inp.value) || 0, 0, 100);
        rebalance();
        // Reflect rebalanced weights in the other inputs without disturbing the
        // one being typed into (keeps focus + caret in place).
        holdingsEl.querySelectorAll('input[data-t]').forEach(other => {
          if (other === inp) return;
          const oh = holdings.find(x => x.t === other.dataset.t);
          if (oh) other.value = oh.pct;
        });
        updateTotals();
        score();
      });
    });
    holdingsEl.querySelectorAll('button[data-del]').forEach(btn => {
      btn.addEventListener("click", () => removeHolding(btn.dataset.del));
    });
  }

  function updateTotals() {
    const total = holdings.reduce((a, h) => a + h.pct, 0);
    totalEl.textContent = round(total) + "%";
    countEl.textContent = holdings.length + (holdings.length === 1 ? " position" : " positions");
    const diff = Math.abs(total - 100);
    totalWarnEl.textContent = holdings.length && diff > 0.5
      ? (total > 100 ? "(over 100% — will be normalized)" : "(under 100% — will be normalized)")
      : "";
  }

  // ================================================================
  //  Scoring engine
  // ================================================================
  //
  // Three sub-scores, each 0..1, combined into a 0..100 diversity score:
  //   1. Position spread  (weight .45) — effective number of underlying
  //      positions via a breadth-adjusted Herfindahl index. ETFs count as
  //      many small positions, so a single broad ETF scores well.
  //   2. Sector spread    (weight .30) — effective number of sectors after
  //      decomposing each holding into its sector weights.
  //   3. Asset-class spread (weight .25) — effective number of asset classes
  //      (equity / intl / bonds / real estate / commodities / crypto).
  //
  function computeScore() {
    const total = holdings.reduce((a, h) => a + h.pct, 0);
    if (!holdings.length || total <= 0) return null;

    // Normalized weights (fractions summing to 1).
    const W = holdings.map(h => ({ h, w: h.pct / total }));

    // --- 1. Position spread (breadth-adjusted HHI) ---
    // An equal-weighted ETF of b holdings at weight w contributes w^2 / b to
    // the position-level Herfindahl index; a single stock contributes w^2.
    let hhiPos = 0;
    for (const { h, w } of W) hhiPos += (w * w) / Math.max(1, h.b);
    const effPositions = hhiPos > 0 ? 1 / hhiPos : 1;
    // Map to 0..1 on a log scale: ~50 effective positions ≈ fully spread.
    const posScore = clamp(Math.log(effPositions) / Math.log(50), 0, 1);

    // --- 2. Sector spread ---
    const sectorExp = {};
    for (const { h, w } of W) {
      const sw = h.sw || { [h.sec]: 1 };
      for (const [sec, frac] of Object.entries(sw)) {
        sectorExp[sec] = (sectorExp[sec] || 0) + w * frac;
      }
    }
    let hhiSec = 0;
    for (const v of Object.values(sectorExp)) hhiSec += v * v;
    const effSectors = hhiSec > 0 ? 1 / hhiSec : 1;
    // ~8 effective sectors ≈ fully spread.
    const secScore = clamp(effSectors / 8, 0, 1);

    // --- 3. Asset-class spread ---
    const acExp = {};
    for (const { h, w } of W) acExp[h.ac] = (acExp[h.ac] || 0) + w;
    let hhiAc = 0;
    for (const v of Object.values(acExp)) hhiAc += v * v;
    const effClasses = hhiAc > 0 ? 1 / hhiAc : 1;
    // 1 class -> 0, 3+ balanced classes -> 1.
    const acScore = clamp((effClasses - 1) / (3 - 1), 0, 1);

    const composite = 0.45 * posScore + 0.30 * secScore + 0.25 * acScore;
    const finalScore = Math.round(composite * 100);

    return {
      score: finalScore,
      posScore, secScore, acScore,
      effPositions, effSectors, effClasses,
      sectorExp, acExp,
      largest: W.reduce((m, x) => x.w > m.w ? x : m, W[0])
    };
  }

  // ================================================================
  //  Render score panel
  // ================================================================
  const CIRC = 2 * Math.PI * 94; // gauge circumference

  function ratingFor(score) {
    if (score >= 80) return { label: "Excellent diversification", color: "var(--good)" };
    if (score >= 60) return { label: "Well diversified", color: "var(--good)" };
    if (score >= 40) return { label: "Moderately diversified", color: "var(--mid)" };
    if (score >= 20) return { label: "Concentrated", color: "var(--bad)" };
    return { label: "Highly concentrated", color: "var(--bad)" };
  }

  function metricColor(v) {
    return v >= 0.66 ? "var(--good)" : v >= 0.33 ? "var(--mid)" : "var(--bad)";
  }

  function score() {
    const r = computeScore();
    const arc = $("arc");

    if (!r) {
      $("scoreNum").textContent = "–";
      arc.style.stroke = "var(--accent)";
      arc.style.strokeDashoffset = CIRC;
      $("ratingText").textContent = "Add positions to begin";
      $("ratingSub").textContent = "";
      setMetric("m1", "m1v", 0, "");
      setMetric("m2", "m2v", 0, "");
      setMetric("m3", "m3v", 0, "");
      $("sectors").innerHTML = "";
      $("tips").innerHTML = "";
      return;
    }

    const rating = ratingFor(r.score);
    $("scoreNum").textContent = r.score;
    $("scoreNum").style.color = rating.color;
    arc.style.stroke = rating.color;
    arc.style.strokeDashoffset = CIRC * (1 - r.score / 100);
    $("ratingText").textContent = rating.label;
    $("ratingText").style.color = rating.color;
    $("ratingSub").textContent =
      "≈ " + fmt(r.effPositions) + " effective positions · " +
      fmt(r.effSectors) + " sectors · " + fmt(r.effClasses) + " asset classes";

    setMetric("m1", "m1v", r.posScore, fmt(r.effPositions) + " eff. positions");
    setMetric("m2", "m2v", r.secScore, fmt(r.effSectors) + " eff. sectors");
    setMetric("m3", "m3v", r.acScore, fmt(r.effClasses) + " eff. classes");

    renderSectorBars(r.sectorExp);
    renderTips(r);
  }

  function setMetric(barId, valId, v, label) {
    const bar = $(barId);
    bar.style.width = Math.round(v * 100) + "%";
    bar.style.background = metricColor(v);
    $(valId).textContent = label;
  }

  function renderSectorBars(sectorExp) {
    const entries = Object.entries(sectorExp).sort((a, b) => b[1] - a[1]);
    const max = entries.length ? entries[0][1] : 1;
    $("sectors").innerHTML =
      '<div class="lab" style="display:flex;justify-content:space-between;font-size:13px;margin:6px 0 10px;color:var(--muted)">' +
        '<span>Exposure by sector</span></div>' +
      entries.map(([sec, v]) =>
        '<div class="srow">' +
          '<span class="sname">' + sec + '</span>' +
          '<span class="sbar"><i style="width:' + (v / max * 100) + '%"></i></span>' +
          '<span class="sval">' + Math.round(v * 100) + '%</span>' +
        '</div>'
      ).join("");
  }

  function renderTips(r) {
    const tips = [];
    const big = r.largest;
    if (big.w > 0.4) {
      tips.push("Your largest position, <b>" + big.h.t + "</b>, is " + Math.round(big.w * 100) +
        "% of the portfolio. A single position above ~40% drives most of your risk.");
    }
    if (r.effSectors < 3) {
      const top = Object.entries(r.sectorExp).sort((a, b) => b[1] - a[1])[0];
      tips.push("Heavy concentration in <b>" + top[0] + "</b>. Adding other sectors would lift your sector spread.");
    }
    if (r.effClasses < 1.3) {
      tips.push("Everything is in one asset class. Even a small allocation to bonds, international, or real estate raises diversification meaningfully.");
    }
    if (r.acScore >= 0.5 && r.secScore >= 0.6 && r.posScore >= 0.6) {
      tips.push("Nicely balanced across positions, sectors, and asset classes. 👍");
    }
    if (!tips.length) {
      tips.push("Solid spread. To push higher, balance weights more evenly or add an underrepresented asset class.");
    }
    $("tips").innerHTML = tips.map(t => "<li>" + t + "</li>").join("");
  }

  // ================================================================
  //  Toolbar actions
  // ================================================================
  $("normalize").addEventListener("click", () => {
    const total = holdings.reduce((a, h) => a + h.pct, 0);
    if (total > 0) holdings.forEach(h => h.pct = round(h.pct / total * 100));
    render();
  });
  $("equal").addEventListener("click", () => {
    if (!holdings.length) return;
    // Clear all pins and split evenly.
    holdings.forEach(h => h.touched = false);
    rebalance();
    render();
  });
  $("clear").addEventListener("click", () => {
    holdings.length = 0;
    render();
  });

  // ================================================================
  //  Helpers
  // ================================================================
  function render() { renderHoldings(); updateTotals(); score(); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function round(v) { return Math.round(v * 10) / 10; }
  function fmt(v) { return v >= 10 ? Math.round(v) : (Math.round(v * 10) / 10); }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ================================================================
  //  Theme toggle (light default, dark optional; persisted)
  // ================================================================
  const themeToggle = $("themeToggle");
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("pdc-theme", t); } catch (e) {}
    $("themeIcon").textContent = t === "dark" ? "☀️" : "🌙";
    $("themeLabel").textContent = t === "dark" ? "Light" : "Dark";
  }
  themeToggle.addEventListener("click", () => {
    setTheme(currentTheme() === "dark" ? "light" : "dark");
  });
  setTheme(currentTheme()); // sync button label with the pre-paint theme

  // Initial paint.
  render();
})();
