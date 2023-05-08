class Matrix{
    constructor(filas,columnas) {
        this.Filas = filas;
        this.Columnas = columnas;
        this.Data = [];

        for (let i = 0; i < filas; i++) {
            this.Data[i] = [];
            for (let j = 0; j < columnas; j++) {
                this.Data[i][j]= 0;
            }
        }
    }
    static FromArray(arr = []){
        let result = new Matrix(arr.length,1);
        for (let i = 0; i < arr.length; i++) {
            result.Data[i][0] = arr[i];            
        }
        return result;
    }
    Toarray(){
        let arr = [];
        for (let i = 0; i < this.Filas; i++) {
            for (let j = 0; j < this.Columnas; j++) {
                arr.push(this.Data[i][j]);
            }
        }
        return arr;
    }
    static Multiply(a,b){
        let result = new Matrix(a.Filas,b.Columnas);
        for (let i = 0; i < result.Filas; i++) {
            for (let j = 0; j < result.Columnas; j++) {
                let sum = 0.0;
                for (let k = 0; k < a.Columnas; k++) {
                    sum += a.Data[i][k] * b.Data[k][j];
                }
                result.Data[i][j] = sum;
            }
        }
        return result;
    }
    static Transpose(matrix){
        let result = new Matrix(matrix.Columnas,matrix.Filas);
        for (let i = 0; i < matrix.Filas; i++) {
            for (let j = 0; j < matrix.Columnas; j++) {
                result.Data[j][i] = matrix.Data[i][j];
            }
        }
        return result;
    }
    static Map(matrix,func){
        let result = new Matrix(matrix.Filas,matrix.Columnas);
        for (let i = 0; i < matrix.Filas; i++) {
            for (let j = 0; j < matrix.Columnas; j++) {
                result.Data[i][j] = func(matrix.Data[i][j]);
            }            
        }
        return result;
    }
    Multiply(n){
        if(n instanceof Matrix){
            for (let i = 0; i < this.Filas; i++) {
                for (let j = 0; j < this.Columnas; j++) {
                    this.Data[i][j] *= n.Data[i][j];           
                }
            }
        }else{
            for (let i = 0; i < this.Filas; i++) {
                for (let j = 0; j < this.Columnas; j++) {
                    this.Data[i][j] *= n;
                }
            }
        }
    }
    Map(fuc){
        for (let i = 0; i < this.Filas; i++) {
            for (let j = 0; j < this.Columnas; j++) {
                let value = this.Data[i][j];
                this.Data[i][j] = fuc(value);
            }
        }
    }
    Randomize(){
        for (let i = 0; i < this.Filas; i++) {
            for (let j = 0; j < this.Columnas; j++) {
                this.Data[i][j] = Math.random() - Math.random();
            }
        }
    }
    static Subtrac(a,b){
        let result = new Matrix(a.Filas,b.Columnas);
        for (let i = 0; i < result.Filas; i++) {
            for (let j = 0; j < result.Columnas; j++) {
                result.Data[i][j] = a.Data[i][j] - b.Data[i][j];
            }
        }
        return result;
    }
    Add(n){
        if(n instanceof Matrix){
            for (let i = 0; i < this.Filas; i++) {
                for (let j = 0; j < this.Columnas; j++) {
                    this.Data[i][j] += n.Data[i][j];
                }
            }
            
        }else{
            for (let i = 0; i < this.Filas; i++) {
                for (let j = 0; j < this.Columnas; j++) {
                    this.Data[i][j] += n;
                }
            }
        }
    }
}