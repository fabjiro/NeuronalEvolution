/**
 * Algoritmo Genético Moderno para Neuronal Evolution
 *
 * Estrategias implementadas:
 * - Selección por Torneo (mejor presión evolutiva que truncamiento)
 * - Cruce Uniforme (cada peso individual se hereda independientemente)
 * - Mutación Gaussiana con tasa y magnitud configurables
 * - Copia profunda (deep copy) para evitar corrupción de referencias
 */

/**
 * Clona una red neuronal (copia profunda de pesos y biases)
 * @param {NeuronalNetwork} brain
 * @returns {NeuronalNetwork}
 */
function clonarRed(brain) {
  const clone = new NeuronalNetwork(brain.Config);
  for (let i = 0; i < brain.Pesos.length; i++) {
    for (let j = 0; j < brain.Pesos[i].Data.length; j++) {
      for (let k = 0; k < brain.Pesos[i].Data[j].length; k++) {
        clone.Pesos[i].Data[j][k] = brain.Pesos[i].Data[j][k];
      }
    }
  }
  for (let i = 0; i < brain.Bias.length; i++) {
    for (let j = 0; j < brain.Bias[i].Data.length; j++) {
      clone.Bias[i].Data[j][0] = brain.Bias[i].Data[j][0];
    }
  }
  return clone;
}

/**
 * Selección por Torneo: elige aleatoriamente K participantes
 * y devuelve el que tiene mejor fitness.
 * @param {Player[]} poblacion
 * @param {number} tamTorneo - Cantidad de participantes (default: 3)
 * @returns {Player}
 */
function seleccionTorneo(poblacion, tamTorneo = 3) {
  let mejor = null;
  for (let i = 0; i < tamTorneo; i++) {
    const idx = Math.floor(Math.random() * poblacion.length);
    const candidato = poblacion[idx];
    if (!mejor || candidato.fitness > mejor.fitness) {
      mejor = candidato;
    }
  }
  return mejor;
}

/**
 * Cruce Uniforme: genera un hijo donde cada peso individual
 * tiene 50% de probabilidad de provenir de cada padre.
 * @param {Player} padre1
 * @param {Player} padre2
 * @returns {NeuronalNetwork} Nueva red neuronal (independiente)
 */
function cruceUniforme(padre1, padre2) {
  const hijo = new NeuronalNetwork(padre1.brain.Config);

  // Cruzar pesos
  for (let i = 0; i < hijo.Pesos.length; i++) {
    for (let j = 0; j < hijo.Pesos[i].Data.length; j++) {
      for (let k = 0; k < hijo.Pesos[i].Data[j].length; k++) {
        hijo.Pesos[i].Data[j][k] = Math.random() < 0.5
          ? padre1.brain.Pesos[i].Data[j][k]
          : padre2.brain.Pesos[i].Data[j][k];
      }
    }
  }

  // Cruzar biases
  for (let i = 0; i < hijo.Bias.length; i++) {
    for (let j = 0; j < hijo.Bias[i].Data.length; j++) {
      hijo.Bias[i].Data[j][0] = Math.random() < 0.5
        ? padre1.brain.Bias[i].Data[j][0]
        : padre2.brain.Bias[i].Data[j][0];
    }
  }

  return hijo;
}

/**
 * Mutación Gaussiana: agrega ruido con distribución normal
 * a cada peso con probabilidad `tasa`.
 * @param {NeuronalNetwork} brain
 * @param {number} tasa - Probabilidad de mutar cada peso (0-1)
 * @param {number} magnitud - Desviación estándar del ruido
 * @returns {NeuronalNetwork}
 */
function mutacion(brain, tasa = 0.3, magnitud = 0.5) {
  for (let i = 0; i < brain.Pesos.length; i++) {
    for (let j = 0; j < brain.Pesos[i].Data.length; j++) {
      for (let k = 0; k < brain.Pesos[i].Data[j].length; k++) {
        if (Math.random() < tasa) {
          brain.Pesos[i].Data[j][k] += randn() * magnitud;
        }
      }
    }
  }
  // Mutar biases tambien
  for (let i = 0; i < brain.Bias.length; i++) {
    for (let j = 0; j < brain.Bias[i].Data.length; j++) {
      if (Math.random() < tasa) {
        brain.Bias[i].Data[j][0] += randn() * magnitud;
      }
    }
  }
  return brain;
}

/**
 * Genera un número aleatorio con distribución normal estándar
 * usando el método Box-Muller.
 * @returns {number}
 */
function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
