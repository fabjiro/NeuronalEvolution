let player;
let enemys = [];

function setup() {
  createCanvas(600, 400);
  player = new Player();
}

function keyPressed() {
  if (key == " ") {
    player.jump();
  }

  if (key == "Enter") {
    enemys = [];
    loop();
  }
}

function draw() {
  background(220);

  if (enemys.length < 3) {
    if (random(1) < 0.01) {
      enemys.push(new Enemy());
    }
  }

  player.show();
  player.move();

  for (let i = 0; i < enemys.length; i++) {
    let enemy = enemys[i];

    if (player.hits(enemy)) {
      console.log("Game Hover");
      noLoop();
    }
    enemy.show();
    enemy.move();

    if (enemy.x < 0) {
      enemys.splice(i, 1);
    }
  }
}
