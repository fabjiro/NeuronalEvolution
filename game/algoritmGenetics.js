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
 * @returns
 */
function crossing(ind1, godInd) {
  let brain1 = ind1.brain;
  const brain2 = godInd.brain;

  // pesos
  for (let i = 0; i < brain1.Pesos.length; i++) {
    for (let j = 0; j < brain1.Pesos[i].Data.length; j++) {
      if (Math.random() > 0.2) {
        brain1.Pesos[i].Data[j] = brain2.Pesos[i].Data[j];
      }
    }
  }
  return brain1;
}
/**
 *
 * @param {Player} ind1
 * @returns
 */
function mutation(ind1) {
  let brain1 = ind1.brain;
  // pesos
  for (let i = 0; i < brain1.Pesos.length; i++) {
    for (let j = 0; j < brain1.Pesos[i].Data.length; j++) {
      for (let k = 0; k < brain1.Pesos[i].Data[j].length; k++) {
        if (Math.random() > 0.5) {
          brain1.Pesos[i].Data[j][k] += Math.random() - Math.random();
        } else {
          brain1.Pesos[i].Data[j][k] -= Math.random() - Math.random();
        }
      }
    }
  }
  return brain1;
}
