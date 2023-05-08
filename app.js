const widthMap = 900; // largo del mapa
const limitNewGenerate = widthMap * 0.8; // punto limite de generar nuevoe enemigo
const countPlayers = 10; // cantidad de jugadores
const brainConfig = [2, 3, 1]; // configuracion de la ia

let players = []; // jugadores
let deadPlayers = []; // jugadores eliminados
let enemys = [];
let score = 0;

function setup() {
  createCanvas(widthMap, 400);

  // poblacion inicial
  initialPoblation();
}

function keyPressed() {
  if (key == "Enter") {
    enemys = [];
    loop();
  }
}

function isAllDead() {
  let isDead = players.length === 0;

  if (isDead) {
    score = 0;
    enemys = [];
    deadPlayers = [];
    initialPoblation();
  }
}

function initialPoblation() {
  players = [];
  for (let index = 0; index < countPlayers; index++) {
    players.push(new Player(brainConfig));
  }
}

function draw() {
  background(220);
  text(`Score ${score}`, 20, 40);

  // Generar nuevos enemigos
  if (enemys.length < 3) {
    if (random(1) < 0.01) {
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
    players[i].show();
    if (enemys.length > 0) {
      players[i].predict([
        enemys[0].x / widthMap,
        enemys[1] ? enemys[1].x / widthMap : 0,
      ]);
    }
    players[i].move();
  }

  // Colision entre jugador y enemigo
  for (let i = 0; i < enemys.length; i++) {
    let enemy = enemys[i];
    for (let index = 0; index < players.length; index++) {
      // si es eliminado
      if (players[index].hits(enemy)) {
        deadPlayers.push(players[index]);
        players.splice(index, 1);
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
