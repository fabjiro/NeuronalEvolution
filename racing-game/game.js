// ═══════════════════════════════════════════════════════════════
//  RACING EVOLUTION 3D - VERSIÓN FINAL (OPTIMIZADO + RANKING + CÁMARA)
// ═══════════════════════════════════════════════════════════════

// 1. DICCIONARIO DE CONFIGURACIÓN CENTRALIZADO
const CONFIG = {
  CANVAS: { W: 800, H: 600, BG_COLOR: [135, 206, 235] },
  NEAT: { POP_SIZE: 60, ELITE_COUNT: 4, MAX_FRAMES: 4000 },
  BRAIN: { SENSORS: 3, HIDDEN: 5, OUTPUTS: 1 },
  CAR: { 
    SPEED: 3.5, 
    MAX_TURN: 0.08, 
    SENSOR_ANGLES: [-0.8, 0, 0.8], 
    SENSOR_MAX_DIST: 300 
  },
  TRACK: { POINTS: 60, WIDTH: 80, BASE_RADIUS: 250 }
};

// 2. ESTADO GLOBAL DEL JUEGO
let gameState = {
  cars: [],
  track: [],
  generation: 1,
  bestEverScore: 0,
  framesAlive: 0,
  hallOfFame: [],
  cameraFollow: true // ← Nueva variable para el control de cámara
};

let camButton; // Variable para nuestro botón

// ─── GENERACIÓN DE PISTA PARAMETRIZADA ─────────────────────────
function generateTrack() {
  const pts = [];
  const N = CONFIG.TRACK.POINTS;
  
  for (let i = 0; i < N; i++) {
    const t = (i / N) * TWO_PI;
    const rx = CONFIG.TRACK.BASE_RADIUS + 70 * sin(t * 2) + 20 * cos(t * 4);  
    const ry = (CONFIG.TRACK.BASE_RADIUS - 50) + 60 * sin(t * 3);
    
    pts.push({ 
      x: (CONFIG.CANVAS.W / 2) + rx * cos(t), 
      z: (CONFIG.CANVAS.H / 2) + ry * sin(t) 
    });
  }

  for (let i = 0; i < N; i++) {
    const p = pts[i];
    const next = pts[(i + 1) % N];
    const prev = pts[(i - 1 + N) % N];
    
    let nx = -(next.z - prev.z);
    let nz = next.x - prev.x;
    const len = Math.hypot(nx, nz);
    nx /= len; nz /= len;
    
    p.outer = { x: p.x + nx * CONFIG.TRACK.WIDTH / 2, z: p.z + nz * CONFIG.TRACK.WIDTH / 2 };
    p.inner = { x: p.x - nx * CONFIG.TRACK.WIDTH / 2, z: p.z - nz * CONFIG.TRACK.WIDTH / 2 };
  }
  return pts;
}

// ─── MATEMÁTICAS UTILITARIAS OPTIMIZADAS ───────────────────────
function distSq(x1, y1, x2, y2) { return (x2 - x1) ** 2 + (y2 - y1) ** 2; }

function getSegmentDistance(px, pz, a, b) {
  const l2 = distSq(a.x, a.z, b.x, b.z);
  if (l2 === 0) return distSq(px, pz, a.x, a.z);
  let t = ((px - a.x) * (b.x - a.x) + (pz - a.z) * (b.z - a.z)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(distSq(px, pz, a.x + t * (b.x - a.x), a.z + t * (b.z - a.z)));
}

// ─── CLASE CAR ─────────────────────────────────────────────────
class Car {
  constructor(brain = null) {
    this.brain = brain || new NeuronalNetwork([CONFIG.BRAIN.SENSORS, CONFIG.BRAIN.HIDDEN, CONFIG.BRAIN.OUTPUTS]);
    if (!brain) {
      for (let i = 0; i < this.brain.Pesos.length; i++) {
        this.brain.Pesos[i].Multiply(0.8);
        this.brain.Bias[i].Multiply(0.3);
      }
    }
    this.isElite = false;
    this.reset();
  }

  reset() {
    this.pos = { x: gameState.track[0].x, z: gameState.track[0].z };
    this.heading = atan2(gameState.track[1].z - gameState.track[0].z, gameState.track[1].x - gameState.track[0].x);
    this.score = 0;
    this.alive = true;
    this.currentCheckpoint = 0;
    this.sensorReadings = new Array(CONFIG.BRAIN.SENSORS).fill(0);
  }

  getDistanceFromTrack(px, pz) {
    // Si se pasan coordenadas explícitas (sensores), usarlas; si no, usar this.pos
    const x = px !== undefined ? px : this.pos.x;
    const z = pz !== undefined ? pz : this.pos.z;
    let minDist = Infinity;
    const checkRange = 3; 
    const N = gameState.track.length;
    for (let offset = -checkRange; offset <= checkRange; offset++) {
      let idx = (this.currentCheckpoint + offset + N) % N;
      let nextIdx = (idx + 1) % N;
      const d = getSegmentDistance(x, z, gameState.track[idx], gameState.track[nextIdx]);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  updateSensors() {
    for (let i = 0; i < CONFIG.BRAIN.SENSORS; i++) {
      const angle = this.heading + CONFIG.CAR.SENSOR_ANGLES[i];
      let distance = 0;
      const step = 8; 
      while (distance < CONFIG.CAR.SENSOR_MAX_DIST) {
        distance += step;
        const testX = this.pos.x + Math.cos(angle) * distance;
        const testZ = this.pos.z + Math.sin(angle) * distance;
        if (this.getDistanceFromTrack(testX, testZ) > CONFIG.TRACK.WIDTH / 2) break;
      }
      this.sensorReadings[i] = distance / CONFIG.CAR.SENSOR_MAX_DIST;
    }
  }

  updateLogic() {
    if (!this.alive) return;
    this.updateSensors();
    const action = this.brain.Prediccion(this.sensorReadings);
    this.heading += action[0] * CONFIG.CAR.MAX_TURN;

    this.pos.x += Math.cos(this.heading) * CONFIG.CAR.SPEED;
    this.pos.z += Math.sin(this.heading) * CONFIG.CAR.SPEED;

    if (this.getDistanceFromTrack() > CONFIG.TRACK.WIDTH / 2) {
      this.alive = false;
      return;
    }

    const nextCp = (this.currentCheckpoint + 1) % gameState.track.length;
    const distToNext = distSq(this.pos.x, this.pos.z, gameState.track[nextCp].x, gameState.track[nextCp].z);
    const distToCurrent = distSq(this.pos.x, this.pos.z, gameState.track[this.currentCheckpoint].x, gameState.track[this.currentCheckpoint].z);

    if (distToNext < distToCurrent) {
      this.currentCheckpoint = nextCp;
      this.score += 1.0; 
    } else {
      this.score += 0.02; 
    }
  }

  render(isBest) {
    push();
    translate(this.pos.x, 6, this.pos.z);
    rotateY(-this.heading + PI / 2);

    if (this.isElite) fill(255, 215, 0); 
    else fill(40, 150 + 80 * sin(this.score), 200); 
    
    specularMaterial(200);
    shininess(30);

    box(24, 8, 42);

    push();
    translate(0, 6, -4);
    fill(20); 
    box(16, 6, 20);
    pop();

    fill(10);
    noStroke();
    let rx = 14, rz = 14, ry = -2;
    push(); translate(rx, ry, rz); rotateZ(PI/2); cylinder(5, 4); pop();
    push(); translate(-rx, ry, rz); rotateZ(PI/2); cylinder(5, 4); pop();
    push(); translate(rx, ry, -rz); rotateZ(PI/2); cylinder(5, 4); pop();
    push(); translate(-rx, ry, -rz); rotateZ(PI/2); cylinder(5, 4); pop();

    push();
    translate(8, 2, 21);
    fill(255, 255, 200);
    box(4, 3, 2);
    translate(-16, 0, 0);
    box(4, 3, 2);
    pop();

    if (isBest && this.alive) {
      strokeWeight(2);
      for (let i = 0; i < CONFIG.BRAIN.SENSORS; i++) {
        const a = CONFIG.CAR.SENSOR_ANGLES[i];
        const d = this.sensorReadings[i] * CONFIG.CAR.SENSOR_MAX_DIST;
        
        if (this.sensorReadings[i] < 0.9) stroke(255, 50, 50, 200);
        else stroke(50, 255, 50, 100);
        
        const endX = Math.sin(a) * d;
        const endZ = Math.cos(a) * d;
        line(0, 2, 21, endX, 2, 21 + endZ);
      }
    }
    pop();
  }
}

// ─── SETUP Y BOTÓN DE CÁMARA ──────────────────────────────────
function setup() {
  createCanvas(CONFIG.CANVAS.W, CONFIG.CANVAS.H, WEBGL);
  setAttributes('antialias', true);
  textFont('monospace');
  
  gameState.track = generateTrack();
  for (let i = 0; i < CONFIG.NEAT.POP_SIZE; i++) {
    gameState.cars.push(new Car());
  }

  // Crear botón HTML para alternar la cámara
  camButton = createButton('📷 Cámara: SIGUIENDO');
  camButton.style('position', 'absolute');
  camButton.style('top', '20px');
  camButton.style('right', '20px');
  camButton.style('padding', '10px 15px');
  camButton.style('background-color', '#4CAF50'); // Verde
  camButton.style('color', 'white');
  camButton.style('border', 'none');
  camButton.style('border-radius', '8px');
  camButton.style('font-family', 'monospace');
  camButton.style('font-weight', 'bold');
  camButton.style('cursor', 'pointer');
  camButton.style('box-shadow', '0 4px 6px rgba(0,0,0,0.3)');

  // Evento al hacer clic
  camButton.mousePressed(() => {
    gameState.cameraFollow = !gameState.cameraFollow; // Alternar estado
    
    // Cambiar estilos y texto dependiendo del estado
    if (gameState.cameraFollow) {
      camButton.html('📷 Cámara: SIGUIENDO');
      camButton.style('background-color', '#4CAF50');
    } else {
      camButton.html('🎥 Cámara: ESTÁTICA');
      camButton.style('background-color', '#f44336'); // Rojo
    }
  });
}

// ─── DRAW ─────────────────────────────────────────────────────
function draw() {
  background(CONFIG.CANVAS.BG_COLOR);
  
  let aliveCount = 0;
  let bestCar = gameState.cars[0];

  // 1. Lógica
  for (const car of gameState.cars) {
    if (car.alive) {
      aliveCount++;
      car.updateLogic();
    }
    if (car.score > bestCar.score) bestCar = car;
  }

  // 2. Control Lógico de la Cámara 
  if (gameState.cameraFollow) {
    // Modo Seguir al Mejor Coche
    const camDist = 280, camHeight = 180;
    const cx = bestCar.pos.x + cos(bestCar.heading - PI / 2) * camDist;
    const cz = bestCar.pos.z + sin(bestCar.heading - PI / 2) * camDist;
    camera(cx, camHeight, cz, bestCar.pos.x, 0, bestCar.pos.z, 0, -1, 0);
  } else {
    // Modo Panorámico (Vista de pájaro de toda la pista)
    camera(CONFIG.CANVAS.W / 2, 750, CONFIG.CANVAS.H / 2 + 100, // Posición cámara (Alta en Y)
           CONFIG.CANVAS.W / 2, 0, CONFIG.CANVAS.H / 2,       // Mirando al centro
           0, 0, -1);                                         // Eje arriba
  }

  // 3. Luces y Entorno
  ambientLight(80, 80, 90);
  directionalLight(255, 250, 240, 0.5, 1, -0.7);

  // Suelo
  push();
  fill(34, 139, 34); 
  noStroke();
  translate(CONFIG.CANVAS.W/2, -1, CONFIG.CANVAS.H/2);
  box(2000, 2, 2000); 
  pop();

  // Pista (Asfalto)
  push();
  fill(50, 50, 55); 
  noStroke();
  beginShape(TRIANGLE_STRIP);
  for (let i = 0; i <= gameState.track.length; i++) {
    const pt = gameState.track[i % gameState.track.length];
    vertex(pt.inner.x, 0, pt.inner.z);
    vertex(pt.outer.x, 0, pt.outer.z);
  }
  endShape();

  // Bordes (Pianos)
  strokeWeight(6);
  for (let i = 0; i < gameState.track.length; i++) {
    const p1 = gameState.track[i];
    const p2 = gameState.track[(i + 1) % gameState.track.length];
    stroke(i % 2 === 0 ? color(200, 30, 30) : color(240, 240, 240));
    line(p1.outer.x, 1, p1.outer.z, p2.outer.x, 1, p2.outer.z);
    line(p1.inner.x, 1, p1.inner.z, p2.inner.x, 1, p2.inner.z);
  }
  pop();

  // Dibujar Coches
  for (const car of gameState.cars) {
    car.render(car === bestCar);
  }

  // 4. Evolución
  gameState.framesAlive++;
  if (aliveCount === 0 || gameState.framesAlive > CONFIG.NEAT.MAX_FRAMES) {
    evolve();
  }

  // 5. Dibujar Interfaz
  drawHUD(aliveCount);
}

// ─── EVOLUCIÓN (ALGORITMO GENÉTICO) ───────────────────────────
function evolve() {
  const elites = seleccion(gameState.cars, CONFIG.NEAT.ELITE_COUNT);
  for (const e of elites) e.isElite = true;

  const genBestCar = gameState.cars.reduce((best, c) => c.score > best.score ? c : best, gameState.cars[0]);
  const genBestScore = genBestCar.score;

  if (genBestScore > gameState.bestEverScore) gameState.bestEverScore = genBestScore;
  
  // Récords Históricos
  gameState.hallOfFame.push({ gen: gameState.generation, score: genBestScore });
  gameState.hallOfFame.sort((a, b) => b.score - a.score);
  gameState.hallOfFame = gameState.hallOfFame.slice(0, 5);

  const avg = gameState.cars.reduce((s,c) => s + c.score, 0) / gameState.cars.length;
  console.log(`Gen ${gameState.generation} | Best: ${genBestScore.toFixed(1)} | Avg: ${avg.toFixed(1)}`);

  const nextGen = [...elites];
  
  for (let i = CONFIG.NEAT.ELITE_COUNT; i < CONFIG.NEAT.POP_SIZE; i++) {
    const p1 = randomNumber(0, CONFIG.NEAT.ELITE_COUNT - 1);
    const p2 = randomNumber(0, CONFIG.NEAT.ELITE_COUNT - 1);
    
    const child = new Car();
    child.brain = crossing(elites[p1], elites[p2]); 
    mutation(child);
    nextGen.push(child);
  }

  gameState.cars = nextGen;
  for (const c of gameState.cars) { 
    c.reset(); 
    c.isElite = false; 
  }
  
  gameState.framesAlive = 0;
  gameState.generation++;
}

// ─── HUD 2D CON RANKING ───────────────────────────────────────
function drawHUD(aliveCount) {
  push();
  camera(0, 0, 0, 0, 0, -1, 0, 1, 0);
  resetMatrix();
  
  fill(0, 0, 0, 170);
  noStroke();
  rect(-CONFIG.CANVAS.W/2 + 5, -CONFIG.CANVAS.H/2 + 5, 210, 260, 10);

  fill(255);
  textSize(14);
  textAlign(LEFT);
  text(`Generación: ${gameState.generation}`, -CONFIG.CANVAS.W/2 + 15, -CONFIG.CANVAS.H/2 + 25);
  text(`Vivos: ${aliveCount}/${CONFIG.NEAT.POP_SIZE}`, -CONFIG.CANVAS.W/2 + 15, -CONFIG.CANVAS.H/2 + 45);
  
  fill(255, 165, 0); 
  textSize(13);
  text('🏆 TOP RÉCORDS HISTÓRICOS:', -CONFIG.CANVAS.W/2 + 15, -CONFIG.CANVAS.H/2 + 75);
  
  for (let i = 0; i < gameState.hallOfFame.length; i++) {
    const record = gameState.hallOfFame[i];
    if (i === 0) fill(255, 215, 0); 
    else if (i === 1) fill(192, 192, 192); 
    else if (i === 2) fill(205, 127, 50); 
    else fill(200, 200, 200); 

    text(`${i+1}º - Gen ${record.gen} (Pts: ${record.score.toFixed(1)})`, -CONFIG.CANVAS.W/2 + 15, -CONFIG.CANVAS.H/2 + 95 + (i * 18));
  }
  
  fill(100, 200, 255);
  textSize(12);
  text('🏁 LÍDERES ACTUALES:', -CONFIG.CANVAS.W/2 + 15, -CONFIG.CANVAS.H/2 + 195);
  
  const sorted = [...gameState.cars].map((c,i)=>({i,s:c.score,a:c.alive,e:c.isElite})).sort((a,b)=>b.s-a.s);
  for (let i = 0; i < Math.min(sorted.length, 3); i++) {
    const c = sorted[i];
    const yp = -CONFIG.CANVAS.H/2 + 215 + (i * 16);
    if (c.e) fill(255, 215, 0); else if (c.a) fill(100,255,100); else fill(150,150,150);
    text(`${c.e?'★':' '}#${c.i} - Pts: ${c.s.toFixed(1)} ${c.a?'':' 💀'}`, -CONFIG.CANVAS.W/2 + 15, yp);
  }
  pop();
}