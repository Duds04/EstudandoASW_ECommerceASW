//https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda-readme.html
import * as lambda from "aws-cdk-lib/aws-lambda"

//https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs-readme.html
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"

//https://docs.aws.amazon.com/cdk/api/v2/docs/aws-construct-library.html
import * as cdk from "aws-cdk-lib"

import { Construct } from "constructs"

// Representara uma Stack que irá conter os recursos de:
    // Função de administração de produtos
    // Função de exibição, pesquisa, do produtos 
    // Função que gera eventos (pra ser guardado em outra tabela para ser retornado futuramente)
    // Tabela de Produtos 
    // Tabela de Eventos 
    
export class ProductsAppStack extends cdk.Stack{
    // Representando a product fetch (pesquisa valores) --> precisa acessar essa função externamente no API 
        // Handler --> significa metodo que é chamado quando é invocado a função
    readonly productsFetchHandler: lambdaNodeJS.NodejsFunction


    // todo contrutor de stack deve ter esses três parametros
        // escopo --> onde a stack será criada, inserida
        // id --> nome da stack
        // props --> propriedades da stack
        // props é opcional (pois após ele tem um ?), se não for passado ele será um objeto vazio
    constructor(scope: Construct, id: string, props?: cdk.StackProps){
        super(scope, id, props)


        // cria a função lambda (tem os mesmos parametros padrões de um construtor de stack) (scope, id e propiedades)
            // this referencia a stack onde a função está inserida 
            // id --> identificação do recurso na stack [functionName é realmente o nome da função, aparece no console AWS]
        this.productsFetchHandler = new lambdaNodeJS.NodejsFunction(this, "ProductFetchFunction", {
            runtime: lambda.Runtime.NODEJS_18_X,
            functionName: "ProductFetchFunction",
            entry: "lambda/products/productFetchFunctio.ts",
            handler: "handler",
            memorySize: 128,
            timeout: cdk.Duration.seconds(5),
            bundling: {
                minify: true,
                sourceMap: false,
            },
        })

            // entry: ponto de entrada da função lambda --> arquivo que contem o metodo que será chamado quando a função for invocada
            // handler: nome do metodo que será chamado quando a função for invocada (dentro do arquivo de entrada)
            // Quantidade de memoria em megaBytes que posso definir para a função lambda usar para executar (default 128MB)
            // timeout: tempo maximo que a função lambda pode executar (default 3 segundos) [geralmente as funcs lambdas são executadas em tempos curtos]
            // bundling: propriedades de bundling (empacotamento) do código da função lambda [pra subir uma func precisa de gerar um arquivo zip, o bundling faz isso automaticamente, e mandar pro AWS]
                // minify: converter o codigo para deixa-lo o mais enxuto (pequeno possivel)
                // sourceMap: mapeamento do codigo fonte (para debugar o codigo) [o sourceMap desligado pode deixar a func ainda menor]
    }
}