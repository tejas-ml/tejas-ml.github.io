(() => {
  const STORAGE_KEY = "northstar-plan-v2";
  const MAX_MONTHS = 600;

  const MIX = {
    cash: { ret: 3.5, label: "Cash" },
    mix: { ret: 6, label: "a mix" },
    stocks: { ret: 8, label: "stocks" },
  };

  const GOAL_TYPES = [
    { id: "house", icon: "🏠", label: "House", amount: 90000 },
    { id: "car", icon: "🚗", label: "Car", amount: 18000 },
    { id: "wedding", icon: "💍", label: "Wedding", amount: 32000 },
    { id: "tuition", icon: "🎓", label: "Tuition", amount: 48000 },
    { id: "custom", icon: "⭐", label: "Custom", amount: 2500 },
  ];

  const PRICE_COLORS = ["#c2613d", "#b08968", "#6b7f9a", "#7a5c8e", "#5a7a62"];

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  const $ = (id) => document.getElementById(id);

  const els = {
    savings: $("savings"),
    monthly: $("monthly"),
    returnSlider: $("return"),
    inflation: $("inflation"),
    returnLabel: $("return-label"),
    inflationLabel: $("inflation-label"),
    metricWait: $("metric-wait"),
    metricWaitNote: $("metric-wait-note"),
    metricDate: $("metric-date"),
    metricDateNote: $("metric-date-note"),
    metricGrowth: $("metric-growth"),
    metricGrowthNote: $("metric-growth-note"),
    contrib: $("contrib"),
    contribValue: $("contrib-value"),
    contribCaption: $("contrib-caption"),
    gapHint: $("gap-hint"),
    planSummary: $("plan-summary"),
    chartCaption: $("chart-caption"),
    goalGrid: $("goal-grid"),
    allocBody: $("alloc-body"),
    timeline: $("timeline"),
    dialog: $("goal-dialog"),
    form: $("goal-form"),
    goalName: $("goal-name"),
    goalAmount: $("goal-amount"),
    goalId: $("goal-id"),
    goalType: $("goal-type"),
    typeGrid: $("type-grid"),
    deleteGoal: $("delete-goal"),
    dialogTitle: $("dialog-title"),
  };

  let state = loadState();
  let nwChart;
  let mixChart;
  let dragTimer;

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `g-${Date.now()}-${Math.random()}`;
  }

  function demoState() {
    return {
      savings: 8500,
      contribution: 650,
      mix: "stocks",
      annualReturn: 8,
      inflation: 0,
      selectedId: null,
      goals: [
        { id: uid(), type: "car", name: "Used car", amount: 18000 },
        { id: uid(), type: "wedding", name: "Wedding", amount: 32000 },
        { id: uid(), type: "house", name: "House down payment", amount: 90000 },
      ],
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return demoState();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.goals)) return demoState();
      const goals = parsed.goals
        .map((g) => ({
          id: g.id || uid(),
          type: g.type || "custom",
          name: String(g.name || "Item").slice(0, 48),
          amount: Math.max(1, Number(g.amount) || 0),
        }))
        .filter((g) => g.amount > 0);
      return { ...demoState(), ...parsed, goals };
    } catch {
      return demoState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function typeMeta(type) {
    return GOAL_TYPES.find((t) => t.id === type) || GOAL_TYPES[4];
  }

  function num(el) {
    const n = Number(el.value);
    return Number.isFinite(n) ? n : 0;
  }

  function monthlyRate(annualPct) {
    return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
  }

  function inflate(amount, months, annualPct) {
    if (!months || Math.abs(annualPct) < 1e-12) return amount;
    return amount * Math.pow(1 + annualPct / 100, months / 12);
  }

  function futureValue(pv, pmt, months, r) {
    if (months <= 0) return pv;
    if (Math.abs(r) < 1e-12) return pv + pmt * months;
    const growth = Math.pow(1 + r, months);
    return pv * growth + pmt * ((growth - 1) / r);
  }

  function monthsToPrice(price, pv, pmt, annualReturnPct, inflationPct) {
    const target = Math.max(0, price);
    if (target <= pv + 1e-6) {
      return { months: 0, futureCost: target, wealth: pv, reachable: true };
    }

    const r = monthlyRate(annualReturnPct);
    const wealthAt = (n) => futureValue(pv, pmt, n, r);
    const costAt = (n) => inflate(target, n, inflationPct);

    for (let n = 1; n <= MAX_MONTHS; n += 1) {
      const wealth = wealthAt(n);
      const futureCost = costAt(n);
      if (wealth + 1e-6 >= futureCost) {
        return { months: n, futureCost, wealth, reachable: true };
      }
    }

    return {
      months: null,
      futureCost: costAt(MAX_MONTHS),
      wealth: wealthAt(MAX_MONTHS),
      reachable: false,
    };
  }

  function addMonthsDate(months) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + Math.max(0, months));
    return d;
  }

  function formatMonth(date) {
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  function formatDuration(months) {
    if (months == null) return `more than ${MAX_MONTHS / 12} years`;
    if (months <= 0) return "now";
    const years = Math.floor(months / 12);
    const rem = months % 12;
    const yPart = years === 0 ? "" : years === 1 ? "1 year" : `${years} years`;
    const mPart = rem === 0 ? "" : rem === 1 ? "1 month" : `${rem} months`;
    if (yPart && mPart) return `${yPart} ${mPart}`;
    return yPart || mPart;
  }

  function shortDuration(months) {
    if (months == null) return "50y+";
    if (months <= 0) return "now";
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (years && rem) return `${years}y ${rem}mo`;
    if (years) return years === 1 ? "1 year" : `${years} years`;
    return rem === 1 ? "1 mo" : `${rem} mo`;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function mixLabel(mix, annualReturn) {
    const preset = MIX[mix];
    if (preset && Math.abs(preset.ret - annualReturn) < 0.05) return preset.label;
    return `${annualReturn}% expected`;
  }

  function selectedGoal() {
    return (
      state.goals.find((g) => g.id === state.selectedId) ||
      state.goals[0] ||
      null
    );
  }

  function planFor(goal) {
    const result = monthsToPrice(
      goal.amount,
      state.savings,
      state.contribution,
      state.annualReturn,
      state.inflation
    );
    const contributed = state.contribution * (result.months || 0);
    const putIn = state.savings + contributed;
    const growth = result.reachable ? Math.max(0, result.wealth - putIn) : Math.max(0, result.wealth - putIn);
    const progress =
      goal.amount <= 0
        ? 1
        : Math.min(1, Math.max(0, state.savings / goal.amount));
    return {
      ...goal,
      ...result,
      contributed,
      putIn,
      growth,
      progress,
      readyDate: result.months == null ? null : addMonthsDate(result.months),
    };
  }

  function hydrateForm() {
    els.savings.value = state.savings;
    els.monthly.value = state.contribution;
    els.returnSlider.value = state.annualReturn;
    els.inflation.value = state.inflation;
    document.querySelectorAll(".seg").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.mix === state.mix));
    });
  }

  function readForm() {
    state.savings = Math.max(0, num(els.savings));
    state.contribution = Math.max(0, num(els.monthly));
    state.annualReturn = Number(els.returnSlider.value);
    state.inflation = Number(els.inflation.value);
  }

  function renderTypeGrid(selected) {
    els.typeGrid.innerHTML = GOAL_TYPES.map(
      (t) => `
      <button type="button" class="type-btn" data-type="${t.id}" aria-pressed="${t.id === selected}">
        <span>${t.icon}</span>
        <small>${t.label}</small>
      </button>`
    ).join("");
  }

  function openDialog(goal) {
    const isEdit = Boolean(goal);
    els.dialogTitle.textContent = isEdit ? "Edit item" : "Add an item";
    els.deleteGoal.hidden = !isEdit;
    const type = goal?.type || "custom";
    const meta = typeMeta(type);
    els.goalId.value = goal?.id || "";
    els.goalType.value = type;
    els.goalName.value = goal?.name || "";
    els.goalAmount.value = goal?.amount || meta.amount;
    renderTypeGrid(type);
    els.dialog.showModal();
    els.goalName.focus();
  }

  function saveGoalFromForm() {
    const type = els.goalType.value || "custom";
    const name = els.goalName.value.trim() || typeMeta(type).label;
    const amount = Math.max(1, Number(els.goalAmount.value) || 0);
    const existingId = els.goalId.value;
    if (existingId) {
      state.goals = state.goals.map((g) =>
        g.id === existingId ? { ...g, type, name, amount } : g
      );
      state.selectedId = existingId;
    } else {
      const id = uid();
      state.goals.push({ id, type, name, amount });
      state.selectedId = id;
    }
  }

  function waitClass(plan) {
    if (!plan.reachable) return "never";
    if (plan.months <= 0) return "now";
    if (plan.months <= 24) return "good";
    if (plan.months <= 60) return "mid";
    return "low";
  }

  function renderGoals(plans) {
    if (!plans.length) {
      els.goalGrid.innerHTML = `
        <div class="empty-goals">
          <p>No items yet. Add something you want and the price you know.</p>
        </div>`;
      return;
    }

    const selectedId = selectedGoal()?.id;
    els.goalGrid.innerHTML = plans
      .map((g) => {
        const meta = typeMeta(g.type);
        const cls = waitClass(g);
        const wait = g.reachable ? shortDuration(g.months) : "out of reach";
        const when = !g.reachable
          ? "Won’t reach this in 50 years"
          : g.months <= 0
            ? "You can buy this now"
            : `Ready ${formatMonth(g.readyDate)}`;
        const selected = g.id === selectedId;
        return `
          <article class="goal-card${selected ? " is-selected" : ""}" data-id="${g.id}">
            <button type="button" class="goal-select" data-id="${g.id}">
              <div class="goal-top">
                <span class="goal-icon">${meta.icon}</span>
                <span class="goal-odds ${cls}">${escapeHtml(wait)}</span>
              </div>
              <h3>${escapeHtml(g.name)}</h3>
              <p class="goal-amount">${money.format(g.amount)}</p>
              <p class="goal-date">${escapeHtml(when)}</p>
              <div class="goal-progress" style="--p:${g.progress}"><span></span></div>
              <div class="goal-meta">
                <span>${Math.round(g.progress * 100)}% saved</span>
                <span>${g.reachable && g.months > 0 ? money.format(g.growth) + " from returns" : "fixed price"}</span>
              </div>
            </button>
            <button type="button" class="text-btn goal-edit" data-edit="${g.id}">Edit</button>
          </article>`;
      })
      .join("");
  }

  function renderTimeline(plans) {
    const reachable = plans.filter((g) => g.reachable);
    if (!reachable.length) {
      els.timeline.innerHTML = `<p class="footnote">Add an item you can actually reach with this monthly amount.</p>`;
      return;
    }
    const maxM = Math.max(...reachable.map((g) => Math.max(g.months, 1)), 1);
    const marks = reachable
      .map((g) => {
        const left = 6 + (Math.max(g.months, 0) / maxM) * 88;
        const meta = typeMeta(g.type);
        return `
          <div class="tl-mark" style="left:${left}%">
            <div class="tl-dot"></div>
            <span>${meta.icon} ${escapeHtml(g.name)}</span>
            <small>${g.months <= 0 ? "now" : formatMonth(g.readyDate)}</small>
          </div>`;
      })
      .join("");
    els.timeline.innerHTML = `<div class="timeline-inner"><div class="timeline-line"></div>${marks}</div>`;
  }

  function renderAlloc(plans) {
    if (!plans.length) {
      els.allocBody.innerHTML = `<tr><td colspan="6">No items yet.</td></tr>`;
      return;
    }
    els.allocBody.innerHTML = plans
      .map((g) => {
        const wait = g.reachable ? formatDuration(g.months) : "50 years+";
        const ready = !g.reachable
          ? "—"
          : g.months <= 0
            ? "now"
            : formatMonth(g.readyDate);
        const putIn = g.reachable ? money.format(g.putIn) : money.format(g.putIn);
        const growth = g.reachable ? money.format(g.growth) : money.format(g.growth);
        return `
          <tr>
            <td>${typeMeta(g.type).icon} ${escapeHtml(g.name)}</td>
            <td>${money.format(g.amount)}</td>
            <td>${wait}</td>
            <td>${ready}</td>
            <td>${putIn}</td>
            <td>${growth}</td>
          </tr>`;
      })
      .join("");
  }

  function chartLabels(horizon) {
    const labels = [];
    const start = new Date();
    start.setDate(1);
    for (let m = 0; m <= horizon; m += 1) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + m);
      labels.push(
        d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      );
    }
    return labels;
  }

  function ensureCharts() {
    if (!window.Chart) return;
    Chart.defaults.font.family = "Outfit, sans-serif";
    Chart.defaults.color = "#6f675c";
    Chart.defaults.borderColor = "rgba(36,31,26,0.08)";
    Chart.defaults.plugins.legend.labels.boxWidth = 10;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;

    if (!nwChart) {
      nwChart = new Chart($("nw-chart"), {
        type: "line",
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { position: "bottom" },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${money.format(ctx.parsed.y)}`,
              },
            },
          },
          scales: {
            x: {
              ticks: { maxTicksLimit: 8, maxRotation: 0 },
              grid: { display: false },
            },
            y: {
              ticks: { callback: (v) => compact.format(v) },
              grid: { color: "rgba(36,31,26,0.05)" },
            },
          },
          elements: { point: { radius: 0 }, line: { tension: 0.28, borderWidth: 2 } },
        },
      });
    }

    if (!mixChart) {
      mixChart = new Chart($("hist-chart"), {
        type: "doughnut",
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom" },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: ${money.format(ctx.parsed)}`,
              },
            },
          },
          cutout: "62%",
        },
      });
    }
  }

  function updateCharts(plans, focus, r) {
    ensureCharts();
    if (!nwChart || !mixChart) return;

    const reachableMonths = plans.filter((p) => p.reachable).map((p) => p.months);
    let horizon = 36;
    if (focus?.reachable) {
      const m = Math.max(focus.months, 1);
      horizon = Math.max(18, Math.min(240, m + Math.max(6, Math.round(m * 0.3))));
    } else if (reachableMonths.length) {
      const m = Math.max(...reachableMonths);
      horizon = Math.max(24, Math.min(240, m + 6));
    }

    const labels = chartLabels(horizon);
    const wealth = [];
    for (let m = 0; m <= horizon; m += 1) {
      wealth.push(futureValue(state.savings, state.contribution, m, r));
    }

    const datasets = [
      {
        label: "Your invested balance",
        data: wealth,
        borderColor: "#3d5646",
        backgroundColor: "rgba(61, 86, 70, 0.12)",
        fill: true,
        borderWidth: 2.2,
        order: 1,
      },
    ];

    const chartItems = focus ? [focus] : plans;
    chartItems.forEach((g, i) => {
      const color = PRICE_COLORS[i % PRICE_COLORS.length];
      const prices = [];
      for (let m = 0; m <= horizon; m += 1) {
        prices.push(inflate(g.amount, m, state.inflation));
      }
      datasets.push({
        label: `${g.name} price`,
        data: prices,
        borderColor: color,
        backgroundColor: "transparent",
        borderDash: [6, 4],
        borderWidth: 2,
        fill: false,
        pointRadius: 0,
        order: 0,
      });
    });

    nwChart.data.labels = labels;
    nwChart.data.datasets = datasets;
    nwChart.update("none");

    if (!focus) {
      mixChart.data.labels = ["Add an item"];
      mixChart.data.datasets = [
        { data: [1], backgroundColor: ["#e8e0d2"], borderWidth: 0 },
      ];
      mixChart.update("none");
      return;
    }

    const savingsPart = Math.min(state.savings, focus.reachable ? focus.wealth : focus.amount);
    const contribPart = focus.contributed;
    const growthPart = Math.max(0, focus.growth);
    const stillShort = focus.reachable
      ? 0
      : Math.max(0, focus.futureCost - focus.wealth);

    const slices = [
      { label: "Already saved", value: savingsPart, color: "#3d5646" },
      { label: "You’ll add", value: contribPart, color: "#c2613d" },
      { label: "From returns", value: growthPart, color: "#b08968" },
    ];
    if (stillShort > 0) {
      slices.push({ label: "Still short after 50 years", value: stillShort, color: "#e4ddd0" });
    }

    mixChart.data.labels = slices.map((s) => s.label);
    mixChart.data.datasets = [
      {
        data: slices.map((s) => Math.max(0, s.value)),
        backgroundColor: slices.map((s) => s.color),
        borderWidth: 0,
        hoverOffset: 4,
      },
    ];
    mixChart.update("none");
  }

  function setContribSlider(current) {
    const max = Math.max(2500, current * 2, 500);
    els.contrib.max = String(Math.ceil(max / 25) * 25);
    els.contrib.value = String(Math.round(current));
    els.contribValue.textContent = money.format(current);
  }

  function render() {
    readForm();
    els.returnLabel.textContent = `${state.annualReturn}%`;
    els.inflationLabel.textContent = `${state.inflation}%`;
    const matchedMix = Object.entries(MIX).find(
      ([, v]) => Math.abs(v.ret - state.annualReturn) < 0.05
    );
    if (matchedMix) state.mix = matchedMix[0];
    document.querySelectorAll(".seg").forEach((btn) => {
      btn.setAttribute(
        "aria-pressed",
        String(Boolean(matchedMix) && btn.dataset.mix === matchedMix[0])
      );
    });
    if (!state.goals.some((g) => g.id === state.selectedId)) {
      state.selectedId = state.goals[0]?.id || null;
    }

    const r = monthlyRate(state.annualReturn);
    const plans = state.goals.map(planFor);
    const focus = plans.find((p) => p.id === state.selectedId) || null;

    setContribSlider(state.contribution);

    if (!focus) {
      els.metricWait.textContent = "—";
      els.metricWaitNote.textContent = "Add an item and the price you know";
      els.metricDate.textContent = "—";
      els.metricDateNote.textContent = "The month the path reaches the price";
      els.metricGrowth.textContent = money.format(0);
      els.metricGrowthNote.textContent = "What compounding adds on top of what you put in";
      els.gapHint.className = "hint";
      els.gapHint.textContent = "Add something you want. We’ll turn a monthly investment into a wait.";
      els.planSummary.textContent =
        "Put the item and the price you already know. Say how much you’ll invest each month and the annual return you expect from stocks — or cash, or a mix. Northstar compounds that path and tells you how long until you can buy it.";
      els.chartCaption.textContent = "Your invested balance growing toward a fixed price.";
    } else if (!focus.reachable) {
      els.metricWait.textContent = "50y+";
      els.metricWaitNote.textContent = `Even after 50 years, ${money.format(focus.wealth)} vs ${money.format(focus.futureCost)}`;
      els.metricDate.textContent = "Not yet";
      els.metricDateNote.textContent = "Raise the monthly amount, the return, or pick a smaller price";
      els.metricGrowth.textContent = money.format(focus.growth);
      els.metricGrowthNote.textContent = `Returns after 50 years, investing ${money.format(state.contribution)}/mo at ${state.annualReturn}%`;
      els.gapHint.className = "hint short";
      els.gapHint.textContent = `This path never catches ${focus.name}. Put more in each month, or expect a higher return.`;
      els.planSummary.textContent = `Investing ${money.format(state.contribution)} every month at ${state.annualReturn}% does not reach ${money.format(focus.amount)} for ${focus.name} within 50 years.`;
      els.chartCaption.textContent = state.inflation
        ? `Balance vs a price that rises ${state.inflation}% a year.`
        : "Balance vs the price you entered.";
    } else if (focus.months <= 0) {
      els.metricWait.textContent = "Now";
      els.metricWaitNote.textContent = `You already have ${money.format(state.savings)} for a ${money.format(focus.amount)} price`;
      els.metricDate.textContent = "Today";
      els.metricDateNote.textContent = `${focus.name} is already in reach`;
      els.metricGrowth.textContent = money.format(0);
      els.metricGrowthNote.textContent = "No wait, so no extra compounding needed";
      els.gapHint.className = "hint ok";
      els.gapHint.textContent = `You can buy ${focus.name} with savings on hand.`;
      els.planSummary.textContent = `You already have enough for ${focus.name} at ${money.format(focus.amount)}.`;
      els.chartCaption.textContent = "You’re already at the price.";
    } else {
      const ready = formatMonth(focus.readyDate);
      els.metricWait.textContent = formatDuration(focus.months);
      els.metricWaitNote.textContent = `Investing ${money.format(state.contribution)}/mo at ${state.annualReturn}% toward ${focus.name}`;
      els.metricDate.textContent = ready;
      els.metricDateNote.textContent = state.inflation
        ? `By then the price is ${money.format(focus.futureCost)} after ${state.inflation}% inflation`
        : `The month your balance covers ${money.format(focus.amount)}`;
      els.metricGrowth.textContent = money.format(focus.growth);
      els.metricGrowthNote.textContent = `You’ll put in ${money.format(focus.putIn)} · the rest is compounding`;
      els.gapHint.className = "hint ok";
      els.gapHint.textContent = `At ${money.format(state.contribution)}/mo and ${state.annualReturn}% from ${mixLabel(state.mix, state.annualReturn)}, ${focus.name} is in reach in ${formatDuration(focus.months)}.`;
      els.planSummary.textContent = `Put ${money.format(state.contribution)} each month into ${mixLabel(state.mix, state.annualReturn)} at ${state.annualReturn}% expected. ${focus.name} is ${money.format(focus.amount)} — you can buy it in ${formatDuration(focus.months)}, around ${ready}.`;
      els.chartCaption.textContent = state.inflation
        ? `Balance vs a price that rises ${state.inflation}% a year. They meet in ${ready}.`
        : `Your balance meets the ${money.format(focus.amount)} price in ${ready}.`;
    }

    renderGoals(plans);
    renderTimeline(plans);
    renderAlloc(plans);
    updateCharts(plans, focus, r);
    saveState();
  }

  function scheduleRender() {
    clearTimeout(dragTimer);
    dragTimer = setTimeout(() => render(), 40);
  }

  function bind() {
    ["savings", "monthly"].forEach((id) => {
      $(id).addEventListener("input", () => {
        if (id === "monthly") {
          state.contribution = Math.max(0, num(els.monthly));
          els.contribValue.textContent = money.format(state.contribution);
        }
        scheduleRender();
      });
    });

    els.returnSlider.addEventListener("input", () => {
      els.returnLabel.textContent = `${els.returnSlider.value}%`;
      scheduleRender();
    });
    els.inflation.addEventListener("input", () => {
      els.inflationLabel.textContent = `${els.inflation.value}%`;
      scheduleRender();
    });

    document.querySelectorAll(".seg").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.mix = btn.dataset.mix;
        state.annualReturn = MIX[state.mix].ret;
        els.returnSlider.value = state.annualReturn;
        hydrateForm();
        render();
      });
    });

    els.contrib.addEventListener("input", () => {
      state.contribution = Number(els.contrib.value);
      els.monthly.value = state.contribution;
      els.contribValue.textContent = money.format(state.contribution);
      scheduleRender();
    });

    $("add-goal").addEventListener("click", () => openDialog(null));
    $("close-dialog").addEventListener("click", () => els.dialog.close());
    $("cancel-goal").addEventListener("click", () => els.dialog.close());

    els.form.addEventListener("submit", (e) => {
      if (!els.goalName.value.trim() || !els.goalAmount.value) {
        e.preventDefault();
        return;
      }
      saveGoalFromForm();
      queueMicrotask(() => render());
    });

    $("delete-goal").addEventListener("click", () => {
      const id = els.goalId.value;
      state.goals = state.goals.filter((g) => g.id !== id);
      if (state.selectedId === id) state.selectedId = state.goals[0]?.id || null;
      els.dialog.close();
      render();
    });

    els.typeGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".type-btn");
      if (!btn) return;
      const type = btn.dataset.type;
      const meta = typeMeta(type);
      els.goalType.value = type;
      const currentName = els.goalName.value.trim();
      const names = GOAL_TYPES.map((t) => t.label);
      if (!currentName || names.includes(currentName)) els.goalName.value = meta.label;
      if (!els.goalAmount.value) els.goalAmount.value = meta.amount;
      renderTypeGrid(type);
    });

    els.goalGrid.addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit]");
      if (edit) {
        const goal = state.goals.find((g) => g.id === edit.dataset.edit);
        if (goal) openDialog(goal);
        return;
      }
      const select = e.target.closest("[data-id]");
      if (!select) return;
      state.selectedId = select.dataset.id;
      render();
    });

    $("reset-demo").addEventListener("click", () => {
      state = demoState();
      localStorage.removeItem(STORAGE_KEY);
      hydrateForm();
      render();
    });

    $("scroll-numbers").addEventListener("click", () => {
      $("numbers").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  hydrateForm();
  bind();
  render();
})();
