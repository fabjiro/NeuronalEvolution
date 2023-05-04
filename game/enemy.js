class Enemy {
  constructor() {
    this.r = 55;
    this.x = width;
    this.y = height - this.r;
  }

  move() {
    this.x -= 7;
  }

  show() {
    ellipse(this.x, height - 29, this.r, this.r);

  }
}
