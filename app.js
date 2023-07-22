const widthMap = 900; // largo del mapa
const limitNewGenerate = widthMap * 0.8; // punto limite de generar nuevoe enemigo
const countPlayers = 10; // cantidad de jugadores
const brainConfig = [1, 2, 1]; // configuracion de la ia
const maxCross = 4;
const maxPlayerSelection = 2;

let players = []; // jugadores
let enemys = [];
let score = 0;
let maxScore = 0;
let generacion = 0;

function setup() {
  createCanvas(widthMap, 400);

  // poblacion inicial
  initialPoblation(0, countPlayers);
}

function keyPressed() {
  if (key == "Enter") {
    console.log(players[randomNumber(0, players.length - 1)].brain);
  }
}

function isAllDead() {
  const state = players.map((e) => e.aLive);
  let isDead = !state.includes(true);

  if (isDead) {
    maxScore = score > maxScore ? score : maxScore;
    const maxPlayers = seleccion(players, -maxPlayerSelection);

    for (let _ = 0; _ < maxPlayerSelection; _++) {
      maxPlayers[_].aLive = true;
    }
    players = [];
    players.push(...maxPlayers);
    initialPoblation(0, countPlayers - maxPlayerSelection);

    // cruce
    for (let _ = 0; _ < maxCross; _++) {
      const individual = randomNumber(maxPlayerSelection, players.length);
      const maxIndividual = randomNumber(0, maxPlayerSelection);

      const resultPlayer = crossing(
        players[individual],
        maxPlayers[maxIndividual]
      );

      players[individual].brain = resultPlayer;
    }

    // mutacion
    for (let i = maxPlayerSelection; i < players.length; i++) {
      players[i].brain = mutation(players[i]);
    }

    score = 0;
    enemys = [];
    crossPlayer = [];
    generacion++;
  }
}
/**
 *
 * @param {number} n1
 * @param {number} n2
 */
function initialPoblation(n1, n2) {
  for (let index = n1; index < n2; index++) {
    players.push(new Player(brainConfig));
  }
}

function draw() {
  if (enemys.length > 0) {
    var input1 = enemys[0].x / widthMap;
  }

  background(220);
  text(`Score: ${score}`, 20, 40);
  text(`Max score: ${score > maxScore ? score : maxScore}`, 20, 80);
  text(`Generacion: ${generacion}`, widthMap - 100, 30);

  if (enemys.length > 0) {
    text(`Input 1 : ${input1}`, widthMap - 200, 90);
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

  for (let i = 0; i < players.length; i++) {
    if (players[i].aLive) {
      players[i].show();
      players[i].predict([input1]);
      players[i].move();
    }
  }

  // Colision entre jugador y enemigo
  for (let i = 0; i < enemys.length; i++) {
    let enemy = enemys[i];
    for (let index = 0; index < players.length; index++) {
      // si es eliminado
      if (players[index].aLive) {
        if (players[index].hits(enemy)) {
          players[index].aLive = false;
          players[index].score = score;
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
  score++;
}
