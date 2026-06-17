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

let camButton, exportButton, importButton, importFileInput, randomMapButton;

// ─── GENERACIÓN DE PISTA PARAMETRIZADA ─────────────────────────
/**
 * Genera una pista con parámetros configurables.
 * @param {Object} opts - Parámetros de forma (opcional, usa defaults si no se pasan)
 */
function generateTrack(opts = {}) {
  const {
    freq1 = 2,   amp1 = 70,
    freq2 = 4,   amp2 = 20,
    freq3 = 3,   amp3 = 60,
    baseRx = CONFIG.TRACK.BASE_RADIUS,
    baseRy = CONFIG.TRACK.BASE_RADIUS - 50
  } = opts;

  const pts = [];
  const N = CONFIG.TRACK.POINTS;
  
  for (let i = 0; i < N; i++) {
    const t = (i / N) * TWO_PI;
    const rx = baseRx + amp1 * sin(t * freq1) + amp2 * cos(t * freq2);  
    const ry = baseRy + amp3 * sin(t * freq3);
    
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

/**
 * Genera una pista con parámetros aleatorios (formas variadas pero siempre driveables).
 */
function generateRandomTrack() {
  // Frecuencias: entre 1 y 6, asegurando que no sean iguales para variedad
  const f1 = randomNumber(1, 3);
  const f2 = randomNumber(2, 5);
  const f3 = randomNumber(1, 4);

  // Amplitudes: mantienen la pista dentro de límites razonables
  const a1 = randomNumber(30, 100);
  const a2 = randomNumber(10, 50);
  const a3 = randomNumber(20, 80);

  // Radio base: variación moderada para mantener la pista centrada
  const baseRx = randomNumber(200, 300);
  const baseRy = randomNumber(150, 250);

  return generateTrack({
    freq1: f1, amp1: a1,
    freq2: f2, amp2: a2,
    freq3: f3, amp3: a3,
    baseRx, baseRy
  });
}

/**
 * Reinicia la simulación con una nueva pista aleatoria,
 * pero CONSERVA los cerebros actuales (no pierde lo aprendido).
 */
function regenerateTrack() {
  gameState.track = generateRandomTrack();

  // Conservar los cerebros existentes, solo resetear posiciones y scores
  for (const c of gameState.cars) {
    c.reset();
  }
  gameState.framesAlive = 0;
  gameState.generation = 1;
  gameState.bestEverScore = 0;
  gameState.hallOfFame = [];

  console.log('🗺️  Nuevo mapa generado | Cerebros conservados |',
    `${gameState.cars.length} coches adaptándose al nuevo circuito`);
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
    const halfW = CONFIG.TRACK.WIDTH / 2;
    const checkRange = 5;
    const N = gameState.track.length;

    // 1º Buscar el segmento donde el coche proyecta (t ∈ [0,1])
    //    y usar distancia PERPENDICULAR real (sin clamping a endpoints)
    let bestPerpDist = Infinity;
    let foundProjected = false;

    for (let offset = -checkRange; offset <= checkRange; offset++) {
      const idx = (this.currentCheckpoint + offset + N) % N;
      const nextIdx = (idx + 1) % N;
      const a = gameState.track[idx];
      const b = gameState.track[nextIdx];

      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const l2 = dx * dx + dz * dz;
      if (l2 === 0) continue;

      // Parámetro de proyección (sin clamp)
      const t = ((x - a.x) * dx + (z - a.z) * dz) / l2;

      if (t >= 0 && t <= 1) {
        // El coche proyecta sobre este segmento → distancia perpendicular real
        foundProjected = true;
        const projX = a.x + t * dx;
        const projZ = a.z + t * dz;
        const perpDist = Math.sqrt((x - projX) ** 2 + (z - projZ) ** 2);
        if (perpDist < bestPerpDist) bestPerpDist = perpDist;
      }
    }

    if (foundProjected) {
      return bestPerpDist;
    }

    // 2º Si no proyecta en ningún segmento (fuera del circuito),
    //    buscar el centro de pista más cercano como fallback
    let minDist = Infinity;
    for (let offset = -checkRange; offset <= checkRange; offset++) {
      const idx = (this.currentCheckpoint + offset + N) % N;
      const d = Math.sqrt((x - gameState.track[idx].x) ** 2 + (z - gameState.track[idx].z) ** 2);
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

  /**
   * Devuelve un color p5.js en formato [r,g,b,alpha] basado en la lectura del sensor.
   * Degradado continuo: rojo (peligro) → amarillo (precaución) → verde (seguro).
   * @param {number} reading - Valor normalizado [0,1] donde 0 = borde muy cerca
   */
  sensorColor(reading) {
    // reading: 0 = pegado al borde, 1 = sin borde a la vista
    if (reading < 0.25) {
      // Rojo → Naranja (0.00 → 0.25)
      const t = reading / 0.25;
      return [255, Math.floor(50 + 115 * t), 50, 230];
    } else if (reading < 0.55) {
      // Naranja → Amarillo (0.25 → 0.55)
      const t = (reading - 0.25) / 0.30;
      return [255, Math.floor(165 + 90 * t), 50, 220];
    } else if (reading < 0.80) {
      // Amarillo → Verde (0.55 → 0.80)
      const t = (reading - 0.55) / 0.25;
      return [Math.floor(255 - 205 * t), 255, Math.floor(50 + 50 * t), 210];
    } else {
      // Verde brillante (0.80 → 1.00)
      return [50, 255, 100, 200];
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

    // Sensores láser: solo en el mejor coche
    if (isBest && this.alive) {

      for (let i = 0; i < CONFIG.BRAIN.SENSORS; i++) {
        const a = CONFIG.CAR.SENSOR_ANGLES[i];
        const reading = this.sensorReadings[i];
        const d = reading * CONFIG.CAR.SENSOR_MAX_DIST;
        
        // Color degradado según peligro
        const [cr, cg, cb, ca] = this.sensorColor(reading);
        
        // Línea del láser
        strokeWeight(3);
        stroke(cr, cg, cb, ca);
        const endX = Math.sin(a) * d;
        const endZ = Math.cos(a) * d;
        line(0, 2, 21, endX, 2, 21 + endZ);

        // Esfera de impacto en el extremo del láser
        if (reading < 0.99) {
          // Solo si el láser chocó con algo (no llegó al máximo)
          push();
          noStroke();
          fill(cr, cg, cb, ca);
          emissiveMaterial(cr, cg, cb);
          translate(endX, 2, 21 + endZ);
          sphere(3);
          pop();
        }
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

  // ─── BOTÓN EXPORTAR ──────────────────────────────────────
  const btnStyle = (btn, bgColor, top) => {
    btn.style('position', 'absolute');
    btn.style('top', top);
    btn.style('right', '20px');
    btn.style('padding', '8px 12px');
    btn.style('background-color', bgColor);
    btn.style('color', 'white');
    btn.style('border', 'none');
    btn.style('border-radius', '8px');
    btn.style('font-family', 'monospace');
    btn.style('font-weight', 'bold');
    btn.style('cursor', 'pointer');
    btn.style('box-shadow', '0 4px 6px rgba(0,0,0,0.3)');
    btn.style('font-size', '13px');
  };

  exportButton = createButton('💾 Exportar Cerebro');
  btnStyle(exportButton, '#2196F3', '70px');
  exportButton.mousePressed(() => exportBestBrain());

  // ─── BOTÓN IMPORTAR + INPUT OCULTO ──────────────────────
  importFileInput = createFileInput((file) => handleImportFile(file));
  importFileInput.style('display', 'none');

  importButton = createButton('📥 Importar Cerebro');
  btnStyle(importButton, '#FF9800', '110px');
  importButton.mousePressed(() => {
    importFileInput.elt.click(); // Dispara el diálogo de archivo
  });

  // ─── BOTÓN MAPA ALEATORIO ───────────────────────────────
  randomMapButton = createButton('🎲 Mapa Aleatorio');
  btnStyle(randomMapButton, '#9C27B0', '150px');
  randomMapButton.mousePressed(() => regenerateTrack());
}

// ─── EXPORTAR / IMPORTAR CEREBRO ──────────────────────────────

/**
 * Serializa el cerebro de la red neuronal a un objeto JSON plano.
 */
function serializeBrain(brain) {
  return {
    config: brain.Config,
    pesos: brain.Pesos.map(m => m.Data),
    bias: brain.Bias.map(m => m.Data)
  };
}

/**
 * Reconstruye un cerebro desde un objeto JSON plano.
 */
function deserializeBrain(data) {
  const nn = new NeuronalNetwork(data.config);
  for (let i = 0; i < nn.Pesos.length; i++) {
    for (let j = 0; j < nn.Pesos[i].Filas; j++) {
      for (let k = 0; k < nn.Pesos[i].Columnas; k++) {
        nn.Pesos[i].Data[j][k] = data.pesos[i][j][k];
      }
    }
  }
  for (let i = 0; i < nn.Bias.length; i++) {
    for (let j = 0; j < nn.Bias[i].Filas; j++) {
      nn.Bias[i].Data[j][0] = data.bias[i][j][0];
    }
  }
  return nn;
}

/**
 * Exporta el cerebro del mejor coche como archivo .json descargable.
 */
function exportBestBrain() {
  const bestCar = gameState.cars.reduce((a, b) => a.score > b.score ? a : b);
  if (!bestCar) return;

  const data = serializeBrain(bestCar.brain);
  data.generation = gameState.generation;
  data.score = bestCar.score;

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `racing-brain-gen${data.generation}-score${data.score.toFixed(0)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log(`🧠 Cerebro exportado | Gen ${data.generation} | Score ${data.score.toFixed(1)}`);
}

/**
 * Maneja la importación de un archivo .json con un cerebro guardado.
 */
function handleImportFile(file) {
  if (!file || file.type !== 'application/json') {
    console.warn('⚠️  Archivo no válido. Selecciona un .json de cerebro exportado.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.config || !data.pesos || !data.bias) {
        throw new Error('Formato inválido');
      }

      const importedBrain = deserializeBrain(data);

      // Reemplazar TODA la población con clones mutados del cerebro importado
      const newCars = [];
      for (let i = 0; i < CONFIG.NEAT.POP_SIZE; i++) {
        const car = new Car();
        car.brain = i < CONFIG.NEAT.ELITE_COUNT
          ? importedBrain.clone()           // Élites: copia exacta
          : crossing({ brain: importedBrain }, { brain: importedBrain }); // Hijos: crossover + mutación abajo
        if (i >= CONFIG.NEAT.ELITE_COUNT) mutation(car);
        newCars.push(car);
      }

      gameState.cars = newCars;
      for (const c of gameState.cars) c.reset();
      gameState.framesAlive = 0;
      gameState.generation = 1;
      gameState.hallOfFame = [];

      console.log(`🧠 Cerebro importado | Score original: ${data.score?.toFixed(1) || '?'} | Gen original: ${data.generation || '?'}`);
      console.log(`🔄 Nueva población inicializada con ${CONFIG.NEAT.POP_SIZE} coches desde el cerebro importado`);
    } catch (err) {
      console.error('❌ Error al importar cerebro:', err.message);
    }
  };
  reader.readAsText(file);
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