const widthMap = 900; // largo del mapa
const limitNewGenerate = widthMap * 0.8; // punto limite de generar nuevoe enemigo
const countPlayers = 20; // cantidad de jugadores
const brainConfig = [1, 2, 1]; // configuracion de la ia
const maxCross = 4;
const maxPlayerSelection = 4;

let players = []; // jugadores
let deadPlayers = []; // jugadores eliminados
let crossPlayer = []; // jugadores cruzados
let enemys = [];
let score = 0;
let maxScore = 0;
let generacion = 0;

function setup() {
  createCanvas(widthMap, 400);

  // poblacion inicial
  initialPoblation();
}

function keyPressed() {
  if (key == "Enter") {
    console.log(players[randomNumber(0, players.length - 1)].brain);
  }
}

function isAllDead() {
  let isDead = players.length === 0;

  if (isDead) {
    maxScore = score > maxScore ? score : maxScore;
    // seleccion de los mejores.
    const maxPlayers = seleccion(deadPlayers, -maxPlayerSelection);

    // se hace una nuevo poblacion.
    // initialPoblation();
    // players.splice(-3);
    // players.push(...maxPlayers);
    players.push(...deadPlayers);
    // for (let i = 0; i < countPlayers; i++) {
    //   players.push(maxPlayers[i % maxPlayers.length]);
    // }

    // cruce
    for (let index = 0; index < maxCross; index++) {
      const individual = randomNumber(0, players.length - maxPlayerSelection);
      const maxIndividual = randomNumber(0, maxPlayers.length);

      if (!crossPlayer.includes(individual)) {
        crossPlayer.push(individual);

        const resultPlayer = crossing(
          players[individual],
          maxPlayers[maxIndividual]
        );

        players[individual].brain = resultPlayer;
      }
    }

    // mutacion
    for (let i = 0; i < players.length - maxPlayerSelection; i++) {
      const result = mutation(players[i]);
      players[i].brain = result;
    }

    score = 0;
    enemys = [];
    deadPlayers = [];
    crossPlayer = [];
    generacion++;
  }
}

function initialPoblation() {
  players = [];
  for (let index = 0; index < countPlayers; index++) {
    players.push(new Player(brainConfig));
  }
}

function draw() {
  if (enemys.length > 0) {
    var input1 = enemys[0].x / widthMap;
  }

  background(220);
  text(`Score: ${score}`, 20, 40);
  text(`A live: ${players.length}`, 20, 60);
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
    players[i].show();
    players[i].predict([input1]);
    players[i].move();
  }

  // Colision entre jugador y enemigo
  for (let i = 0; i < enemys.length; i++) {
    let enemy = enemys[i];
    for (let index = 0; index < players.length; index++) {
      // si es eliminado
      if (players[index].hits(enemy)) {
        players[index].reset();
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
