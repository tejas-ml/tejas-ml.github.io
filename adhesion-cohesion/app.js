/**
 * Adhesion & Cohesion Simulator - Biology 101
 * Core Application & Physics Engine
 */

// ==========================================================================
// STATE MANAGEMENT
// ==========================================================================
const state = {
  cohesion: 60,   // 0 to 100
  adhesion: 85,   // 0 to 100
  width: 80,      // 40 to 160 (diameter in pixels)
  viewMode: 'macro', // 'macro' or 'micro'
  preset: 'water',   // 'water' | 'mercury' | 'custom'
  
  // Interactive / physics states
  fluidBaseY: 280, // Base level of fluid in the reservoir
  targetRise: 0,   // Target height of fluid column (based on physics)
  currentRise: 0,  // Smoothly interpolated height
  targetMeniscus: 0, // Target curvature depth
  currentMeniscus: 0, // Smoothly interpolated curvature
  
  // Wave physics for macro view
  wavePoints: [],
  numWavePoints: 20,
  waveK: 0.05,      // Spring constant
  waveDamping: 0.08, // Damping factor
  waveSpread: 0.05,  // How much ripples affect neighbors
  
  // Particles for micro view
  molecules: [],
  maxMolecules: 35,
  grabbedMolecule: null,
  
  // Mouse interaction
  mouse: {
    x: 0,
    y: 0,
    isDown: false,
    prevX: 0,
    prevY: 0
  }
};

// Presets configuration
const PRESETS = {
  water: { cohesion: 60, adhesion: 85, width: 80 },
  mercury: { cohesion: 95, adhesion: 10, width: 80 }
};

// ==========================================================================
// INITIALIZATION & DOM SELECTION
// ==========================================================================
const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');

// UI Controls
const sliderCohesion = document.getElementById('slider-cohesion');
const sliderAdhesion = document.getElementById('slider-adhesion');
const sliderWidth = document.getElementById('slider-width');

const labelCohesion = document.getElementById('label-cohesion');
const labelAdhesion = document.getElementById('label-adhesion');
const labelWidth = document.getElementById('label-width');

const btnWater = document.getElementById('preset-water');
const btnMercury = document.getElementById('preset-mercury');
const btnCustom = document.getElementById('preset-custom');

const btnViewMacro = document.getElementById('btn-view-macro');
const btnViewMicro = document.getElementById('btn-view-micro');
const canvasHint = document.getElementById('canvas-hint');

// Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Quiz State
let currentQuestionIndex = 0;
let quizScore = 0;
let answeredCurrent = false;

const QUIZ_QUESTIONS = [
  {
    question: "When water climbs up a thin glass capillary tube, which force is primarily responsible for dragging other water molecules along with it in a continuous stream?",
    options: [
      "Adhesion (attraction between water and the glass walls)",
      "Cohesion (attraction between water molecules due to hydrogen bonds)",
      "Gravity pulling the water down",
      "Thermoregulation of the liquid"
    ],
    correctIndex: 1,
    feedbackCorrect: "Correct! While adhesion pulls the outer edge up the glass wall, cohesion is the force that links water molecules together, causing the entire column to rise in a continuous stream.",
    feedbackIncorrect: "Not quite. Remember, adhesion sticks water to the glass, but cohesion holds the water column together as a continuous chain so they drag each other up!"
  },
  {
    question: "Why does Mercury form a dome-shaped (convex) meniscus in a glass tube, while Water forms a curved-in (concave) meniscus?",
    options: [
      "Mercury molecules are polar and repel glass.",
      "Water molecules have no cohesive forces, only adhesive forces.",
      "Mercury's cohesive forces are stronger than its adhesion to glass, while Water's adhesive attraction to glass is stronger than its cohesion.",
      "Gravity pulls on Mercury much harder because it is heavier."
    ],
    correctIndex: 2,
    feedbackCorrect: "Exactly! Mercury has massive cohesive forces (metallic bonding) and dislikes polar glass, so it forms a convex dome. Water has very strong adhesion to polar glass ($SiO_2$), causing it to climb the edges and form a concave cup.",
    feedbackIncorrect: "Take another look at the simulator. Water sticks to glass because adhesion > cohesion. Mercury curves away because its cohesion (internal bonding) is much stronger than its adhesion to the glass."
  },
  {
    question: "In biology, how do redwood trees pull water hundreds of feet from the ground to their leaves against gravity?",
    options: [
      "Mechanical heart-like pumps located at the roots",
      "Transpiration pull, where evaporation at leaves pulls a cohesive chain of water molecules upward while adhesion holds it in place along xylem walls",
      "Trees compress their xylem tubes to squeeze the water upward like toothpaste",
      "Water rises purely due to atmospheric pressure pushing it from the soil"
    ],
    correctIndex: 1,
    feedbackCorrect: "Superb! This is the Cohesion-Tension Theory. Evaporation from leaves (transpiration) pulls on the continuous string of water molecules (held together by cohesion) while adhesion prevents the column from slipping back down under gravity.",
    feedbackIncorrect: "Remember, trees don't have hearts or squeeze muscles! They rely on transpiration pull—evaporation pulls a long chain of water (cohesion) climbing up xylem tubes with the help of wall attraction (adhesion)."
  }
];

// Set initial high DPI canvas resolution
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
}

// ==========================================================================
// PHYSICAL MATH EQUATIONS (MACRO)
// ==========================================================================
function updatePhysicalParameters() {
  // Capillary rise/depression height formula
  // h = 2 * (Adhesion - Cohesion * F) / (Width)
  const normAdh = state.adhesion / 100;
  const normCoh = state.cohesion / 100;
  const normWidth = state.width / 160; // normalized scale
  
  // Height in tube relative to base line
  // If Adhesion is strong relative to cohesion, it climbs. If Cohesion is massive (mercury), it drops!
  const forceDiff = (normAdh * 1.5 - normCoh * 0.9);
  state.targetRise = (forceDiff * 160) / (0.4 + normWidth * 1.2);
  
  // Capillary limitation bounds
  if (state.targetRise > 180) state.targetRise = 180;
  if (state.targetRise < -80) state.targetRise = -80;

  // Meniscus depth: Adhesion pulls edge up (concave), Cohesion pulls fluid in (convex)
  // Meniscus curvature is proportional to force discrepancy
  state.targetMeniscus = (normAdh - normCoh * 0.9) * 35;
}

// Initialize waves across the tube width
function initWavePoints() {
  state.wavePoints = [];
  const tubeLeft = 400 - state.width / 2;
  const tubeRight = 400 + state.width / 2;
  const step = state.width / (state.numWavePoints - 1);

  for (let i = 0; i < state.numWavePoints; i++) {
    const x = tubeLeft + i * step;
    state.wavePoints.push({
      x: x,
      y: state.fluidBaseY - state.currentRise,
      vy: 0,
      targetY: state.fluidBaseY - state.currentRise
    });
  }
}

// Update wave spring physics
function updateWavePhysics() {
  const tubeLeft = 400 - state.width / 2;
  const tubeRight = 400 + state.width / 2;
  const step = state.width / (state.numWavePoints - 1);
  
  // Smoothly interpolate macroscopic physics
  state.currentRise += (state.targetRise - state.currentRise) * 0.08;
  state.currentMeniscus += (state.targetMeniscus - state.currentMeniscus) * 0.08;

  // Define target curve profile for meniscus (parabolic shape)
  // center of meniscus is flat/curved, edges climb or drop
  for (let i = 0; i < state.numWavePoints; i++) {
    const pt = state.wavePoints[i];
    if (!pt) continue;
    
    // update x to follow any width changes smoothly
    pt.x = tubeLeft + i * step;
    
    // Normalized position from center (-1 at left wall, 0 at center, 1 at right wall)
    const normDist = (i - (state.numWavePoints - 1) / 2) / ((state.numWavePoints - 1) / 2);
    
    // Parabolic profile: y_offset = meniscus * (x^2)
    // Positive meniscus = edges pull UP (concave meniscus) -> lower value of Y at edges
    const profileYOffset = -state.currentMeniscus * (normDist * normDist);
    
    // Target Y for this point
    pt.targetY = state.fluidBaseY - state.currentRise + profileYOffset;
    
    // Spring physics pulling point to target
    const force = -state.waveK * (pt.y - pt.targetY);
    pt.vy += force;
    pt.vy *= (1 - state.waveDamping);
    pt.y += pt.vy;
  }

  // Ripple propagation (spread waves between adjacent points)
  for (let i = 0; i < state.numWavePoints; i++) {
    const pt = state.wavePoints[i];
    if (i > 0) {
      const leftPt = state.wavePoints[i - 1];
      const forceLeft = state.waveSpread * (leftPt.y - pt.y);
      pt.vy += forceLeft;
      leftPt.vy -= forceLeft;
    }
    if (i < state.numWavePoints - 1) {
      const rightPt = state.wavePoints[i + 1];
      const forceRight = state.waveSpread * (rightPt.y - pt.y);
      pt.vy += forceRight;
      rightPt.vy -= forceRight;
    }
  }
}

// Perturb waves via mouse
function perturbLiquid(mouseX, mouseY, strength) {
  const tubeLeft = 400 - state.width / 2;
  const tubeRight = 400 + state.width / 2;
  
  if (mouseX >= tubeLeft - 10 && mouseX <= tubeRight + 10) {
    // Find closest wave point
    let closestIndex = -1;
    let minDist = 99999;
    
    for (let i = 0; i < state.numWavePoints; i++) {
      const dist = Math.abs(state.wavePoints[i].x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }
    
    if (closestIndex !== -1) {
      // Push the point dynamically
      const pt = state.wavePoints[closestIndex];
      const dy = mouseY - pt.y;
      if (Math.abs(dy) < 50) {
        pt.vy += Math.max(-15, Math.min(15, dy * strength));
      }
    }
  }
}

// ==========================================================================
// MOLECULAR PHYSICS ENGINE (MICRO)
// ==========================================================================
class WaterMolecule {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = (Math.random() - 0.5) * 1.5;
    
    this.angle = Math.random() * Math.PI * 2;
    this.vAngle = 0;
    this.radius = 12; // Oxygen radius
    this.hRadius = 6;  // Hydrogen radius
    
    // H-O-H bond angle is 104.5 degrees
    this.hAngleOffset = (104.5 * Math.PI) / 180;
    this.hDist = 14; // Distance from Oxygen center to Hydrogen center
  }

  update() {
    if (this === state.grabbedMolecule) return;

    // 1. GENTLE BROWNIAN MOTION (thermal vibration)
    this.vx += (Math.random() - 0.5) * 0.3;
    this.vy += (Math.random() - 0.5) * 0.3;
    this.vAngle += (Math.random() - 0.5) * 0.05;

    // 2. COHESION (Attraction between molecules)
    state.molecules.forEach(other => {
      if (other === this) return;
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0 && dist < 70) {
        // Cohesive pull factor based on slider
        const cohesiveStrength = (state.cohesion / 100) * 0.25;
        // Optimal hydrogen bond distance is ~35-45px
        const force = (dist - 42) * cohesiveStrength * 0.02;
        this.vx += (dx / dist) * force;
        this.vy += (dy / dist) * force;
        
        // Torque to align Oxygen to Hydrogen
        // Oxygen (-) of this molecule wants to look at Hydrogen (+) of other molecule
        // This is a simple visual approximation of charge alignment
      }
    });

    // 3. ADHESION (Attraction to the Glass Wall on the left: x = 200)
    const wallX = 200;
    const distToWall = this.x - wallX;
    
    if (distToWall > 0 && distToWall < 180) {
      const adhesiveStrength = (state.adhesion / 100) * 0.5;
      
      // Pull to the wall
      // Stronger adhesion = pulled tighter to the wall
      const targetWallDist = 30; // close packing
      const wallForce = (distToWall - targetWallDist) * adhesiveStrength * -0.015;
      this.vx += wallForce;
      
      // Vertical climbing effect: adhesion drags molecules upwards along the wall
      if (distToWall < 60) {
        this.vy -= adhesiveStrength * 0.15; // float upward
      }
      
      // Align hydrogens towards the wall (since glass wall is negatively polar in this module)
      // Positive hydrogens (ears) face the wall (left)
      // Target angle: pointing hydrogen ears towards the left wall
      // Which means the main oxygen is on the right, hydrogens pointing left.
      // So the orientation angle should face toward PI (180 degrees)
      const targetAngle = Math.PI;
      let angleDiff = targetAngle - this.angle;
      // Normalise angle to [-PI, PI]
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      
      this.vAngle += angleDiff * adhesiveStrength * 0.01;
    }

    // 4. WORLD BOUNDARIES & COLLISION
    // Glass wall on left
    if (this.x < wallX + this.radius + 10) {
      this.x = wallX + this.radius + 10;
      this.vx = Math.abs(this.vx) * 0.5;
    }
    // Container right wall (let's say x = 750)
    if (this.x > 770 - this.radius) {
      this.x = 770 - this.radius;
      this.vx = -Math.abs(this.vx) * 0.5;
    }
    // Bottom limit
    if (this.y > 380 - this.radius) {
      this.y = 380 - this.radius;
      this.vy = -Math.abs(this.vy) * 0.5;
    }
    // Top limit
    if (this.y < 40 + this.radius) {
      this.y = 40 + this.radius;
      this.vy = Math.abs(this.vy) * 0.5;
    }

    // Apply speed limits (damping)
    this.vx *= 0.92;
    this.vy *= 0.92;
    this.vAngle *= 0.88;

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.vAngle;
  }

  // Get hydrogen positions in absolute space
  getHydrogens() {
    // Two hydrogen atoms flanking oxygen at angles: angle - hAngleOffset/2 and angle + hAngleOffset/2
    const h1x = this.x + Math.cos(this.angle - this.hAngleOffset / 2) * this.hDist;
    const h1y = this.y + Math.sin(this.angle - this.hAngleOffset / 2) * this.hDist;
    
    const h2x = this.x + Math.cos(this.angle + this.hAngleOffset / 2) * this.hDist;
    const h2y = this.y + Math.sin(this.angle + this.hAngleOffset / 2) * this.hDist;
    
    return [
      { x: h1x, y: h1y },
      { x: h2x, y: h2y }
    ];
  }
}

// Generate the initial molecular grid
function initMolecules() {
  state.molecules = [];
  const startX = 230;
  const endX = 700;
  const startY = 60;
  const endY = 360;

  for (let i = 0; i < state.maxMolecules; i++) {
    const x = startX + Math.random() * (endX - startX);
    const y = startY + Math.random() * (endY - startY);
    state.molecules.push(new WaterMolecule(x, y));
  }
}

// ==========================================================================
// RENDER ENGINE
// ==========================================================================

function drawMacroView() {
  ctx.clearRect(0, 0, 800, 400);

  const tubeLeft = 400 - state.width / 2;
  const tubeRight = 400 + state.width / 2;
  const beakerLeft = 150;
  const beakerRight = 650;
  
  // 1. DRAW BEAKER BASE LIQUID & CONTAINER BACK
  ctx.fillStyle = '#060d1b';
  ctx.fillRect(0, 0, 800, 400);

  // Grid background
  ctx.strokeStyle = 'rgba(0, 245, 212, 0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 800; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 400);
    ctx.stroke();
  }
  for (let y = 0; y < 400; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(800, y);
    ctx.stroke();
  }

  // 2. DRAW BEAKER GLASS WALLS AND BASE WATER
  // Draw glass background for capillary tube
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.fillRect(tubeLeft, 40, state.width, 360);

  // 3. DRAW WATER BODIES
  // Determine color theme based on selection (water vs mercury)
  let fluidFill, fluidStroke, fluidGlow;
  if (state.preset === 'mercury') {
    fluidFill = ctx.createLinearGradient(400, 100, 400, 400);
    fluidFill.addColorStop(0, '#94a3b8');
    fluidFill.addColorStop(1, '#334155');
    fluidStroke = '#e2e8f0';
    fluidGlow = 'rgba(148, 163, 184, 0.2)';
  } else {
    fluidFill = ctx.createLinearGradient(400, 100, 400, 400);
    fluidFill.addColorStop(0, 'rgba(0, 245, 212, 0.7)');
    fluidFill.addColorStop(0.5, 'rgba(0, 187, 249, 0.85)');
    fluidFill.addColorStop(1, 'rgba(10, 20, 50, 0.95)');
    fluidStroke = '#00f5d4';
    fluidGlow = 'rgba(0, 245, 212, 0.35)';
  }

  // Draw side fluid reservoirs (outside the tube, inside the main beaker)
  ctx.fillStyle = fluidFill;
  ctx.beginPath();
  ctx.moveTo(beakerLeft, state.fluidBaseY);
  ctx.lineTo(tubeLeft, state.fluidBaseY);
  ctx.lineTo(tubeLeft, 380);
  ctx.lineTo(beakerLeft, 380);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(tubeRight, state.fluidBaseY);
  ctx.lineTo(beakerRight, state.fluidBaseY);
  ctx.lineTo(beakerRight, 380);
  ctx.lineTo(tubeRight, 380);
  ctx.closePath();
  ctx.fill();

  // Draw capillary tube water column utilizing the wavePoints system
  ctx.beginPath();
  if (state.wavePoints.length > 0) {
    ctx.moveTo(tubeLeft, 380);
    ctx.lineTo(state.wavePoints[0].x, state.wavePoints[0].y);
    
    // Draw spline curve along the surface nodes
    for (let i = 1; i < state.wavePoints.length; i++) {
      ctx.lineTo(state.wavePoints[i].x, state.wavePoints[i].y);
    }
    
    ctx.lineTo(tubeRight, 380);
    ctx.closePath();
    ctx.fill();

    // Draw the glowing top surface line
    ctx.strokeStyle = fluidStroke;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = fluidStroke;
    
    ctx.beginPath();
    ctx.moveTo(state.wavePoints[0].x, state.wavePoints[0].y);
    for (let i = 1; i < state.wavePoints.length; i++) {
      ctx.lineTo(state.wavePoints[i].x, state.wavePoints[i].y);
    }
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowBlur = 0;
  }

  // Draw side reservoirs surface lines
  ctx.strokeStyle = fluidStroke;
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.moveTo(beakerLeft, state.fluidBaseY);
  ctx.lineTo(tubeLeft, state.fluidBaseY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(tubeRight, state.fluidBaseY);
  ctx.lineTo(beakerRight, state.fluidBaseY);
  ctx.stroke();

  // 4. DRAW GLASS VESSEL BORDERS (Premium glassware rendering)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  // Draw capillary tube walls
  ctx.beginPath();
  ctx.moveTo(tubeLeft, 40);
  ctx.lineTo(tubeLeft, 380);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(tubeRight, 40);
  ctx.lineTo(tubeRight, 380);
  ctx.stroke();

  // Draw beaker container bottom/sides
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(beakerLeft, 220); // start slightly high
  ctx.lineTo(beakerLeft, 380);
  ctx.lineTo(beakerRight, 380);
  ctx.lineTo(beakerRight, 220);
  ctx.stroke();

  // Highlight glow on the glassware borders
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tubeLeft - 1, 50);
  ctx.lineTo(tubeLeft - 1, 370);
  ctx.stroke();
  
  // 5. HUD INFO LABELS
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = "bold 13px 'Outfit', sans-serif";
  ctx.fillText("GLASS WALL", tubeLeft - 100, 90);
  ctx.fillText("GLASS WALL", tubeRight + 15, 90);
  
  ctx.font = "11px 'Inter', sans-serif";
  ctx.fillStyle = '#64748b';
  ctx.fillText("Capillary Rise Height: " + Math.round(state.currentRise) + "px", 20, 30);
  ctx.fillText("Meniscus Curve Depth: " + Math.round(state.currentMeniscus) + "px", 20, 48);
}

function drawMicroView() {
  ctx.clearRect(0, 0, 800, 400);

  // Background
  ctx.fillStyle = '#030812';
  ctx.fillRect(0, 0, 800, 400);

  // Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 800; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 400);
    ctx.stroke();
  }

  // 1. DRAW GLASS WALL (LEFT 200px)
  const wallX = 200;
  const glassGrad = ctx.createLinearGradient(0, 0, wallX, 0);
  glassGrad.addColorStop(0, '#0c1a2f');
  glassGrad.addColorStop(0.9, '#162e52');
  glassGrad.addColorStop(1, '#00f5d4'); // glowing polar boundary line
  
  ctx.fillStyle = glassGrad;
  ctx.fillRect(0, 0, wallX, 400);
  
  // Highlight boundary
  ctx.strokeStyle = '#00f5d4';
  ctx.lineWidth = 4;
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#00f5d4';
  ctx.beginPath();
  ctx.moveTo(wallX, 0);
  ctx.lineTo(wallX, 400);
  ctx.stroke();
  ctx.shadowBlur = 0; // reset shadow

  // Render glass molecules and polar symbols
  // Let's draw O(-) charges lined up down the glass surface representing polar oxygen atoms of SiO2
  ctx.fillStyle = 'rgba(255, 71, 126, 0.8)';
  ctx.font = "bold 14px 'Inter', sans-serif";
  for (let y = 30; y < 400; y += 45) {
    // Draw negative polarity symbols on the wall
    ctx.fillText("δ⁻", wallX - 25, y);
    // Draw small oxygen atom spheres in the wall
    ctx.beginPath();
    ctx.arc(wallX - 45, y - 5, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw silicon atoms (larger grey spheres) linked
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(wallX - 70, y + 15, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 71, 126, 0.8)';
  }

  // Label the glass wall
  ctx.save();
  ctx.translate(60, 200);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = "bold 18px 'Outfit', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText("GLASS STRUCTURE (SiO₂)", 0, 0);
  ctx.restore();

  // 2. DRAW MOLECULES AND INTER-MOLECULAR BONDS
  const normAdh = state.adhesion / 100;
  const normCoh = state.cohesion / 100;

  // Render hydrogen bonds between water molecules FIRST (behind atoms)
  state.molecules.forEach((m1, idx1) => {
    const hydrogens = m1.getHydrogens();
    
    // A) Wall bonds (Adhesion: Hydrogens [positive] attract to Glass Oxygen [negative])
    hydrogens.forEach(h => {
      const distToWall = h.x - wallX;
      if (distToWall > 0 && distToWall < 60) {
        // Draw bond line from H (+) to Wall (-)
        ctx.strokeStyle = `rgba(0, 245, 212, ${normAdh * 0.85})`;
        ctx.lineWidth = 2 + normAdh * 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(h.x, h.y);
        ctx.lineTo(wallX, h.y);
        ctx.stroke();
        ctx.setLineDash([]); // reset
      }
    });

    // B) Inter-molecule bonds (Cohesion: H of m1 attracts to O of m2)
    state.molecules.forEach((m2, idx2) => {
      if (idx1 >= idx2) return; // avoid drawing double lines
      
      const dx = m2.x - m1.x;
      const dy = m2.y - m1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0 && dist < 65) {
        // Find closest hydrogen of m1 to oxygen of m2
        const hPoints = m1.getHydrogens();
        let closestH = hPoints[0];
        let minDist = Math.sqrt((m2.x - closestH.x)**2 + (m2.y - closestH.y)**2);
        
        const d2 = Math.sqrt((m2.x - hPoints[1].x)**2 + (m2.y - hPoints[1].y)**2);
        if (d2 < minDist) {
          closestH = hPoints[1];
          minDist = d2;
        }

        // Draw dotted hydrogen bond
        ctx.strokeStyle = `rgba(0, 187, 249, ${normCoh * 0.9})`;
        ctx.lineWidth = 1.5 + normCoh * 3;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(closestH.x, closestH.y);
        ctx.lineTo(m2.x, m2.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  });

  // Render individual molecules (Water molecules)
  state.molecules.forEach(m => {
    const hydrogens = m.getHydrogens();
    
    // Highlight grabbed molecule
    if (m === state.grabbedMolecule) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#fff';
    }

    // A) Draw Hydrogens (White circles)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    hydrogens.forEach(h => {
      ctx.beginPath();
      ctx.arc(h.x, h.y, m.hRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Draw positive charge label
      ctx.fillStyle = '#0a1424';
      ctx.font = "bold 8px 'Inter', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("+", h.x, h.y);
    });

    // B) Draw Oxygen (Red circle)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw negative charge label
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 11px 'Inter', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("δ⁻", m.x, m.y - 1);
    
    ctx.shadowBlur = 0; // reset
  });

  // If a molecule is being hovered or grabbed, draw user instruction
  if (state.grabbedMolecule) {
    ctx.fillStyle = '#ffffff';
    ctx.font = "12px 'Inter', sans-serif";
    ctx.textAlign = 'right';
    ctx.fillText("Dragging water molecule...", 770, 30);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = "italic 12px 'Inter', sans-serif";
    ctx.textAlign = 'right';
    ctx.fillText("Tip: You can grab and drag water molecules with your mouse!", 770, 30);
  }
}

// Main update & render loop
function tick() {
  if (state.viewMode === 'macro') {
    updateWavePhysics();
    drawMacroView();
  } else {
    state.molecules.forEach(m => m.update());
    drawMicroView();
  }
  requestAnimationFrame(tick);
}

// ==========================================================================
// CONTROL INTERFACE SYNCING
// ==========================================================================

function updateUI() {
  // Update slider positions
  sliderCohesion.value = state.cohesion;
  sliderAdhesion.value = state.adhesion;
  sliderWidth.value = state.width;
  
  // Update numerical text readouts
  labelCohesion.textContent = state.cohesion;
  labelAdhesion.textContent = state.adhesion;
  labelWidth.textContent = state.width + "px";

  // Preset button highlights
  btnWater.classList.remove('active');
  btnMercury.classList.remove('active');
  btnCustom.classList.remove('active');

  if (state.preset === 'water') {
    btnWater.classList.add('active');
  } else if (state.preset === 'mercury') {
    btnMercury.classList.add('active');
  } else {
    btnCustom.classList.add('active');
  }
  
  // Update physics formulas
  updatePhysicalParameters();
}

function handlePresetChange(presetName) {
  state.preset = presetName;
  if (presetName !== 'custom') {
    const config = PRESETS[presetName];
    state.cohesion = config.cohesion;
    state.adhesion = config.adhesion;
    state.width = config.width;
  }
  updateUI();
  if (state.viewMode === 'macro') {
    initWavePoints();
  }
}

// Hook sliders
sliderCohesion.addEventListener('input', (e) => {
  state.cohesion = parseInt(e.target.value);
  state.preset = 'custom';
  updateUI();
});

sliderAdhesion.addEventListener('input', (e) => {
  state.adhesion = parseInt(e.target.value);
  state.preset = 'custom';
  updateUI();
});

sliderWidth.addEventListener('input', (e) => {
  state.width = parseInt(e.target.value);
  state.preset = 'custom';
  updateUI();
  if (state.viewMode === 'macro') {
    initWavePoints();
  }
});

// Hook presets
btnWater.addEventListener('click', () => handlePresetChange('water'));
btnMercury.addEventListener('click', () => handlePresetChange('mercury'));
btnCustom.addEventListener('click', () => handlePresetChange('custom'));

// Hook view toggles
btnViewMacro.addEventListener('click', () => {
  state.viewMode = 'macro';
  btnViewMacro.classList.add('active');
  btnViewMacro.setAttribute('aria-pressed', 'true');
  btnViewMicro.classList.remove('active');
  btnViewMicro.setAttribute('aria-pressed', 'false');
  canvasHint.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><span>Tip: Hover or drag inside the tube to perturb the fluid and watch gravity pull it back!</span>`;
  initWavePoints();
});

btnViewMicro.addEventListener('click', () => {
  state.viewMode = 'micro';
  btnViewMicro.classList.add('active');
  btnViewMicro.setAttribute('aria-pressed', 'true');
  btnViewMacro.classList.remove('active');
  btnViewMacro.setAttribute('aria-pressed', 'false');
  canvasHint.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><span>Tip: Grab individual water molecules and pull them around to watch hydrogen bonds snap!</span>`;
  initMolecules();
});

// Hook learning tabs
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    const panelId = btn.getAttribute('aria-controls');
    document.getElementById(panelId).classList.add('active');
  });
});

// ==========================================================================
// INTERACTIVE PHYSICS MOUSE EVENTS
// ==========================================================================
function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

canvas.addEventListener('mousedown', (e) => {
  const pos = getMousePos(e);
  state.mouse.isDown = true;
  state.mouse.x = pos.x;
  state.mouse.y = pos.y;
  
  if (state.viewMode === 'micro') {
    // Check if clicked near a molecule to drag
    let clickedMolecule = null;
    let minDist = 30;
    
    state.molecules.forEach(m => {
      const dx = m.x - pos.x;
      const dy = m.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        clickedMolecule = m;
      }
    });
    
    state.grabbedMolecule = clickedMolecule;
  }
});

canvas.addEventListener('mousemove', (e) => {
  const pos = getMousePos(e);
  state.mouse.prevX = state.mouse.x;
  state.mouse.prevY = state.mouse.y;
  state.mouse.x = pos.x;
  state.mouse.y = pos.y;
  
  if (state.viewMode === 'macro') {
    // Hovering creates subtle waves
    perturbLiquid(pos.x, pos.y, state.mouse.isDown ? 0.8 : 0.15);
  } else {
    // If grabbing molecule, update position directly to mouse
    if (state.grabbedMolecule) {
      state.grabbedMolecule.x = pos.x;
      state.grabbedMolecule.y = pos.y;
      state.grabbedMolecule.vx = (pos.x - state.mouse.prevX) * 0.7;
      state.grabbedMolecule.vy = (pos.y - state.mouse.prevY) * 0.7;
    }
  }
});

window.addEventListener('mouseup', () => {
  state.mouse.isDown = false;
  state.grabbedMolecule = null;
});

// Mobile Touch support
canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent("mousedown", {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
  }
}, { passive: true });

canvas.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent("mousemove", {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
  }
}, { passive: true });

window.addEventListener('touchend', () => {
  const mouseEvent = new MouseEvent("mouseup", {});
  window.dispatchEvent(mouseEvent);
});


// ==========================================================================
// BIO 101 QUIZ SYSTEM
// ==========================================================================
const quizQuestionBox = document.getElementById('quiz-question-box');
const quizScoreBox = document.getElementById('quiz-score-box');
const quizProgress = document.getElementById('quiz-progress');
const questionText = document.getElementById('question-text');
const optionsList = document.getElementById('options-list');
const quizFeedback = document.getElementById('quiz-feedback');
const quizScoreLive = document.getElementById('quiz-score-live');
const btnNextQuestion = document.getElementById('btn-next-question');

const scorePercentage = document.getElementById('score-percentage');
const scoreFraction = document.getElementById('score-fraction');
const btnRestartQuiz = document.getElementById('btn-restart-quiz');

function loadQuizQuestion() {
  answeredCurrent = false;
  btnNextQuestion.disabled = true;
  quizFeedback.style.display = 'none';
  quizFeedback.className = 'quiz-feedback';
  
  const q = QUIZ_QUESTIONS[currentQuestionIndex];
  quizProgress.textContent = `Question ${currentQuestionIndex + 1} of ${QUIZ_QUESTIONS.length}`;
  questionText.textContent = q.question;
  quizScoreLive.textContent = `Score: ${quizScore}/${QUIZ_QUESTIONS.length}`;

  optionsList.innerHTML = '';
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.setAttribute('data-idx', idx);
    btn.addEventListener('click', () => selectAnswer(idx));
    optionsList.appendChild(btn);
  });
}

function selectAnswer(selectedIdx) {
  if (answeredCurrent) return; // Can't double select
  
  answeredCurrent = true;
  btnNextQuestion.disabled = false;
  
  const q = QUIZ_QUESTIONS[currentQuestionIndex];
  const optionButtons = optionsList.querySelectorAll('.option-btn');
  
  if (selectedIdx === q.correctIndex) {
    quizScore++;
    optionButtons[selectedIdx].classList.add('correct');
    quizFeedback.textContent = q.feedbackCorrect;
    quizFeedback.classList.add('correct');
    quizFeedback.style.display = 'block';
  } else {
    optionButtons[selectedIdx].classList.add('incorrect');
    optionButtons[q.correctIndex].classList.add('correct'); // reveal correct one
    quizFeedback.textContent = q.feedbackIncorrect;
    quizFeedback.classList.add('incorrect');
    quizFeedback.style.display = 'block';
  }
  
  quizScoreLive.textContent = `Score: ${quizScore}/${QUIZ_QUESTIONS.length}`;
}

btnNextQuestion.addEventListener('click', () => {
  currentQuestionIndex++;
  if (currentQuestionIndex < QUIZ_QUESTIONS.length) {
    loadQuizQuestion();
  } else {
    // Show End Screen
    quizQuestionBox.style.display = 'none';
    quizScoreBox.style.display = 'block';
    
    const pct = Math.round((quizScore / QUIZ_QUESTIONS.length) * 100);
    scorePercentage.textContent = pct + "%";
    scoreFraction.textContent = `${quizScore} / ${QUIZ_QUESTIONS.length} Correct`;
    
    const scoreFeedback = document.getElementById('score-feedback');
    if (quizScore === QUIZ_QUESTIONS.length) {
      scoreFeedback.innerHTML = `🧬 <strong>Perfect Score!</strong> You perfectly understand adhesion, cohesion, capillary action, and surface tension. You are ready to ace this section in Biology 101!`;
    } else if (quizScore >= 2) {
      scoreFeedback.innerHTML = `🌟 <strong>Great Job!</strong> You have a solid grasp of basic polar forces in water. Review the concepts inside the simulator tabs to score 100%!`;
    } else {
      scoreFeedback.innerHTML = `📚 <strong>Keep Learning!</strong> Water can be tricky. Try resetting the presets in the simulator to visually inspect concave vs. convex curves, and try again!`;
    }
  }
});

btnRestartQuiz.addEventListener('click', () => {
  currentQuestionIndex = 0;
  quizScore = 0;
  quizScoreBox.style.display = 'none';
  quizQuestionBox.style.display = 'flex';
  loadQuizQuestion();
});


// ==========================================================================
// STARTUP EXECUTION
// ==========================================================================
window.addEventListener('load', () => {
  resizeCanvas();
  updateUI();
  initWavePoints();
  loadQuizQuestion();
  
  // Start the frame tick
  tick();
});

// Handle browser resize cleanly
window.addEventListener('resize', () => {
  resizeCanvas();
  if (state.viewMode === 'macro') {
    initWavePoints();
  }
});
