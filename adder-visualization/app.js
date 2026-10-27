const NS = "http://www.w3.org/2000/svg";
const WIDTH = 4;
const MAX = (1 << WIDTH) - 1;
const WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven",
  "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
  "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "twenty-one",
  "twenty-two", "twenty-three", "twenty-four", "twenty-five", "twenty-six",
  "twenty-seven", "twenty-eight", "twenty-nine", "thirty", "thirty-one",
];

const state = {
  a: 11,
  b: 5,
  selected: 0,
  tracing: false,
  reveal: WIDTH,
  flowBit: -1,
};

function clamp(n) {
  return Math.max(0, Math.min(MAX, n | 0));
}

function toBits(n, width = WIDTH) {
  return Array.from({ length: width }, (_, i) => (n >> i) & 1);
}

function bitString(n, width = WIDTH) {
  return toBits(n, width).slice().reverse().join("");
}

function xor(a, b) {
  return a ^ b;
}

function and(a, b) {
  return a & b;
}

function or(a, b) {
  return a | b;
}

function fullAdder(a, b, cin) {
  const p = xor(a, b);
  const g = and(a, b);
  const sum = xor(p, cin);
  const pand = and(p, cin);
  const cout = or(g, pand);
  return { a, b, cin, p, g, sum, pand, cout };
}

function compute(a, b) {
  const aBits = toBits(a);
  const bBits = toBits(b);
  const stages = [];
  let cin = 0;
  for (let i = 0; i < WIDTH; i += 1) {
    const fa = fullAdder(aBits[i], bBits[i], cin);
    stages.push(fa);
    cin = fa.cout;
  }
  const sumBits = stages.map((s) => s.sum);
  const total = a + b;
  return { stages, cout: cin, sumBits, total };
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "className") node.setAttribute("class", value);
    else node.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function cls(...parts) {
  return parts.filter(Boolean).join(" ");
}

function sig(on) {
  return on ? "high" : "low";
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function drawAnd(x, y, high) {
  const g = el("g", { transform: `translate(${x} ${y})` });
  g.appendChild(
    el("path", {
      className: cls("gate-body", sig(high)),
      d: "M 0 0 H 26 A 20 20 0 0 1 26 40 H 0 Z",
    })
  );
  return { g, in1: [x, y + 10], in2: [x, y + 30], out: [x + 46, y + 20] };
}

function drawOr(x, y, high) {
  const g = el("g", { transform: `translate(${x} ${y})` });
  g.appendChild(
    el("path", {
      className: cls("gate-body", sig(high)),
      d: "M 2 0 C 18 0 34 8 50 20 C 34 32 18 40 2 40 C 14 20 14 20 2 0 Z",
    })
  );
  return { g, in1: [x + 8, y + 10], in2: [x + 8, y + 30], out: [x + 50, y + 20] };
}

function drawXor(x, y, high) {
  const g = el("g", { transform: `translate(${x} ${y})` });
  g.appendChild(
    el("path", {
      fill: "none",
      stroke: high ? "#9a3f18" : "#1c1712",
      "stroke-width": 1.6,
      d: "M -7 0 C 5 12 5 28 -7 40",
    })
  );
  g.appendChild(
    el("path", {
      className: cls("gate-body", sig(high)),
      d: "M 4 0 C 20 0 36 8 52 20 C 36 32 20 40 4 40 C 16 20 16 20 4 0 Z",
    })
  );
  return { g, in1: [x + 2, y + 10], in2: [x + 2, y + 30], out: [x + 52, y + 20] };
}

function wire(parent, d, high, flow = false) {
  parent.appendChild(
    el("path", { className: cls("wire", sig(high), flow && "flow"), d })
  );
}

function hwire(parent, x1, x2, y, high, flow = false) {
  wire(parent, `M ${x1} ${y} H ${x2}`, high, flow);
}

function vwire(parent, x, y1, y2, high, flow = false) {
  wire(parent, `M ${x} ${y1} V ${y2}`, high, flow);
}

function manhattan(parent, points, high, flow = false) {
  const [start, ...rest] = points;
  let d = `M ${start[0]} ${start[1]}`;
  for (const [x, y] of rest) d += ` L ${x} ${y}`;
  wire(parent, d, high, flow);
}

function dot(parent, x, y, high) {
  parent.appendChild(
    el("circle", {
      className: cls("pin-dot", sig(high)),
      cx: x,
      cy: y,
      r: 4,
    })
  );
}

function text(parent, x, y, value, className = "label", anchor = "start") {
  parent.appendChild(
    el(
      "text",
      { x, y, className, "text-anchor": anchor, "dominant-baseline": "middle" },
      [value]
    )
  );
}

function renderOperands(model) {
  const mount = document.getElementById("operand-mount");
  const rows = [
    { key: "a", letter: "A", value: state.a, bits: toBits(state.a), editable: true },
    { key: "b", letter: "B", value: state.b, bits: toBits(state.b), editable: true },
    {
      key: "s",
      letter: "S",
      value: model.total,
      bits: [...model.sumBits, model.cout],
      editable: false,
    },
  ];

  mount.replaceChildren(
    ...rows.map((row) => {
      const wrap = document.createElement("div");
      wrap.className = cls("operand-row", row.key === "s" && "sum-row");

      const letter = document.createElement("div");
      letter.className = "op-letter";
      letter.innerHTML = row.key === "s" ? "S" : row.letter;
      wrap.appendChild(letter);

      const bits = document.createElement("div");
      bits.className = "bits";
      const places = row.key === "s" ? [16, 8, 4, 2, 1] : [8, 4, 2, 1];
      const displayBits = row.bits.slice().reverse();
      displayBits.forEach((bit, idx) => {
        const msbIndex = displayBits.length - 1 - idx;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = cls("bit", bit && "on", !row.editable && "sum", msbIndex === WIDTH && "carry-out");
        btn.disabled = !row.editable;
        const place = places[idx];
        btn.setAttribute(
          "aria-label",
          row.editable
            ? `${row.letter} bit ${msbIndex}, place ${place}, currently ${bit}. Click to toggle.`
            : `${msbIndex === WIDTH ? "Carry out" : `Sum bit ${msbIndex}`}, place ${place}, value ${bit}`
        );
        if (row.editable) btn.setAttribute("aria-pressed", bit ? "true" : "false");
        btn.innerHTML = `<span class="place">${msbIndex === WIDTH ? "Cout" : place}</span><span class="val">${bit}</span>`;
        if (row.editable) {
          btn.addEventListener("click", () => {
            state[row.key] = clamp(state[row.key] ^ (1 << msbIndex));
            render();
          });
        }
        bits.appendChild(btn);
      });
      wrap.appendChild(bits);

      const stepper = document.createElement("div");
      stepper.className = "stepper";
      if (row.editable) {
        const minus = document.createElement("button");
        minus.type = "button";
        minus.setAttribute("aria-label", `Decrease ${row.letter}`);
        minus.textContent = "−";
        minus.disabled = row.value <= 0;
        minus.addEventListener("click", () => {
          state[row.key] = clamp(state[row.key] - 1);
          render();
        });
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = String(MAX);
        input.value = String(row.value);
        input.setAttribute("aria-label", `${row.letter} decimal value`);
        input.addEventListener("change", () => {
          state[row.key] = clamp(Number(input.value));
          render();
        });
        const plus = document.createElement("button");
        plus.type = "button";
        plus.setAttribute("aria-label", `Increase ${row.letter}`);
        plus.textContent = "+";
        plus.disabled = row.value >= MAX;
        plus.addEventListener("click", () => {
          state[row.key] = clamp(state[row.key] + 1);
          render();
        });
        const word = document.createElement("span");
        word.className = "word";
        word.textContent = WORDS[row.value];
        stepper.append(minus, input, plus, word);
      } else {
        const input = document.createElement("input");
        input.value = String(row.value);
        input.readOnly = true;
        input.setAttribute("aria-label", "Sum decimal value");
        const word = document.createElement("span");
        word.className = "word";
        word.textContent = WORDS[row.value] || String(row.value);
        stepper.append(input, word);
      }
      wrap.appendChild(stepper);
      return wrap;
    })
  );
}

function renderHero(model) {
  document.getElementById("hero-eq").innerHTML =
    `${state.a} <span class="plus">+</span> ${state.b} <span class="eq">=</span> <span class="sum">${model.total}</span>`;
  document.getElementById("hero-words").textContent =
    `${bitString(state.a)}₂  +  ${bitString(state.b)}₂  =  ${model.cout}${bitString(model.total & MAX)}₂`;
}

function renderColumn(model) {
  const mount = document.getElementById("column-mount");
  const places = ["16", "8", "4", "2", "1"];
  const aBits = [null, ...toBits(state.a).slice().reverse()];
  const bBits = [null, ...toBits(state.b).slice().reverse()];
  const sumBits = [model.cout, ...model.sumBits.slice().reverse()];
  const carries = [...model.stages.map((s) => s.cout).reverse(), null];

  const grid = (kind, op, cells) => {
    const row = document.createElement("div");
    row.className = cls("column-row", kind);
    const opCell = document.createElement("div");
    opCell.className = "cell op";
    opCell.textContent = op;
    row.appendChild(opCell);
    cells.forEach((value) => {
      const cell = document.createElement("div");
      cell.className = cls("cell", value === 1 && "on");
      cell.textContent = value === null || value === undefined ? "" : String(value);
      row.appendChild(cell);
    });
    return row;
  };

  const table = document.createElement("div");
  table.className = "column";
  table.append(
    grid("places", "", places),
    grid("carries", "C", carries),
    grid("addend", "A", aBits),
    grid("addend", "+", bBits),
    grid("total", "S", sumBits)
  );
  mount.replaceChildren(table);
}

function renderChain(model) {
  const mount = document.getElementById("chain-mount");
  const svg = el("svg", {
    className: "schematic",
    viewBox: "0 0 1080 300",
    role: "img",
    "aria-label": `Ripple-carry chain adding ${state.a} and ${state.b}`,
  });

  const modules = [
    { i: 3, x: 150 },
    { i: 2, x: 390 },
    { i: 1, x: 630 },
    { i: 0, x: 870 },
  ];

  text(svg, 40, 18, "MSB", "label");
  text(svg, 1070, 18, "LSB", "label", "end");
  text(svg, 28, 148, "Cout", "label", "start");
  text(svg, 1048, 148, "Cin", "label", "start");

  modules.forEach(({ i, x }, idx) => {
    const fa = model.stages[i];
    const dim = state.reveal < i;
    const a = dim ? 0 : fa.a;
    const b = dim ? 0 : fa.b;
    const cin = dim ? 0 : fa.cin;
    const sum = dim ? 0 : fa.sum;
    const cout = dim ? 0 : fa.cout;
    const y = 110;
    const w = 150;
    const h = 108;
    const selected = state.selected === i;

    const aX = x + 44;
    const bX = x + 106;
    vwire(svg, aX, 48, y, a);
    vwire(svg, bX, 48, y, b);
    dot(svg, aX, 48, a);
    dot(svg, bX, 48, b);
    text(svg, aX, 34, `A${i}`, "label ink", "middle");
    text(svg, bX, 34, `B${i}`, "label ink", "middle");
    text(svg, aX + 10, 62, String(a), "bit-value");
    text(svg, bX + 10, 62, String(b), "bit-value");

    const cinX = x + w;
    const coutX = x;
    const midY = y + h / 2;

    if (idx < modules.length - 1) {
      const lower = modules[idx + 1];
      hwire(svg, lower.x, cinX, midY, cin, state.flowBit === i);
    } else {
      hwire(svg, 1040, cinX, midY, cin, state.flowBit === i);
      text(svg, 1054, midY + 16, "0", "bit-value");
    }

    if (idx === 0) {
      hwire(svg, 28, coutX, midY, cout, false);
    }

    const group = el("g", {
      className: "fa-hit",
      role: "button",
      tabindex: "0",
      "aria-label": `Inspect full adder bit ${i}`,
      "aria-pressed": selected ? "true" : "false",
    });
    group.appendChild(
      el("rect", {
        className: cls("module", selected && "selected"),
        x,
        y,
        width: w,
        height: h,
        rx: 0,
      })
    );
    const select = () => {
      state.selected = i;
      render();
    };
    group.addEventListener("click", select);
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select();
      }
    });
    svg.appendChild(group);

    text(group, x + w / 2, y + 32, `FULL ADDER`, "label", "middle");
    text(group, x + w / 2, y + 54, `bit ${i}`, "label ink", "middle");
    text(group, x + w / 2, y + 78, `Σ  ${sum}     C  ${cout}`, "bit-value", "middle");

    vwire(svg, x + w / 2, y + h, 250, sum);
    dot(svg, x + w / 2, 250, sum);
    text(svg, x + w / 2, 268, `S${i}`, "label ink", "middle");
    text(svg, x + w / 2 + 12, 250, String(sum), "bit-value");

    dot(svg, cinX, midY, cin);
    dot(svg, coutX, midY, cout);
    text(svg, coutX - 8, midY - 14, `C${i + 1}`, "label", "end");
  });

  mount.replaceChildren(svg);
}

function renderDetail(model) {
  const stage = model.stages[state.selected];
  document.getElementById("stage-label").textContent = String(state.selected);
  document.getElementById("place-tag").textContent = `place value ${1 << state.selected}`;
  document.getElementById("detail-sub").textContent =
    `Inputs A${state.selected}=${stage.a}, B${state.selected}=${stage.b}, C${state.selected}=${stage.cin}`;

  const mount = document.getElementById("detail-mount");
  const svg = el("svg", {
    className: "schematic detail",
    viewBox: "0 0 980 420",
    role: "img",
    "aria-label": `Gate-level full adder for bit ${state.selected}`,
  });

  const ax = 70;
  const ay = 78;
  const by = 148;
  const cy = 318;

  text(svg, 24, ay, `A${state.selected}`, "label ink", "start");
  text(svg, 24, by, `B${state.selected}`, "label ink", "start");
  text(svg, 24, cy, `C${state.selected}`, "label ink", "start");
  dot(svg, ax, ay, stage.a);
  dot(svg, ax, by, stage.b);
  dot(svg, ax, cy, stage.cin);
  text(svg, ax + 12, ay - 14, String(stage.a), "bit-value");
  text(svg, ax + 12, by - 14, String(stage.b), "bit-value");
  text(svg, ax + 12, cy - 14, String(stage.cin), "bit-value");

  const xor1 = drawXor(250, 88, stage.p);
  const andG = drawAnd(250, 268, stage.g);
  const xor2 = drawXor(540, 70, stage.sum);
  const andP = drawAnd(540, 198, stage.pand);
  const orC = drawOr(760, 248, stage.cout);

  svg.append(xor1.g, andG.g, xor2.g, andP.g, orC.g);
  text(svg, 274, 78, "XOR", "label", "start");
  text(svg, 262, 258, "AND", "label", "start");
  text(svg, 564, 60, "XOR", "label", "start");
  text(svg, 552, 188, "AND", "label", "start");
  text(svg, 778, 238, "OR", "label", "start");

  hwire(svg, ax, 160, ay, stage.a);
  hwire(svg, ax, 160, by, stage.b);
  manhattan(svg, [[160, ay], [160, xor1.in1[1]], xor1.in1], stage.a);
  manhattan(svg, [[160, by], [160, xor1.in2[1]], xor1.in2], stage.b);

  manhattan(svg, [[160, ay], [188, ay], [188, andG.in1[1]], andG.in1], stage.a);
  manhattan(svg, [[160, by], [214, by], [214, andG.in2[1]], andG.in2], stage.b);
  dot(svg, 160, ay, stage.a);
  dot(svg, 160, by, stage.b);

  hwire(svg, ax, 500, cy, stage.cin);
  manhattan(svg, [[500, cy], [500, xor2.in2[1]], xor2.in2], stage.cin);
  manhattan(svg, [[500, cy], [500, andP.in2[1]], andP.in2], stage.cin);
  dot(svg, 500, cy, stage.cin);

  hwire(svg, xor1.out[0], 430, xor1.out[1], stage.p);
  manhattan(svg, [[430, xor1.out[1]], [430, xor2.in1[1]], xor2.in1], stage.p);
  manhattan(svg, [[430, xor1.out[1]], [430, andP.in1[1]], andP.in1], stage.p);
  dot(svg, 430, xor1.out[1], stage.p);
  text(svg, 318, xor1.out[1] - 16, `P=${stage.p}`, "label ink");

  hwire(svg, andG.out[0], 700, andG.out[1], stage.g);
  manhattan(svg, [[700, andG.out[1]], [700, orC.in2[1]], orC.in2], stage.g);
  text(svg, 310, andG.out[1] - 16, `G=${stage.g}`, "label ink");

  hwire(svg, andP.out[0], 700, andP.out[1], stage.pand);
  manhattan(svg, [[700, andP.out[1]], [700, orC.in1[1]], orC.in1], stage.pand);
  dot(svg, 700, andP.out[1], stage.pand);
  dot(svg, 700, andG.out[1], stage.g);

  hwire(svg, xor2.out[0], 900, xor2.out[1], stage.sum);
  dot(svg, 900, xor2.out[1], stage.sum);
  text(svg, 918, xor2.out[1], `S${state.selected} = ${stage.sum}`, "label ink");

  hwire(svg, orC.out[0], 900, orC.out[1], stage.cout);
  dot(svg, 900, orC.out[1], stage.cout);
  text(svg, 918, orC.out[1], `C${state.selected + 1} = ${stage.cout}`, "label ink");

  mount.replaceChildren(svg);

  document.getElementById("equations").innerHTML = `
    <div class="eq-block">
      <h3>Sum bit</h3>
      <p>S<sub>${state.selected}</sub> = A ⊕ B ⊕ C<sub>in</sub></p>
      <p class="live">${stage.a} ⊕ ${stage.b} ⊕ ${stage.cin} = ${stage.sum}</p>
    </div>
    <div class="eq-block">
      <h3>Carry out</h3>
      <p>C<sub>${state.selected + 1}</sub> = (A ∧ B) ∨ (C<sub>in</sub> ∧ P)</p>
      <p class="live">(${stage.a} ∧ ${stage.b}) ∨ (${stage.cin} ∧ ${stage.p}) = ${stage.cout}</p>
    </div>
    <ul class="signal-list">
      <li><span>Propagate P = A ⊕ B</span><span class="v ${stage.p ? "one" : ""}">${stage.p}</span></li>
      <li><span>Generate G = A ∧ B</span><span class="v ${stage.g ? "one" : ""}">${stage.g}</span></li>
      <li><span>C<sub>in</sub> ∧ P</span><span class="v ${stage.pand ? "one" : ""}">${stage.pand}</span></li>
      <li><span>Sum</span><span class="v ${stage.sum ? "one" : ""}">${stage.sum}</span></li>
      <li><span>Carry out</span><span class="v ${stage.cout ? "one" : ""}">${stage.cout}</span></li>
    </ul>
  `;
}

function syncPresets() {
  document.querySelectorAll(".chip[data-a]").forEach((chip) => {
    const a = Number(chip.dataset.a);
    const b = Number(chip.dataset.b);
    chip.classList.toggle("active", state.a === a && state.b === b);
  });
}

function render() {
  const model = compute(state.a, state.b);
  renderOperands(model);
  renderHero(model);
  renderColumn(model);
  renderChain(model);
  renderDetail(model);
  syncPresets();
}

async function traceCarry() {
  if (state.tracing) return;
  state.tracing = true;
  const btn = document.getElementById("trace-btn");
  btn.disabled = true;
  btn.textContent = "Rippling…";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const step = reduce ? 0 : 520;

  state.reveal = -1;
  state.flowBit = -1;
  render();
  if (step) await wait(180);

  for (let i = 0; i < WIDTH; i += 1) {
    state.selected = i;
    state.reveal = i;
    state.flowBit = i;
    render();
    if (step) await wait(step);
  }

  state.reveal = WIDTH;
  state.flowBit = -1;
  state.tracing = false;
  btn.disabled = false;
  btn.textContent = "Watch carry ripple";
  render();
}

function bind() {
  document.querySelectorAll(".chip[data-a]").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.a = Number(chip.dataset.a);
      state.b = Number(chip.dataset.b);
      state.selected = 0;
      render();
    });
  });

  document.getElementById("random-pair").addEventListener("click", () => {
    state.a = Math.floor(Math.random() * (MAX + 1));
    state.b = Math.floor(Math.random() * (MAX + 1));
    state.selected = 0;
    render();
  });

  document.getElementById("trace-btn").addEventListener("click", () => {
    traceCarry();
  });
}

bind();
render();
