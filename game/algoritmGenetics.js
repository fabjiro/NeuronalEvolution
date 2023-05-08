/**
 *
 * @param {Player[]} arr
 * @param {number} selectCount
 * @returns {Player[]}
 */
function seleccion(arr, selectCount) {
  return arr.slice(selectCount);
}

/**
 *
 * @param {Player} ind1
 * @param {Player} godInd
 * @returns {Player}
 */
function crossing(ind1, godInd) {
  let brain1 = ind1.brain;
  const brain2 = godInd.brain;

  // pesos
  for (let i = 0; i < brain1.Pesos.length; i++) {
    for (let j = 0; j < brain1.Pesos[i].Data.length; j++) {
      for (let k = 0; k < brain1.Pesos[i].Data[j].length; k++) {
        if (random(1) < 0.5) {
          brain1.Pesos[i].Data[j][k] = brain2.Pesos[i].Data[j][k];
        }
      }
    }
  }
  ind1.brain = brain1;
  return ind1;
}
/**
 *
 * @param {Player} ind1
 * @returns {Player}
 */
function mutation(ind1) {
  let brain1 = ind1.brain;
  // pesos
  for (let i = 0; i < brain1.Pesos.length; i++) {
    for (let j = 0; j < brain1.Pesos[i].Data.length; j++) {
      if (random(1) < 0.5) {
        for (let k = 0; k < brain1.Pesos[i].Data[j].length; k++) {
          const mod = Math.random() - Math.random();
          brain1.Pesos[i].Data[j][k] += mod;
        }
      }
    }
  }
  ind1.brain = brain1;
  return ind1;
}
