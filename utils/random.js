/**
 * Genera un número entero aleatorio entre min y max (inclusive).
 * @param {number} min Valor mínimo
 * @param {number} max Valor máximo
 * @returns {number}
 */
function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }