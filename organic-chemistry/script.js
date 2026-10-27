/* ---------- shared data ---------- */

const ROOTS = ["meth", "eth", "prop", "but", "pent", "hex", "hept", "oct", "non", "dec"];

const alkanes = ROOTS.map((root, i) => ({ name: root + "ane", n: i + 1 }));

function formula(n) {
  return `C${n}H${2 * n + 2}`;
}

function renderAlkaneTable() {
  const body = document.getElementById("alkane-table-body");
  body.innerHTML = alkanes
    .map((a) => `<tr><td>${a.name}</td><td>${formula(a.n)}</td><td>${a.n}</td></tr>`)
    .join("");
}

const biomolecules = [
  { name: "Glucose", category: "carbohydrate (aldohexose)", formula: "C6H12O6", note: "main sugar used for energy; ring form of an open-chain polyhydroxy aldehyde" },
  { name: "Glycine", category: "amino acid", formula: "C2H5NO2", note: "simplest amino acid; building block of proteins" },
  { name: "Alanine", category: "amino acid", formula: "C3H7NO2", note: "amino acid with a methyl side chain" },
  { name: "Palmitic acid", category: "fatty acid (carboxylic acid)", formula: "C16H32O2", note: "saturated 16-carbon chain ending in -oic acid" },
  { name: "Urea", category: "amide", formula: "CH4N2O", note: "simplest biological amide; waste product of protein breakdown" },
  { name: "Adenine", category: "nucleobase (purine)", formula: "C5H5N5", note: "found in DNA/RNA and in ATP" },
  { name: "Cholesterol", category: "steroid (alcohol)", formula: "C27H46O", note: "ends in -ol; precursor to many hormones" },
  { name: "Acetic acid", category: "carboxylic acid", formula: "C2H4O2", note: "vinegar; ethanoic acid by IUPAC rules" },
  { name: "Ethanol", category: "alcohol", formula: "C2H6O", note: "product of fermentation; eth- + -anol" },
  { name: "ATP", category: "nucleotide", formula: "C10H16N5O13P3", note: "adenine + ribose sugar + three phosphate groups" },
];

function renderBioTable() {
  const body = document.getElementById("bio-table-body");
  body.innerHTML = biomolecules
    .map(
      (b) =>
        `<tr><td>${b.name}</td><td>${b.category}</td><td>${b.formula}</td><td>${b.note}</td></tr>`
    )
    .join("");
}

/* ---------- SVG drawing helpers ---------- */

function svgAtom(x, y, label) {
  if (!label) return "";
  return `<circle cx="${x}" cy="${y}" r="14" fill="none" stroke="none"></circle>
    <text class="atom-label" x="${x}" y="${y}">${label}</text>`;
}

function svgBond(x1, y1, x2, y2, order = 1) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ox = (-dy / len) * 3.5, oy = (dx / len) * 3.5;
  if (order === 1) {
    return `<line class="bond-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>`;
  }
  if (order === 2) {
    return `<line class="bond-line" x1="${x1 + ox}" y1="${y1 + oy}" x2="${x2 + ox}" y2="${y2 + oy}"></line>
      <line class="bond-line" x1="${x1 - ox}" y1="${y1 - oy}" x2="${x2 - ox}" y2="${y2 - oy}"></line>`;
  }
  return `<line class="bond-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>
    <line class="bond-line" x1="${x1 + ox * 1.8}" y1="${y1 + oy * 1.8}" x2="${x2 + ox * 1.8}" y2="${y2 + oy * 1.8}"></line>
    <line class="bond-line" x1="${x1 - ox * 1.8}" y1="${y1 - oy * 1.8}" x2="${x2 - ox * 1.8}" y2="${y2 - oy * 1.8}"></line>`;
}

function wrapSVG(inner, viewBox = "0 0 220 220") {
  return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

/* ---------- preset molecule viewer ---------- */

const presetMolecules = {
  methane: {
    label: "Methane — CH4",
    atoms: [
      { x: 110, y: 110, l: "C" },
      { x: 110, y: 50, l: "H" },
      { x: 60, y: 140, l: "H" },
      { x: 160, y: 140, l: "H" },
      { x: 110, y: 170, l: "H" },
    ],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]],
  },
  ethane: {
    label: "Ethane — CH3CH3",
    atoms: [
      { x: 80, y: 110, l: "C" },
      { x: 140, y: 110, l: "C" },
      { x: 50, y: 60, l: "H" },
      { x: 50, y: 150, l: "H" },
      { x: 80, y: 170, l: "H" },
      { x: 170, y: 60, l: "H" },
      { x: 170, y: 150, l: "H" },
      { x: 140, y: 50, l: "H" },
    ],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [1, 5, 1], [1, 6, 1], [1, 7, 1]],
  },
  ethene: {
    label: "Ethene — CH2=CH2",
    atoms: [
      { x: 80, y: 110, l: "C" },
      { x: 140, y: 110, l: "C" },
      { x: 50, y: 60, l: "H" },
      { x: 50, y: 160, l: "H" },
      { x: 170, y: 60, l: "H" },
      { x: 170, y: 160, l: "H" },
    ],
    bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [1, 4, 1], [1, 5, 1]],
  },
  ethyne: {
    label: "Ethyne — CH≡CH",
    atoms: [
      { x: 80, y: 110, l: "C" },
      { x: 140, y: 110, l: "C" },
      { x: 40, y: 110, l: "H" },
      { x: 180, y: 110, l: "H" },
    ],
    bonds: [[0, 1, 3], [0, 2, 1], [1, 3, 1]],
  },
  ethanol: {
    label: "Ethanol — CH3CH2OH",
    atoms: [
      { x: 60, y: 130, l: "C" },
      { x: 120, y: 100, l: "C" },
      { x: 170, y: 130, l: "O" },
      { x: 30, y: 90, l: "H" },
      { x: 30, y: 160, l: "H" },
      { x: 60, y: 180, l: "H" },
      { x: 120, y: 50, l: "H" },
      { x: 150, y: 80, l: "H" },
      { x: 200, y: 100, l: "H" },
    ],
    bonds: [[0, 1, 1], [1, 2, 1], [0, 3, 1], [0, 4, 1], [0, 5, 1], [1, 6, 1], [1, 7, 1], [2, 8, 1]],
  },
  "acetic acid": {
    label: "Acetic acid — CH3COOH",
    atoms: [
      { x: 50, y: 130, l: "C" },
      { x: 110, y: 100, l: "C" },
      { x: 110, y: 50, l: "O" },
      { x: 165, y: 130, l: "O" },
      { x: 20, y: 90, l: "H" },
      { x: 20, y: 165, l: "H" },
      { x: 50, y: 180, l: "H" },
      { x: 200, y: 130, l: "H" },
    ],
    bonds: [[0, 1, 1], [1, 2, 2], [1, 3, 1], [0, 4, 1], [0, 5, 1], [0, 6, 1], [3, 7, 1]],
  },
  glycine: {
    label: "Glycine — simplest amino acid",
    atoms: [
      { x: 70, y: 140, l: "N" },
      { x: 70, y: 80, l: "C" },
      { x: 130, y: 110, l: "C" },
      { x: 130, y: 60, l: "O" },
      { x: 185, y: 140, l: "O" },
      { x: 30, y: 170, l: "H" },
      { x: 100, y: 170, l: "H" },
      { x: 30, y: 50, l: "H" },
      { x: 30, y: 110, l: "H" },
    ],
    bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 2], [2, 4, 1], [0, 5, 1], [0, 6, 1], [1, 7, 1], [1, 8, 1]],
  },
  benzene: {
    label: "Benzene — C6H6 (aromatic ring)",
    atoms: (() => {
      const a = [];
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 3) * i;
        a.push({ x: 110 + 55 * Math.cos(ang), y: 110 + 55 * Math.sin(ang), l: "C" });
      }
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 3) * i;
        a.push({ x: 110 + 90 * Math.cos(ang), y: 110 + 90 * Math.sin(ang), l: "H" });
      }
      return a;
    })(),
    bonds: (() => {
      const b = [];
      for (let i = 0; i < 6; i++) {
        b.push([i, (i + 1) % 6, i % 2 === 0 ? 2 : 1]);
        b.push([i, i + 6, 1]);
      }
      return b;
    })(),
  },
};

function renderPresetMolecule(key) {
  const m = presetMolecules[key];
  let inner = "";
  m.bonds.forEach(([i, j, order]) => {
    const a = m.atoms[i], b = m.atoms[j];
    inner += svgBond(a.x, a.y, b.x, b.y, order);
  });
  m.atoms.forEach((a) => {
    inner += svgAtom(a.x, a.y, a.l);
  });
  document.getElementById("viewer-molecule").innerHTML = wrapSVG(inner);
  document.getElementById("viewer-name").textContent = m.label;
}

function initViewer() {
  const select = document.getElementById("viewer-select");
  select.innerHTML = Object.keys(presetMolecules)
    .map((k) => `<option value="${k}">${k}</option>`)
    .join("");
  select.addEventListener("change", () => renderPresetMolecule(select.value));
  renderPresetMolecule(select.value);
}

/* ---------- molecule builder ---------- */

const FUNC_SUFFIX = { "": "e", ol: "ol", al: "al", one: "one", oic: "oic acid", amine: "amine" };
const FUNC_LABEL = { ol: "OH", al: "CHO", one: "=O", oic: "COOH", amine: "NH2" };
const TERMINAL_ONLY = new Set(["al", "oic"]);

function populateSelect(el, items) {
  el.innerHTML = items.map((v) => `<option value="${v}">${v}</option>`).join("");
}

function refreshBuilderOptions() {
  const n = Number(document.getElementById("b-length").value);
  const bondType = document.getElementById("b-bond").value;

  const bondPosSelect = document.getElementById("b-bond-pos");
  if (bondType === "ane" || n < 2) {
    bondPosSelect.innerHTML = `<option value="0">—</option>`;
    bondPosSelect.disabled = true;
  } else {
    bondPosSelect.disabled = false;
    const positions = [];
    for (let p = 1; p <= n - 1; p++) positions.push(p);
    populateSelect(bondPosSelect, positions);
  }

  const branchSelect = document.getElementById("b-branch");
  const branchOptions = ["0"];
  for (let p = 2; p <= n - 1; p++) branchOptions.push(String(p));
  branchSelect.innerHTML = branchOptions
    .map((v) => `<option value="${v}">${v === "0" ? "none" : v}</option>`)
    .join("");

  const func = document.getElementById("b-func").value;
  const funcPosSelect = document.getElementById("b-func-pos");
  if (!func || TERMINAL_ONLY.has(func)) {
    funcPosSelect.innerHTML = `<option value="1">1 (terminal)</option>`;
    funcPosSelect.disabled = true;
  } else {
    funcPosSelect.disabled = false;
    const positions = [];
    for (let p = 1; p <= n; p++) positions.push(p);
    populateSelect(funcPosSelect, positions);
  }
}

function buildName(n, bondType, bondPos, branchPos, func, funcPos) {
  const root = ROOTS[n - 1];
  const infix = { ane: "an", ene: "en", yne: "yn" }[bondType];
  const needsBondLocant = bondType !== "ane" && n >= 4;
  const bondLocant = needsBondLocant ? `-${bondPos}-` : "";

  let tail;
  if (!func) {
    tail = "e";
  } else if (TERMINAL_ONLY.has(func)) {
    tail = FUNC_SUFFIX[func];
  } else {
    const needsFuncLocant = n >= 3;
    tail = (needsFuncLocant ? `-${funcPos}-` : "") + FUNC_SUFFIX[func];
  }

  const branchPrefix = branchPos > 0 ? `${branchPos}-methyl` : "";
  return branchPrefix + root + bondLocant + infix + tail;
}

function buildStructure(n, bondType, bondPos, branchPos, func, funcPos) {
  const spacingX = 44;
  const startX = 40;
  const coords = [];
  for (let i = 0; i < n; i++) {
    coords.push({ x: startX + i * spacingX, y: i % 2 === 0 ? 150 : 100 });
  }

  let inner = "";
  for (let i = 0; i < n - 1; i++) {
    const carbonNum = i + 1;
    const order = bondType !== "ane" && carbonNum === Number(bondPos) ? (bondType === "ene" ? 2 : 3) : 1;
    inner += svgBond(coords[i].x, coords[i].y, coords[i + 1].x, coords[i + 1].y, order);
  }

  if (branchPos > 0) {
    const c = coords[branchPos - 1];
    const bx = c.x, by = c.y - 45;
    inner += svgBond(c.x, c.y, bx, by, 1);
    inner += svgAtom(bx, by, "CH3");
  }

  if (func) {
    const c = coords[funcPos - 1];
    const fx = c.x + (funcPos === n ? 30 : 0), fy = c.y - 45;
    inner += svgBond(c.x, c.y, fx, fy, func === "one" ? 2 : 1);
    inner += svgAtom(fx, fy, FUNC_LABEL[func]);
  }

  coords.forEach((c) => {
    inner += svgAtom(c.x, c.y, "C");
  });

  const width = startX + n * spacingX + 30;
  return wrapSVG(inner, `0 0 ${width} 220`);
}

function renderBuilder() {
  const n = Number(document.getElementById("b-length").value);
  const bondType = document.getElementById("b-bond").value;
  const bondPos = Number(document.getElementById("b-bond-pos").value);
  const branchPos = Number(document.getElementById("b-branch").value);
  const func = document.getElementById("b-func").value;
  const funcPos = Number(document.getElementById("b-func-pos").value);

  const name = buildName(n, bondType, bondPos, branchPos, func, funcPos);
  document.getElementById("builder-name").textContent = name;
  document.getElementById("builder-molecule").innerHTML = buildStructure(
    n, bondType, bondPos, branchPos, func, funcPos
  );
}

function initBuilder() {
  const lengthSelect = document.getElementById("b-length");
  populateSelect(lengthSelect, [1, 2, 3, 4, 5, 6, 7, 8]);
  lengthSelect.value = "4";

  ["b-length", "b-bond", "b-func"].forEach((id) =>
    document.getElementById(id).addEventListener("change", () => {
      refreshBuilderOptions();
      renderBuilder();
    })
  );
  ["b-bond-pos", "b-branch", "b-func-pos"].forEach((id) =>
    document.getElementById(id).addEventListener("change", renderBuilder)
  );

  refreshBuilderOptions();
  renderBuilder();
}

/* ---------- quiz ---------- */

const quizBank = [
  ...alkanes.map((a) => ({ q: `What is the molecular formula of ${a.name}?`, a: formula(a.n) })),
  ...alkanes.map((a) => ({ q: `What is the name of the alkane with formula ${formula(a.n)}?`, a: a.name })),
  { q: "Which suffix indicates a double bond?", a: "-ene" },
  { q: "Which suffix indicates a triple bond?", a: "-yne" },
  { q: "Which suffix indicates an alcohol?", a: "-ol" },
  { q: "Which suffix indicates a carboxylic acid?", a: "-oic acid" },
  { q: "Which suffix indicates an aldehyde?", a: "-al" },
  { q: "Which suffix indicates a ketone?", a: "-one" },
  { q: "What is the -yl group derived from methane called?", a: "methyl" },
  { q: "What is the -yl group derived from ethane called?", a: "ethyl" },
  { q: "What functional group does 'amine' indicate?", a: "-NH2" },
  { q: "What is the common name for ethanoic acid?", a: "acetic acid" },
  { q: "What sugar (formula C6H12O6) is the body's main energy source?", a: "glucose" },
  { q: "What is the simplest amino acid?", a: "glycine" },
];

let currentQuestion = null;

function newQuestion() {
  currentQuestion = quizBank[Math.floor(Math.random() * quizBank.length)];
  document.getElementById("quiz-question").textContent = currentQuestion.q;
  document.getElementById("quiz-answer").value = "";
  document.getElementById("quiz-feedback").textContent = "";
}

function checkAnswer() {
  if (!currentQuestion) return;
  const input = document.getElementById("quiz-answer").value.trim().toLowerCase();
  const correct = input === currentQuestion.a.toLowerCase();
  const feedback = document.getElementById("quiz-feedback");
  feedback.textContent = correct ? "Correct." : `Incorrect. Answer: ${currentQuestion.a}`;
}

/* ---------- init ---------- */

document.getElementById("quiz-submit").addEventListener("click", checkAnswer);
document.getElementById("quiz-next").addEventListener("click", newQuestion);

renderAlkaneTable();
renderBioTable();
initViewer();
initBuilder();
newQuestion();
