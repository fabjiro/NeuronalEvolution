const widthMap = 900; // largo del mapa
const limitNewGenerate = widthMap * 0.8; // punto limite de generar nuevoe enemigo
const countPlayers = 10; // cantidad de jugadores
const brainConfig = [1, 2, 1]; // configuracion de la ia
const CANT_ELITE = 2; // individuos que se preservan sin mutar
const TASA_MUTACION = 0.3; // probabilidad de mutar cada peso
const MAGNITUD_MUTACION = 0.5; // desviacion estandar del ruido gaussiano

let players = []; // jugadores
let enemys = [];
let maxScore = 0; // mejor fitness historico
let generacion = 0;
let input1 = 0; // distancia normalizada al primer enemigo

function setup() {
  createCanvas(widthMap, 400);

  // poblacion inicial
  for (let i = 0; i < countPlayers; i++) {
    players.push(new Player(brainConfig));
  }
}

function keyPressed() {
  if (key == "Enter") {
    console.log(players[randomNumber(0, players.length - 1)].brain);
  }
}

function isAllDead() {
  const hayVivos = players.some(p => p.aLive);
  if (hayVivos) return;

  // Actualizar record historico
  const mejorFitness = Math.max(...players.map(p => p.fitness));
  if (mejorFitness > maxScore) {
    maxScore = mejorFitness;
  }

  // Ordenar por fitness (ascendente) y extraer elite
  players.sort((a, b) => a.fitness - b.fitness);
  const elite = players.slice(-CANT_ELITE);
  elite.forEach(p => {
    p.aLive = true;
    p.reset();
    p.fitness = 0;
  });

  // Construir nueva generacion empezando con los elite
  const nuevaGeneracion = [...elite];

  // Llenar el resto con cruces entre individuos (torneo sobre poblacion anterior)
  for (let i = 0; i < countPlayers - CANT_ELITE; i++) {
    const padre1 = seleccionTorneo(players, 3);
    const padre2 = seleccionTorneo(players, 3);
    const brainHijo = cruceUniforme(padre1, padre2);
    const hijo = new Player(brainConfig);
    hijo.brain = brainHijo;
    nuevaGeneracion.push(hijo);
  }

  // Mutar solo los no-elite
  for (let i = CANT_ELITE; i < nuevaGeneracion.length; i++) {
    mutacion(nuevaGeneracion[i].brain, TASA_MUTACION, MAGNITUD_MUTACION);
  }

  players = nuevaGeneracion;
  enemys = [];
  generacion++;
}

function draw() {
  // Calcular input: distancia normalizada al primer enemigo
  input1 = enemys.length > 0 ? enemys[0].x / widthMap : 0;

  background(220);

  // Mostrar estadisticas
  const mejorActual = players
    .filter(p => !p.aLive)
    .reduce((max, p) => Math.max(max, p.fitness), 0);
  text(`Mejor fitness: ${mejorActual}`, 20, 40);
  text(`Record historico: ${maxScore}`, 20, 80);
  text(`Generacion: ${generacion}`, widthMap - 100, 30);

  if (enemys.length > 0) {
    text(`Input: ${nf(input1, 1, 3)}`, widthMap - 200, 90);
  }

  // Generar nuevos enemigos
  if (enemys.length < 3) {
    if (Math.random() < 0.05) {
      if (enemys.length > 0) {
        let lastEnemy = enemys[enemys.length - 1];
        if (lastEnemy.x < limitNewGenerate) {
          enemys.push(new Enemy());
        }
      } else {
        enemys.push(new Enemy());
      }
    }
  }

  // Actualizar fitness y dibujar jugadores
  for (let i = 0; i < players.length; i++) {
    if (players[i].aLive) {
      players[i].fitness++; // cada frame que sobrevive = +1 fitness
      players[i].show();
      players[i].predict([input1]);
      players[i].move();
    }
  }

  // Colision entre jugador y enemigo
  for (let i = 0; i < enemys.length; i++) {
    let enemy = enemys[i];
    for (let index = 0; index < players.length; index++) {
      if (players[index].aLive) {
        if (players[index].hits(enemy)) {
          players[index].aLive = false;
          players[index].reset();
        }
      }
    }
    enemy.show();
    enemy.move();

    // eliminar enemigo si sale del mapa
    if (enemy.x < 0) {
      enemys.splice(i, 1);
    }
  }

  isAllDead();
}
