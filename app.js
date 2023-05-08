let player;
let enemys = [];

const widthMap = 900;
const limitNewGenerate = widthMap * 0.8;

function setup() {
  createCanvas(widthMap, 400);
  player = new Player();
}

function keyPressed() {
  if (key == " ") {
    player.jump();
  } else if (key == "Enter") {
    enemys = [];
    loop();
  } else if (key == "ArrowDown") {
    player.down();
  }
}

function draw() {
  background(220);

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

  player.show();
  if (enemys.length > 0) {
    player.predict([
      enemys[0].x / widthMap,
      enemys[1] ? enemys[1].x / widthMap : 0,
    ]);
  }
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
