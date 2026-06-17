// ═══════════════════════════════════════════════════════════════
//  TEST GAME v2: "Multi-Food Foraging"
//  Propósito: Verificar que el algoritmo genético + red neuronal
//  realmente aprenden. Múltiples comidas simultáneas + feedback
//  continuo por cercanía = señal de fitness clara y rápida.
// ═══════════════════════════════════════════════════════════════

const W = 900;
const H = 400;
const POP_SIZE = 10;
const ELITE_COUNT = 2;
const BRAIN_CONFIG = [2, 1];     // inputs: [agentX, nearestFoodX]
const FOOD_COUNT = 5;            // comidas simultáneas
const FOOD_TIMEOUT = 300;        // frames por comida (~5s)
const MAX_FRAMES_PER_GEN = 450;  // frames máximos por generación (~7.5s)
const SPEED = 4;
const CATCH_R = 18;
const PROXIMITY_BONUS = 0.005;    // puntos por frame si está cerca (<100px)
const CATCH_BONUS = 3;           // puntos por atrapar comida

let agents = [];
let foods = [];
let generation = 0;
let frameCountGen = 0;
let bestScoreEver = 0;

// ─── CLASE FOOD ───────────────────────────────────────────────
class Food {
  constructor() {
    this.x = randomNumber(20, W - 20);
    this.y = H - 30;
    this.r = 12;
    this.age = 0;
    this.active = true;
  }

  show() {
    if (!this.active) return;
    push();
    const pulse = 200 + 55 * sin(frameCount * 0.05);
    fill(pulse, 80, 30);
    stroke(255, 200, 50);
    strokeWeight(2);
    circle(this.x, this.y, this.r * 2);
    fill(255, 220, 100);
    noStroke();
    circle(this.x, this.y, this.r * 0.6);
    pop();
  }
}

// ─── CLASE AGENT ──────────────────────────────────────────────
class Agent {
  constructor() {
    this.x = randomNumber(0, W);
    this.y = H - 30;
    this.score = 0;
    this.brain = new NeuronalNetwork(BRAIN_CONFIG);
    for (let i = 0; i < this.brain.Pesos.length; i++) {
      this.brain.Pesos[i].Multiply(1.0);
      this.brain.Bias[i].Multiply(0.3);
    }
    this.isElite = false;
  }

  nearestFood() {
    let best = null;
    let bestDist = Infinity;
    for (const f of foods) {
      if (!f.active) continue;
      const d = abs(this.x - f.x);
      if (d < bestDist) {
        bestDist = d;
        best = f;
      }
    }
    return best;
  }

  predict() {
    const target = this.nearestFood();
    if (!target) return;

    const inputs = [this.x / W, target.x / W];
    const output = this.brain.Prediccion(inputs);

    // tanh(-1..1) → probabilidad de ir a la derecha (0..1)
    const probRight = (output[0] + 1) / 2;

    if (Math.random() < probRight) {
      this.x += SPEED;
    } else {
      this.x -= SPEED;
    }

    if (this.x < 0) { this.x = 2; }
    if (this.x > W) { this.x = W - 2; }
  }

  updateScore() {
    const target = this.nearestFood();
    if (!target) return false;

    const d = dist(this.x, this.y, target.x, target.y);

    // Bonus por proximidad cada frame
    if (d < 100) {
      this.score += PROXIMITY_BONUS * (100 - d) / 100;
    }

    // Captura
    if (d < CATCH_R) {
      this.score += CATCH_BONUS;
      target.active = false;
      return true;
    }
    return false;
  }

  show() {
    push();
    rectMode(CENTER);

    if (this.isElite) {
      fill(255, 215, 0, 220);
      stroke(255, 255, 200);
      strokeWeight(2);
    } else {
      const intensity = map(this.score, 0, 15, 80, 255);
      fill(0, intensity, 50, 180);
      stroke(100, 255, 100);
      strokeWeight(1);
    }

    rect(this.x, this.y, 22, 22);

    noStroke();
    fill(255);
    textSize(10);
    textAlign(CENTER);
    text(this.score.toFixed(1), this.x, this.y - 16);
    pop();
  }
}

// ─── SETUP ────────────────────────────────────────────────────
function setup() {
  createCanvas(W, H);

  for (let i = 0; i < POP_SIZE; i++) {
    agents.push(new Agent());
  }

  for (let i = 0; i < FOOD_COUNT; i++) {
    foods.push(new Food());
  }

  textFont('monospace');
}

// ─── DRAW ─────────────────────────────────────────────────────
function draw() {
  background(20, 20, 35);

  // Info
  push();
  fill(255);
  noStroke();
  textSize(14);
  textAlign(LEFT);
  text(`Generación: ${generation}`, 15, 25);
  text(`Frame: ${frameCountGen} / ${MAX_FRAMES_PER_GEN}`, 15, 45);

  fill(255, 215, 0);
  text(`Best ever: ${bestScoreEver.toFixed(1)}`, 15, 65);

  // Debug: output del primer agente
  if (agents.length > 0) {
    const a = agents[0];
    const t = a.nearestFood();
    if (t) {
      const ins = [a.x / W, t.x / W];
      const out = a.brain.Prediccion(ins);
      fill(100, 200, 255);
      textSize(11);
      text(`in: [${nf(ins[0],1,2)}, ${nf(ins[1],1,2)}]`, W - 280, 25);
      text(`out: ${nf(out[0],1,3)}`, W - 280, 42);
      text(`score: ${agents[0].score.toFixed(1)}`, W - 280, 59);
    }
  }
  pop();

  // Comidas
  for (const f of foods) {
    if (f.active) {
      f.show();
      f.age++;
    }
  }

  // Reponer comidas vencidas o atrapadas
  for (let i = foods.length - 1; i >= 0; i--) {
    if (!foods[i].active || foods[i].age > FOOD_TIMEOUT) {
      foods[i] = new Food();
    }
  }

  while (foods.filter(f => f.active).length < FOOD_COUNT) {
    foods.push(new Food());
  }

  // Agentes
  for (const agent of agents) {
    agent.predict();
    agent.updateScore();
    agent.show();
  }

  // Fin de generación
  frameCountGen++;

  if (frameCountGen >= MAX_FRAMES_PER_GEN) {
    evolve();
  }
}

// ─── EVOLUCIÓN ────────────────────────────────────────────────
function evolve() {
  const elites = seleccion(agents, ELITE_COUNT);

  const genBest = Math.max(...agents.map(a => a.score));
  if (genBest > bestScoreEver) {
    bestScoreEver = genBest;
  }

  for (const e of elites) e.isElite = true;

  const nextGen = [...elites];

  for (let i = ELITE_COUNT; i < POP_SIZE; i++) {
    const p1 = randomNumber(0, ELITE_COUNT - 1);
    const p2 = randomNumber(0, ELITE_COUNT - 1);

    const child = new Agent();
    child.brain = crossing(elites[p1], elites[p2]);
    mutation(child);

    nextGen.push(child);
  }

  console.log(
    `Gen ${generation} | ` +
    `Best: ${genBest.toFixed(1)} | ` +
    `Ever: ${bestScoreEver.toFixed(1)} | ` +
    `Elites: [${elites[0].score.toFixed(1)}, ${elites[1].score.toFixed(1)}]`
  );

  agents = nextGen;

  for (const a of agents) {
    a.score = 0;
    a.x = randomNumber(0, W);
    a.isElite = false;
  }

  foods = [];
  for (let i = 0; i < FOOD_COUNT; i++) {
    foods.push(new Food());
  }

  frameCountGen = 0;
  generation++;
}
