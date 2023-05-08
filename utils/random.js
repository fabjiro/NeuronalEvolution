/**
 *
 * @param {number} max
 * @param {number} min
 * @returns {number}
 */
function randomNumber(max, min) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }