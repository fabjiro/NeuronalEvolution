class NeuronalNetwork {
  constructor(config = []) {
    //creando capas pesos
    this.Config = config;
    this.Capas = [];
    this.Pesos = [];
    this.Bias = [];

    for (let i = 1; i < config.length; i++) {
      this.Bias.push(new Matrix(config[i], 1)); // añadiendo los bias
      this.Pesos.push(new Matrix(config[i], config[i - 1])); // añadiendo los pesos
      // inicializar los pesos y bias
      this.Pesos[i - 1].Randomize();
      this.Bias[i - 1].Randomize();
    }
    for (let i = 0; i < config.length; i++) {
      // añadiendo las capas
      this.Capas.push(0);
    }
  }

  /**
   *
   * @param {number[]} Entrada
   * @returns
   */
  Prediccion(Entrada = []) {
    this.Capas[0] = Matrix.FromArray(Entrada);

    for (let i = 1; i < this.Capas.length; i++) {
      this.Capas[i] = Matrix.Multiply(this.Pesos[i - 1], this.Capas[i - 1]);
      this.Capas[i].Add(this.Bias[i - 1]);
      this.Capas[i].Map(this.tanh);
    }
    return this.Capas[this.Capas.length - 1].Toarray();
  }

  tanh(x) {
    return Math.tanh(x);
  }

  sigmoide(value) {
    return 1 / (1 + Math.exp(-value));
  }

  // En Neuronal Network.js - añadir método clone()
  clone() {
    let clon = new NeuronalNetwork(this.Config);

    // Copiar pesos (deep copy de cada matriz)
    for (let i = 0; i < this.Pesos.length; i++) {
      for (let j = 0; j < this.Pesos[i].Filas; j++) {
        for (let k = 0; k < this.Pesos[i].Columnas; k++) {
          clon.Pesos[i].Data[j][k] = this.Pesos[i].Data[j][k];
        }
      }
    }

    // Copiar bias
    for (let i = 0; i < this.Bias.length; i++) {
      for (let j = 0; j < this.Bias[i].Filas; j++) {
        clon.Bias[i].Data[j][0] = this.Bias[i].Data[j][0];
      }
    }

    return clon;
  }
}
