// ═══════════════════════════════════════════════════════════════
//  SNAKE EVOLUTION v2
//  Red pequeña [6,8,4], 30 serpientes, mutación baja.
// ═══════════════════════════════════════════════════════════════

const COLS = 15;
const ROWS = 15;
const CELL = 30;
const W = COLS * CELL;
const H = ROWS * CELL;
const POP_SIZE = 30;
const ELITE_COUNT = 5;
const BRAIN_CONFIG = [6, 8, 4]; // foodDir, dangerUp/Down/Left/Right
const MOVE_INTERVAL = 5;
const MAX_MOVES = 250;

let snakes = [];
let generation = 0;
let globalFrame = 0;
let bestEver = 0;
let food = null;

function spawnFood() {
  let pos;
  // Evitar que aparezca encima de alguna serpiente
  const occupied = new Set();
  for (const s of snakes) {
    for (const seg of s.body) occupied.add(`${seg.x},${seg.y}`);
  }
  do {
    pos = { x: randomNumber(0, COLS - 1), y: randomNumber(0, ROWS - 1) };
  } while (occupied.has(`${pos.x},${pos.y}`));
  food = pos;
}

// ─── CLASE SNAKE AGENT ────────────────────────────────────────
class SnakeAgent {
  constructor() {
    this.brain = new NeuronalNetwork(BRAIN_CONFIG);
    this.dir = { x: 1, y: 0 };
    for (let i = 0; i < this.brain.Pesos.length; i++) {
      this.brain.Pesos[i].Multiply(0.6);
      this.brain.Bias[i].Multiply(0.2);
    }
    this.reset();
    this.isElite = false;
  }

  reset() {
    // Posición inicial aleatoria para evitar colisiones prematuras
    const mx = randomNumber(2, COLS - 3);
    const my = randomNumber(2, ROWS - 3);
    const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    const d = dirs[randomNumber(0, 3)];
    this.body = [
      { x: mx, y: my },
      { x: mx - d.x, y: my - d.y },
      { x: mx - d.x * 2, y: my - d.y * 2 },
    ];
    this.dir = { x: d.x, y: d.y };
    this.score = 0;
    this.moves = 0;
    this.alive = true;
    this.prevDist = food ? this.distToFood() : 999;
  }

  distToFood() {
    if (!this.body || !this.body[0] || !food) return 999;
    return abs(this.body[0].x - food.x) + abs(this.body[0].y - food.y);
  }

  /** Evalúa si (x,y) es peligroso (pared o cuerpo) */
  isDanger(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
    // Excluir la cola porque se moverá en el próximo paso
    for (let i = 0; i < this.body.length - 1; i++) {
      if (this.body[i].x === x && this.body[i].y === y) return true;
    }
    return false;
  }

  /** Ejecuta la red → decide la dirección */
  think() {
    this.dir = this.dir || { x: 1, y: 0 };
    
    if (!this.alive || !food) return;
    if (!this.body || !this.body[0]) return;
    
    const head = this.body[0];
    const dir = this.dir;

    // Inputs abstractos: dirección comida + peligro en 4 direcciones
    const inputs = [
      (food.x - head.x) / COLS,
      (food.y - head.y) / ROWS,
      this.isDanger(head.x, head.y - 1) ? 1 : -1,
      this.isDanger(head.x, head.y + 1) ? 1 : -1,
      this.isDanger(head.x - 1, head.y) ? 1 : -1,
      this.isDanger(head.x + 1, head.y) ? 1 : -1,
    ];

    const output = this.brain.Prediccion(inputs);

    const dirs = [
      { x: 0, y: -1, conf: output[0] },
      { x: 0, y: 1, conf: output[1] },
      { x: -1, y: 0, conf: output[2] },
      { x: 1, y: 0, conf: output[3] },
    ];

    // Usar un bucle for en lugar de filter + arrow function
    const valid = [];
    for (const d of dirs) {
      if (dir.x === -d.x && dir.y === -d.y) continue;
      valid.push(d);
    }

    valid.sort((a, b) => b.conf - a.conf);
    if (valid.length > 0) {
      this.dir = { x: valid[0].x, y: valid[0].y };
    }
  }

  /** Ejecuta el movimiento */
  move() {
    if (!this.alive) return;
    if (!this.dir) return;
    const head = this.body[0];
    if (!head) return;

    const nh = { x: head.x + this.dir.x, y: head.y + this.dir.y };

    // ¿Pared?
    if (nh.x < 0 || nh.x >= COLS || nh.y < 0 || nh.y >= ROWS) {
      this.alive = false;
      return;
    }

    // ¿Auto-colisión?
    for (let i = 0; i < this.body.length; i++) {
      if (this.body[i].x === nh.x && this.body[i].y === nh.y) {
        if (i === this.body.length - 1) break;
        this.alive = false;
        return;
      }
    }

    // ¿Colisión con otras serpientes?
    for (const other of snakes) {
      if (other === this || !other.alive) continue;
      for (const seg of other.body) {
        if (seg.x === nh.x && seg.y === nh.y) {
          this.alive = false;
          return;
        }
      }
    }

    // Mover: añadir cabeza
    this.body.unshift(nh);

    // ¿Comió? (compitiendo con todas las serpientes)
    if (food && nh.x === food.x && nh.y === food.y) {
      this.score += 10;
      spawnFood();
    } else {
      this.body.pop();
    }

    // Bonus por acercarse a la comida (gradiente más fuerte)
    const nd = this.distToFood();
    if (nd < this.prevDist) this.score += 0.3;
    this.prevDist = nd;

    this.moves++;

    // Timeout
    if (this.moves >= MAX_MOVES) {
      this.alive = false;
    }
  }

  draw() {
    if (!this.alive && this.score === 0) return;

    // Cuerpo
    for (let i = 0; i < this.body.length; i++) {
      const s = this.body[i];
      const px = s.x * CELL;
      const py = s.y * CELL;

      push();
      if (i === 0) {
        // Cabeza: elite es dorada, normales son verdes
        fill(this.isElite ? 255 : 50, this.isElite ? 215 : 220, this.isElite ? 0 : 50);
      } else {
        // Cuerpo: degradado verde
        const g = 180 - i * 2;
        fill(10, max(g, 40), 30);
      }
      noStroke();
      rect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);
      pop();
    }
  }
}

// ─── SETUP ────────────────────────────────────────────────────
function setup() {
  createCanvas(W + 200, H);
  for (let i = 0; i < POP_SIZE; i++) snakes.push(new SnakeAgent());
  spawnFood();
  textFont("monospace");
}

// ─── DRAW ─────────────────────────────────────────────────────
function draw() {
  background(15, 15, 25);

  // ── Grid ──
  push();
  stroke(40, 40, 60);
  strokeWeight(0.5);
  for (let x = 0; x <= COLS; x++) line(x * CELL, 0, x * CELL, H);
  for (let y = 0; y <= ROWS; y++) line(0, y * CELL, W, y * CELL);
  pop();

  // ── Comida global ──
  if (food) {
    const fx = food.x * CELL + CELL / 2;
    const fy = food.y * CELL + CELL / 2;
    push();
    fill(255, 50, 50);
    stroke(255, 100, 100);
    strokeWeight(2);
    circle(fx, fy, CELL * 0.8);
    pop();
  }

  // ── Serpientes ──
  let aliveCount = 0;
  for (const s of snakes) {
    if (s.alive) {
      aliveCount++;
      if (globalFrame % MOVE_INTERVAL === 0) {
        s.think();
        s.move();
      }
    }
    s.draw();
  }

  // ── Panel de info ──
  push();
  const px = W + 15;
  fill(255);
  noStroke();
  textSize(14);
  textAlign(LEFT);
  text("SNAKE EVOLUTION", px, 25);
  fill(150);
  textSize(12);
  text(`Generación: ${generation}`, px, 50);
  text(`Vivas: ${aliveCount}/${POP_SIZE}`, px, 70);

  fill(255, 215, 0);
  text(`Best ever: ${bestEver.toFixed(1)}`, px, 95);

  fill(100, 200, 255);
  textSize(11);
  text("Scores:", px, 120);

  // Lista de scores ordenados
  const sorted = [...snakes]
    .map((s, i) => ({ idx: i, score: s.score, alive: s.alive, elite: s.isElite }))
    .sort((a, b) => b.score - a.score);

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const yPos = 138 + i * 18;
    if (s.elite) fill(255, 215, 0);
    else if (s.alive) fill(100, 255, 100);
    else fill(100, 100, 100);
    text(
      `${s.elite ? "★" : " "} #${s.idx} ${s.score}${s.alive ? "" : " 💀"}`,
      px,
      yPos
    );
  }
  pop();

  globalFrame++;

  // ── ¿Todos muertos? ──
  if (aliveCount === 0) {
    evolve();
  }

  // Título informativo
  document.title = `Snake Gen ${generation} - Best: ${bestEver.toFixed(1)}`;
}

// ─── EVOLUCIÓN ────────────────────────────────────────────────
function evolve() {
  const elites = seleccion(snakes, ELITE_COUNT);

  // Actualizar best ever (score = comida atrapada)
  const genBest = Math.max(...snakes.map((s) => s.score));
  if (genBest > bestEver) bestEver = genBest;

  for (const e of elites) e.isElite = true;

  // Mostrar estadísticas
  const avgScore =
    snakes.reduce((sum, s) => sum + s.score, 0) / snakes.length;
  console.log(
    `Gen ${generation} | ` +
      `Best: ${genBest.toFixed(1)} | ` +
      `Avg: ${avgScore.toFixed(1)} | ` +
      `Ever: ${bestEver.toFixed(1)} | ` +
      `Alive: ${snakes.filter(s => s.alive).length}`
  );

  // Construir nueva generación
  const nextGen = [...elites];

  for (let i = ELITE_COUNT; i < POP_SIZE; i++) {
    const p1 = randomNumber(0, ELITE_COUNT - 1);
    const p2 = randomNumber(0, ELITE_COUNT - 1);

    const child = new SnakeAgent();
    child.brain = crossing(elites[p1], elites[p2]);
    mutation(child);
    nextGen.push(child);
  }

  snakes = nextGen;

  // Resetear todo
  for (const s of snakes) {
    s.reset();
    s.isElite = false;
  }

  globalFrame = 0;
  generation++;
}
