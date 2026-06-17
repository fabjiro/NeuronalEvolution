/**
 * Selecciona a los N mejores jugadores de la población.
 * @param {Player[]} arr Población actual
 * @param {number} selectCount Cantidad de mejores jugadores a conservar
 * @returns {Player[]}
 */
function seleccion(arr, selectCount) {
  // Copiar el array antes de ordenar para no mutar el original
  return [...arr].sort((a, b) => b.score - a.score).slice(0, selectCount);
}

/**
 *
 * @param {Player} ind1
 * @param {Player} godInd
 * @returns
 */
function crossing(ind1, godInd) {
  let brain1 = ind1.brain.clone();
  const brain2 = godInd.brain;

  for (let i = 0; i < brain1.Pesos.length; i++) {
    if (Math.random() > 0.5) {
     // Copiar valor por valor, no la referencia
      for (let j = 0; j < brain1.Pesos[i].Filas; j++) {
        for (let k = 0; k < brain1.Pesos[i].Columnas; k++) {
          brain1.Pesos[i].Data[j][k] = brain2.Pesos[i].Data[j][k];
        }
      }
    }
  }
  return brain1;
}
const MUTATION_RATE = 0.2;   // 20% por peso
const MUTATE_POWER = 0.5;    // perturbación Gaussiana
const REPLACE_RATE = 0.05;   // 5% reemplazo completo
const MIN_WEIGHT = -30;
const MAX_WEIGHT = 30;

function mutation(ind1) {
  let brain1 = ind1.brain;

  // Mutar Pesos
  for (let i = 0; i < brain1.Pesos.length; i++) {
    for (let j = 0; j < brain1.Pesos[i].Data.length; j++) {
      for (let k = 0; k < brain1.Pesos[i].Data[j].length; k++) {
        const r = Math.random();
        if (r < MUTATION_RATE) {
          // Perturbación Gaussiana (Box-Muller simplificado)
          const u = Math.random()
          const v = Math.random();
          
          const gauss = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
          brain1.Pesos[i].Data[j][k] += gauss * MUTATE_POWER;
        } else if (r < MUTATION_RATE + REPLACE_RATE) {
          // Reemplazo completo (diversidad)
          brain1.Pesos[i].Data[j][k] = (Math.random() - 0.5) * 2 * 30;
        }
        // Clamp
        brain1.Pesos[i].Data[j][k] = Math.max(MIN_WEIGHT, 
          Math.min(MAX_WEIGHT, brain1.Pesos[i].Data[j][k]));
      }
    }
  }

  // Mutar Bias (misma lógica)
  for (let i = 0; i < brain1.Bias.length; i++) {
    for (let j = 0; j < brain1.Bias[i].Data.length; j++) {
      for (let k = 0; k < brain1.Bias[i].Data[j].length; k++) {
        const r = Math.random();
        if (r < MUTATION_RATE) {
          const u = Math.random()
          const v = Math.random();
          
          const gauss = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
          brain1.Bias[i].Data[j][k] += gauss * MUTATE_POWER;
        } else if (r < MUTATION_RATE + REPLACE_RATE) {
          brain1.Bias[i].Data[j][k] = (Math.random() - 0.5) * 2 * 30;
        }
        // Clamp
        brain1.Bias[i].Data[j][k] = Math.max(MIN_WEIGHT, 
          Math.min(MAX_WEIGHT, brain1.Bias[i].Data[j][k]));
      }
    }
  }

  return brain1;
}