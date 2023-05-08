class NeuronalNetwork{
    constructor(config = []){
        //creando capas pesos
        this.Config = config;
        this.Learningrate = 0.5;
        this.Capas = [];
        this.Pesos = [];
        this.Bias = [];

        for(let i =1; i < config.length; i++){
            this.Bias.push(new Matrix(config[i], 1)); // añadiendo los bias
            this.Pesos.push(new Matrix(config[i], config[(i-1)])); // añadiendo los pesos
            // inicializar los pesos y bias
            this.Pesos[(i-1)].Randomize();
            this.Bias[(i-1)].Randomize();
        }
        for (let i = 0; i < config.length; i++) { // añadiendo las capas
            this.Capas.push(0); 
        }
    }

    /**
     * 
     * @param {number[]} Entrada 
     * @returns 
     */
    Prediccion(Entrada = []){
        this.Capas[0] = Matrix.FromArray(Entrada);

        for(let i = 1; i < this.Capas.length; i++){
            this.Capas[i] = Matrix.Multiply(this.Pesos[(i-1)],this.Capas[(i-1)]);
            this.Capas[i].Add(this.Bias[(i - 1)]);
            this.Capas[i].Map(this.sigmoide);
        }
        return this.Capas[this.Capas.length-1].Toarray();
    }

    sigmoide(value) {
        return 1 / (1 + Math.exp(-value));
    }
    Dsigmoide(y) {
        return y * (1 - y);
    }
}