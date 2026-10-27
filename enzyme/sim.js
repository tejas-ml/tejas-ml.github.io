(() => {
  const C = {
    paper: "#f7f3ec",
    ink: "#2f2b25",
    ink2: "#5c564c",
    ink3: "#8a8378",
    line: "#ddd5c8",
    sage: "#5e7a64",
    sageDeep: "#3f5a47",
    sageLight: "#c5d4c0",
    clay: "#c57b52",
    claySoft: "#e8c4a8",
    slate: "#6e7f8d",
    gold: "#a6853a",
    uncat: "#a89880",
  };

  const molCanvas = document.getElementById("mol");
  const energyCanvas = document.getElementById("energy");
  const playBtn = document.getElementById("btn-play");
  const resetBtn = document.getElementById("btn-reset");
  const enzymeToggle = document.getElementById("enzyme-on");
  const speedInput = document.getElementById("speed");
  const phaseEl = document.getElementById("mol-phase");
  const eaEl = document.getElementById("ea-value");
  const deaEl = document.getElementById("dea-value");
  const dgEl = document.getElementById("dg-value");
  const rateEl = document.getElementById("rate-value");
  const eaHint = document.getElementById("ea-hint");

  const state = {
    playing: false,
    enzymeOn: true,
    mix: 1,
    progress: 0,
    speed: 1,
    time: 0,
    cycle: 0,
    reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };

  const G_REACT = 40;
  const G_PROD = 16;
  const DG = G_PROD - G_REACT;
  const RT = 2.479;

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function smoothstep(x) {
    x = clamp(x, 0, 1);
    return x * x * (3 - 2 * x);
  }
  function gauss(x, mu, sigma) {
    const z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z);
  }

  function sigmoid(x, mid, k) {
    return 1 / (1 + Math.exp(-k * (x - mid)));
  }

  function gUncat(x) {
    const base = G_REACT + DG * sigmoid(x, 0.64, 14);
    return base + 60 * gauss(x, 0.48, 0.125);
  }

  function gCat(x) {
    const base = G_REACT + DG * sigmoid(x, 0.64, 14);
    return (
      base +
      22 * gauss(x, 0.5, 0.1) -
      8.5 * gauss(x, 0.2, 0.065) -
      5 * gauss(x, 0.78, 0.07)
    );
  }

  function gMix(x, mix) {
    return lerp(gUncat(x), gCat(x), mix);
  }

  function sampleCurve(fn, n = 220) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const x = i / n;
      pts.push({ x, y: fn(x) });
    }
    return pts;
  }

  function peakOf(fn) {
    let max = -Infinity;
    let at = 0.5;
    for (let i = 0; i <= 400; i++) {
      const x = i / 400;
      const y = fn(x);
      if (y > max) {
        max = y;
        at = x;
      }
    }
    return { x: at, y: max };
  }

  function minIn(fn, a, b) {
    let min = Infinity;
    let at = a;
    for (let i = 0; i <= 200; i++) {
      const x = a + ((b - a) * i) / 200;
      const y = fn(x);
      if (y < min) {
        min = y;
        at = x;
      }
    }
    return { x: at, y: min };
  }

  const canvases = new Map();

  function syncCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvases.set(canvas, { ctx, w, h, dpr });
    return { ctx, w, h, dpr };
  }

  function enzymeRadius(theta, fit) {
    let r = 108;
    r += 15 * Math.sin(2 * theta + 0.55);
    r += 10 * Math.sin(3 * theta + 1.15);
    r += 6.5 * Math.cos(5 * theta + 0.2);
    r += 4.5 * Math.sin(7 * theta + 1.8);
    const d = Math.atan2(Math.sin(theta), Math.cos(theta));
    const cleft = Math.exp(-(d * d) / (0.2 + 0.12 * (1 - fit)));
    r -= (50 - 18 * fit) * cleft;
    r += fit * 10 * Math.exp(-(((Math.abs(d) - 0.58) / 0.18) ** 2));
    return r;
  }

  function drawEnzyme(ctx, cx, cy, fit, t) {
    const breath = 1 + 0.012 * Math.sin(t * 1.15);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(breath, breath);

    ctx.beginPath();
    const n = 96;
    for (let i = 0; i <= n; i++) {
      const theta = (i / n) * Math.PI * 2;
      const r = enzymeRadius(theta, fit);
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r * 0.92;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    const g = ctx.createRadialGradient(-36, -42, 16, 8, 10, 150);
    g.addColorStop(0, "#d7e4d3");
    g.addColorStop(0.42, "#8aa584");
    g.addColorStop(1, "#3f5a47");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(47, 58, 45, 0.45)";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(58 - 10 * fit, 2, 28 - 8 * fit, 22 - 4 * fit, 0.15, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(47, 70, 52, 0.28)";
    ctx.fill();

    const residues = [
      { a: -0.42, r: 0.78, col: "#c4a35a" },
      { a: 0.4, r: 0.8, col: "#6e8fa8" },
      { a: 0.02, r: 0.72, col: "#b56b58" },
    ];
    residues.forEach((res) => {
      const rr = enzymeRadius(res.a, fit) * res.r;
      ctx.beginPath();
      ctx.arc(Math.cos(res.a) * rr, Math.sin(res.a) * rr * 0.92, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = res.col;
      ctx.fill();
    });

    ctx.restore();
  }

  function moleculePair(ctx, x, y, split, rot, alpha, reacting) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);

    const gap = 15 + split * 38;
    const r1 = 15;
    const r2 = 13.5;

    if (split < 0.85) {
      ctx.beginPath();
      ctx.moveTo(-gap * 0.15, 0);
      ctx.lineTo(gap * 0.15, 0);
      ctx.strokeStyle = reacting ? C.gold : "#8a5340";
      ctx.lineWidth = 5 - split * 3;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(-gap, 0, r1, 0, Math.PI * 2);
    const g1 = ctx.createRadialGradient(-gap - 4, -4, 2, -gap, 0, r1);
    g1.addColorStop(0, "#f0c7a8");
    g1.addColorStop(1, C.clay);
    ctx.fillStyle = g1;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(gap, 0, r2, 0, Math.PI * 2);
    const g2 = ctx.createRadialGradient(gap - 3, -4, 2, gap, 0, r2);
    g2.addColorStop(0, "#c5d3dc");
    g2.addColorStop(1, C.slate);
    ctx.fillStyle = g2;
    ctx.fill();

    ctx.restore();
  }

  function solvent(ctx, w, h, t) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 28; i++) {
      const x = ((i * 97 + t * 8) % (w + 40)) - 20;
      const y = (i * 53 + Math.sin(t * 0.3 + i) * 8) % h;
      ctx.beginPath();
      ctx.arc(x, y, 1.6 + (i % 3) * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? C.sage : C.ink3;
      ctx.fill();
    }
    ctx.restore();
  }

  function phaseCopy(p, mix) {
    if (mix < 0.35) {
      if (p < 0.38) return "Thermal search";
      if (p < 0.62) return "High-energy collision";
      if (p < 0.9) return "Products form";
      return "Uncatalyzed path";
    }
    if (p < 0.02) return "Waiting to bind";
    if (p < 0.2) return "Substrate approach";
    if (p < 0.34) return "Induced fit · ES complex";
    if (p < 0.56) return "Transition state";
    if (p < 0.78) return "Product release";
    return "Free enzyme";
  }

  function molLayout(w, h, p, mix, t) {
    const cx = w * 0.4;
    const cy = h * 0.54;
    const fit = mix * smoothstep((p - 0.16) / 0.16) * (1 - smoothstep((p - 0.72) / 0.18));
    let sx;
    let sy;
    let split = 0;
    let rot = Math.sin(t * 0.7) * 0.08;
    let glow = 0;

    if (mix > 0.45) {
      const approach = smoothstep(p / 0.2);
      sx = lerp(w * 0.7, cx + 62, approach);
      sy = cy + Math.sin(t * 1.4) * 10 * (1 - approach);
      const after = smoothstep((p - 0.52) / 0.22);
      split = after;
      if (p > 0.7) {
        sx += (p - 0.7) * 220;
        sy += Math.sin((p - 0.7) * 8) * 18;
      }
      glow = mix * Math.exp(-(((p - 0.48) / 0.09) ** 2));
      rot = lerp(rot, 0.05, approach);
    } else {
      sx = w * 0.62 + Math.sin(t * 0.9) * 36;
      sy = cy + Math.cos(t * 0.7) * 28;
      split = smoothstep((p - 0.55) / 0.2);
      glow = Math.exp(-(((p - 0.5) / 0.08) ** 2));
      if (p > 0.62) {
        sx += (p - 0.62) * 160;
        sy -= (p - 0.62) * 40;
      }
    }

    return { cx, cy, fit, sx, sy, split, rot, glow };
  }

  function drawMol() {
    const { ctx, w, h } = syncCanvas(molCanvas);
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#f7f3ec");
    g.addColorStop(1, "#efe8dc");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    solvent(ctx, w, h, state.time);

    const s = Math.min(w / 560, h / 360, 1.2);
    const vw = w / s;
    const vh = h / s;
    const L = molLayout(vw, vh, state.progress, state.mix, state.time);

    ctx.save();
    ctx.scale(s, s);

    ctx.save();
    ctx.translate(L.cx + 8, L.cy + 18);
    ctx.scale(1, 0.35);
    ctx.beginPath();
    ctx.arc(0, 0, 118, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(47, 43, 37, 0.08)";
    ctx.fill();
    ctx.restore();

    drawEnzyme(ctx, L.cx, L.cy, L.fit, state.time);

    if (L.glow > 0.05) {
      const gx = state.mix > 0.45 ? L.cx + 58 : L.sx;
      const gy = state.mix > 0.45 ? L.cy : L.sy;
      const glow = ctx.createRadialGradient(gx, gy, 4, gx, gy, 70);
      glow.addColorStop(0, `rgba(198, 160, 70, ${0.42 * L.glow})`);
      glow.addColorStop(1, "rgba(198, 160, 70, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(gx - 80, gy - 80, 160, 160);
    }

    moleculePair(ctx, L.sx, L.sy, L.split, L.rot, 1, L.glow > 0.35);

    ctx.fillStyle = C.ink3;
    ctx.font = "500 12px Figtree, system-ui, sans-serif";
    ctx.fillText("enzyme", L.cx - 24, L.cy - 122);
    if (state.progress < 0.55) ctx.fillText("substrate", L.sx - 22, L.sy - 28);
    else ctx.fillText("products", L.sx - 18, L.sy - 28);
    ctx.restore();
  }

  function mapEnergy(w, h, x, y) {
    const narrow = w < 520;
    const padL = narrow ? 44 : 58;
    const padR = narrow ? 36 : 40;
    const padT = 28;
    const padB = narrow ? 48 : 42;
    const yMin = 8;
    const yMax = 112;
    return {
      X: padL + x * (w - padL - padR),
      Y: padT + ((yMax - y) / (yMax - yMin)) * (h - padT - padB),
      padL,
      padR,
      padT,
      padB,
    };
  }

  function strokePts(ctx, pts, w, h) {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const { X, Y } = mapEnergy(w, h, p.x, p.y);
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    });
  }

  function drawBrace(ctx, x, y1, y2, label, color, side = -1) {
    const top = Math.min(y1, y2);
    const bot = Math.max(y1, y2);
    const bx = x + side * 16;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(bx, top);
    ctx.lineTo(bx, bot);
    ctx.lineTo(x, bot);
    ctx.stroke();
    ctx.save();
    ctx.translate(bx + side * 10, (top + bot) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "500 11px Figtree, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }

  function drawEnergy() {
    const { ctx, w, h } = syncCanvas(energyCanvas);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, w, h);

    const mix = state.mix;
    const uncat = sampleCurve(gUncat);
    const cat = sampleCurve(gCat);
    const active = sampleCurve((x) => gMix(x, mix));
    const peakU = peakOf(gUncat);
    const peakC = peakOf(gCat);
    const peakA = peakOf((x) => gMix(x, mix));
    const es = minIn(gCat, 0.08, 0.35);
    const react = mapEnergy(w, h, 0, G_REACT);
    const prod = mapEnergy(w, h, 1, G_PROD);

    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const y = 20 + (i / 5) * (h - 70);
      ctx.beginPath();
      ctx.moveTo(58, y);
      ctx.lineTo(w - 24, y);
      ctx.stroke();
    }

    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = "rgba(47,43,37,0.18)";
    ctx.beginPath();
    ctx.moveTo(react.X, react.Y);
    ctx.lineTo(w - 36, react.Y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(prod.X, prod.Y);
    ctx.lineTo(w - 36, prod.Y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = C.uncat;
    ctx.lineWidth = 1.6;
    strokePts(ctx, uncat, w, h);
    ctx.stroke();

    ctx.strokeStyle = C.sage;
    ctx.lineWidth = 1.6;
    strokePts(ctx, cat, w, h);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const fillPts = active;
    ctx.beginPath();
    fillPts.forEach((p, i) => {
      const { X, Y } = mapEnergy(w, h, p.x, p.y);
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    });
    const last = mapEnergy(w, h, 1, fillPts[fillPts.length - 1].y);
    const first = mapEnergy(w, h, 0, fillPts[0].y);
    ctx.lineTo(last.X, h - first.padB);
    ctx.lineTo(first.X, h - first.padB);
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, 20, 0, h);
    fill.addColorStop(0, mix > 0.5 ? "rgba(94,122,100,0.16)" : "rgba(168,152,128,0.16)");
    fill.addColorStop(1, "rgba(247,243,236,0)");
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.strokeStyle = mix > 0.5 ? C.sageDeep : C.uncat;
    ctx.lineWidth = 2.7;
    ctx.lineJoin = "round";
    strokePts(ctx, active, w, h);
    ctx.stroke();

    const pU = mapEnergy(w, h, peakU.x, peakU.y);
    const pC = mapEnergy(w, h, peakC.x, peakC.y);
    const esM = mapEnergy(w, h, es.x, es.y);
    const narrow = w < 520;
    drawBrace(
      ctx,
      pU.X - (narrow ? 18 : 28),
      react.Y,
      pU.Y,
      narrow ? "Ea" : "Ea uncatalyzed",
      "rgba(168,152,128,0.9)",
      -1
    );
    if (mix > 0.2) {
      drawBrace(
        ctx,
        pC.X + (narrow ? 18 : 30),
        esM.Y,
        pC.Y,
        narrow ? "Ea′" : "Ea catalyzed",
        `rgba(63,90,71,${0.35 + 0.65 * mix})`,
        1
      );
    }

    const dgX = w - (narrow ? 18 : 26);
    ctx.strokeStyle = C.ink3;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(dgX, react.Y);
    ctx.lineTo(dgX, prod.Y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dgX - 4, react.Y);
    ctx.lineTo(dgX + 4, react.Y);
    ctx.moveTo(dgX - 4, prod.Y);
    ctx.lineTo(dgX + 4, prod.Y);
    ctx.stroke();
    ctx.fillStyle = C.ink2;
    ctx.font = "500 11px Figtree, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("ΔG", dgX - 8, (react.Y + prod.Y) / 2 + 3);
    ctx.textAlign = "left";

    ctx.fillStyle = C.ink3;
    ctx.font = "500 11px Figtree, system-ui, sans-serif";
    ctx.fillText("no enzyme", 64, 22);
    ctx.fillStyle = C.sageDeep;
    ctx.fillText("with enzyme", 140, 22);

    const labels = [
      { x: 0.04, y: G_REACT, t: "reactants" },
      { x: peakA.x, y: peakA.y, t: narrow ? "‡" : "‡  transition state", dy: -12 },
      { x: 1, y: G_PROD, t: "products", dy: 16, align: "right" },
    ];
    ctx.fillStyle = C.ink2;
    ctx.font = "500 12px Figtree, system-ui, sans-serif";
    labels.forEach((lb) => {
      const m = mapEnergy(w, h, lb.x, lb.y);
      ctx.textAlign = lb.align || "left";
      ctx.fillText(lb.t, m.X + (lb.align === "right" ? -2 : 4), m.Y + (lb.dy || -8));
    });
    ctx.textAlign = "left";

    ctx.fillStyle = C.ink3;
    ctx.font = "500 11px Figtree, system-ui, sans-serif";
    ctx.fillText("reaction coordinate →", 58, h - 16);
    ctx.save();
    ctx.translate(18, h * 0.58);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("free energy  G", 0, 0);
    ctx.restore();

    const marbleX = state.playing || state.progress > 0 ? state.progress : 0;
    const gy = gMix(marbleX, mix);
    const m = mapEnergy(w, h, marbleX, gy);
    ctx.beginPath();
    ctx.arc(m.X, m.Y, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#fbf8f2";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = mix > 0.5 ? C.sageDeep : C.clay;
    ctx.stroke();
  }

  function formatRate(ratio) {
    if (ratio < 1.2) return "1×";
    if (ratio < 20) return `${Math.round(ratio)}×`;
    const exp = Math.max(1, Math.round(Math.log10(ratio)));
    const sup = "⁰¹²³⁴⁵⁶⁷⁸⁹";
    return `10${String(exp)
      .split("")
      .map((d) => sup[Number(d)])
      .join("")}×`;
  }

  function updateReadouts() {
    const mix = state.mix;
    const peakA = peakOf((x) => gMix(x, mix));
    const start = mix > 0.5 ? minIn((x) => gMix(x, mix), 0.05, 0.35).y : G_REACT;
    const ea = peakA.y - start;
    const eaU = peakOf(gUncat).y - G_REACT;
    const drop = eaU - ea;
    const ratio = Math.exp(drop / RT);

    eaEl.textContent = ea.toFixed(0);
    deaEl.textContent = drop < 0.5 ? "0" : `−${drop.toFixed(0)}`;
    dgEl.textContent = "−24";
    rateEl.textContent = formatRate(ratio);
    eaHint.textContent = mix > 0.5 ? "From the ES well to ‡" : "Uncatalyzed barrier";
    phaseEl.textContent = phaseCopy(state.progress, mix);
  }

  function setPlaying(on) {
    state.playing = on;
    playBtn.setAttribute("aria-pressed", on ? "true" : "false");
    playBtn.innerHTML = on
      ? `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="4.5" width="3.4" height="11" rx="0.8" fill="currentColor"/><rect x="11.6" y="4.5" width="3.4" height="11" rx="0.8" fill="currentColor"/></svg> Pause`
      : `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4.5v11l9-5.5-9-5.5z" fill="currentColor"/></svg> Run reaction`;
  }

  function reset() {
    state.playing = false;
    state.progress = 0;
    state.cycle = 0;
    setPlaying(false);
  }

  playBtn.addEventListener("click", () => {
    setPlaying(!state.playing);
  });
  resetBtn.addEventListener("click", reset);
  enzymeToggle.addEventListener("change", () => {
    state.enzymeOn = enzymeToggle.checked;
  });
  speedInput.addEventListener("input", () => {
    state.speed = Number(speedInput.value);
  });

  window.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, button, select")) return;
    if (e.code === "Space") {
      e.preventDefault();
      setPlaying(!state.playing);
    }
    if (e.key === "e" || e.key === "E") {
      enzymeToggle.checked = !enzymeToggle.checked;
      state.enzymeOn = enzymeToggle.checked;
    }
    if (e.key === "r" || e.key === "R") reset();
  });

  new ResizeObserver(() => {
    drawMol();
    drawEnergy();
  }).observe(document.body);

  [molCanvas, energyCanvas].forEach((c) => {
    new ResizeObserver(() => {
      drawMol();
      drawEnergy();
    }).observe(c);
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.time += dt;

    const mixTarget = state.enzymeOn ? 1 : 0;
    const k = state.reduced ? 1 : 3.2;
    state.mix += (mixTarget - state.mix) * (1 - Math.exp(-dt * k));
    if (Math.abs(state.mix - mixTarget) < 0.002) state.mix = mixTarget;

    if (state.playing) {
      const base = state.mix > 0.45 ? 0.22 : 0.07;
      state.progress += dt * state.speed * base;
      if (state.progress >= 1) {
        state.progress = 0;
        state.cycle += 1;
      }
    }

    drawMol();
    drawEnergy();
    updateReadouts();
    requestAnimationFrame(frame);
  }

  function start() {
    const params = new URLSearchParams(location.search);
    setPlaying(params.has("play"));
    if (params.has("t")) state.progress = clamp(Number(params.get("t")) || 0, 0, 1);
    updateReadouts();
    requestAnimationFrame(frame);
  }

  start();
})();
