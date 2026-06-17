// ═══════════════════════════════════════════════════════════════
//  FLAPPY BIRD EVOLUTION
//  Pájaros con cerebros (NeuronalNetwork) aprenden a volar.
//  Inputs: birdY, pipeX, gapY → output: flap (1) o no (-1)
// ═══════════════════════════════════════════════════════════════

const W = 500;
const H = 600;
const POP_SIZE = 30;
const ELITE_COUNT = 5;
const BRAIN_CONFIG = [3, 6, 1]; // 3 inputs, 6 hidden, 1 output

const GRAVITY = 0.5;
const FLAP_VEL = -8;
const PIPE_W = 60;
const GAP = 150;
const PIPE_SPEED = 3;
const BIRD_R = 12;

let birds = [];
let pipes = [];
let generation = 0;
let bestEver = 0;
let globalFrame = 0;
let genFrameCount = 0;
const MAX_FRAMES_PER_GEN = 3000;

// ─── PIPE ─────────────────────────────────────────────────────
class Pipe {
  constructor() {
    this.x = W;
    this.w = PIPE_W;
    this.gapY = randomNumber(80, H - 80);
    this.gap = GAP;
    this.scored = new Set(); // qué pájaros ya puntuaron con este pipe
  }

  offscreen() { return this.x + this.w < 0; }

  show() {
    push();
    fill(80, 200, 80);
    noStroke();
    // Tubería superior
    rect(this.x, 0, this.w, this.gapY - this.gap / 2);
    // Tubería inferior
    rect(this.x, this.gapY + this.gap / 2, this.w, H);
    // Bordes
    fill(60, 160, 60);
    rect(this.x - 3, this.gapY - this.gap / 2 - 15, this.w + 6, 15);
    rect(this.x - 3, this.gapY + this.gap / 2, this.w + 6, 15);
    pop();
  }
}

// ─── BIRD ─────────────────────────────────────────────────────
class Bird {
  constructor() {
    this.brain = new NeuronalNetwork(BRAIN_CONFIG);
    for (let i = 0; i < this.brain.Pesos.length; i++) {
      this.brain.Pesos[i].Multiply(0.8);
      this.brain.Bias[i].Multiply(0.3);
    }
    this.reset();
    this.isElite = false;
  }

  reset() {
    this.x = 100;
    this.y = H / 2;
    this.vy = 0;
    this.score = 0;
    this.lifeFrames = 0;
    this.alive = true;
  }

  think() {
    if (!this.alive) return;

    // Encontrar el siguiente pipe
    let nextPipe = null;
    for (const p of pipes) {
      if (p.x + p.w > this.x) {
        nextPipe = p;
        break;
      }
    }

    if (!nextPipe) return;

    const inputs = [
      this.y / H,                              // posición vertical
      (nextPipe.x + nextPipe.w - this.x) / W,  // distancia horizontal al pipe
      (nextPipe.gapY - this.y) / H,            // diferencia con el gap
    ];

    const output = this.brain.Prediccion(inputs);

    // output[0] > 0 → flap
    if (output[0] > 0) {
      this.vy = FLAP_VEL;
    }
  }

  update() {
    if (!this.alive) return;

    this.vy += GRAVITY;
    this.y += this.vy;

    // Fitness por frame de vida
    this.score += 0.02;
    this.lifeFrames++;

    // Suelo / techo
    if (this.y < 0 || this.y > H) {
      this.alive = false;
      return;
    }

    // Colisión con pipes
    for (const p of pipes) {
      if (this.x + BIRD_R > p.x && this.x - BIRD_R < p.x + p.w) {
        if (this.y - BIRD_R < p.gapY - p.gap / 2 ||
            this.y + BIRD_R > p.gapY + p.gap / 2) {
          this.alive = false;
          return;
        }
      }
      // Bonus GRANDE por pasar un pipe
      if (!p.scored.has(this) && p.x + p.w < this.x) {
        p.scored.add(this);
        this.score += 10;
      }
    }
  }

  show() {
    if (!this.alive) return;
    push();
    fill(this.isElite ? 255 : 255, this.isElite ? 215 : 200, this.isElite ? 0 : 50);
    noStroke();
    ellipse(this.x, this.y, BIRD_R * 2);
    pop();
  }
}

// ─── SETUP ────────────────────────────────────────────────────
function setup() {
  createCanvas(W + 180, H);
  for (let i = 0; i < POP_SIZE; i++) birds.push(new Bird());
  pipes.push(new Pipe());
  textFont('monospace');
}

// ─── DRAW ─────────────────────────────────────────────────────
function draw() {
  background(30, 30, 50);

  // ── Fondo ──
  push();
  stroke(50, 50, 80);
  strokeWeight(1);
  for (let x = 0; x < W; x += 40) line(x, 0, x, H);
  for (let y = 0; y < H; y += 40) line(0, y, W, y);
  pop();

  // ── Pipes ──
  for (const p of pipes) {
    p.x -= PIPE_SPEED;
    p.show();
  }

  // Eliminar pipes fuera de pantalla
  pipes = pipes.filter(p => !p.offscreen());

  // Generar nuevos pipes
  if (pipes.length === 0 || pipes[pipes.length - 1].x < W - 220) {
    pipes.push(new Pipe());
  }

  // ── Pájaros ──
  let aliveCount = 0;
  for (const b of birds) {
    if (b.alive) {
      aliveCount++;
      b.think();
      b.update();
    }
    b.show();
  }

  // Actualizar best ever
  const currentBest = Math.max(...birds.map(b => b.score));
  if (currentBest > bestEver) bestEver = currentBest;

  // ── Panel info ──
  push();
  const px = W + 15;
  fill(255);
  noStroke();
  textSize(14);
  text('FLAPPY EVOLUTION', px, 25);
  fill(150);
  textSize(12);
  text(`Generación: ${generation}`, px, 50);
  text(`Vivos: ${aliveCount}/${POP_SIZE}`, px, 70);

  fill(255, 215, 0);
  text(`Best ever: ${bestEver}`, px, 95);

  fill(100, 200, 255);
  textSize(11);
  text('Scores:', px, 120);

  const sorted = [...birds]
    .map((b, i) => ({ i, s: b.score, a: b.alive, e: b.isElite }))
    .sort((a, b) => b.s - a.s);

  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    const yp = 138 + i * 16;
    if (b.e) fill(255, 215, 0);
    else if (b.a) fill(100, 255, 100);
    else fill(80, 80, 80);
    text(`${b.e ? '★' : ' '}#${b.i} ${b.s.toFixed(1)}${b.a ? '' : ' 💀'}`, px, yp);
  }
  pop();

  globalFrame++;
  genFrameCount++;

  // ── Evolución ──
  if (aliveCount === 0 || genFrameCount > MAX_FRAMES_PER_GEN) {
    evolve();
  }

  document.title = `Flappy Gen ${generation} - Best: ${bestEver.toFixed(1)} - Alive: ${aliveCount}`;
}

// ─── EVOLUCIÓN ────────────────────────────────────────────────
function evolve() {
  const elites = seleccion(birds, ELITE_COUNT);

  for (const e of elites) e.isElite = true;

  const genBest = Math.max(...birds.map(b => b.score));
  if (genBest > bestEver) bestEver = genBest;
  const avg = birds.reduce((s, b) => s + b.score, 0) / birds.length;

  console.log(
    `Gen ${generation} | Best: ${genBest} | Avg: ${avg.toFixed(1)} | Ever: ${bestEver}`
  );

  const nextGen = [...elites];

  for (let i = ELITE_COUNT; i < POP_SIZE; i++) {
    const p1 = randomNumber(0, ELITE_COUNT - 1);
    const p2 = randomNumber(0, ELITE_COUNT - 1);

    const child = new Bird();
    child.brain = crossing(elites[p1], elites[p2]);
    mutation(child);
    nextGen.push(child);
  }

  birds = nextGen;

  for (const b of birds) {
    b.reset();
    b.isElite = false;
  }

  pipes = [new Pipe()];
  genFrameCount = 0;
  generation++;
}
