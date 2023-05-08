class Player {
  constructor() {
    this.r = 50;
    this.x = this.r;
    this.y = height - this.r;
    this.vy = 0;
    this.gravity = 0.6;
    this.brain = new NeuronalNetwork([2, 3, 1]);
  }
  /**
   *
   * @param {number[]} inputs
   */
  predict(inputs) {
    const output = this.brain.Prediccion(inputs)[0];
    if(output > 0.5){
      this.jump();
    } else  {
      this.down();
    }
  }

  jump() {
    if (this.y == height - this.r) {
      this.vy = -11;
    }
  }

  down() {
    this.vy = 0;
    this.y = height - this.r;
  }

  hits(enemy) {
    return collideRectCircle(
      this.x,
      this.y,
      this.r,
      this.r,
      enemy.x,
      enemy.y + this.r - 15,
      enemy.r
    );
  }

  move() {
    this.y += this.vy;
    this.vy += this.gravity;
    this.y = constrain(this.y, 0, height - this.r);
  }

  show() {
    rect(this.x, this.y, this.r, this.r);
  }
}
