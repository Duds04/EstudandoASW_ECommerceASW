import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB } from "aws-sdk";
// import * as AWSXRay from "aws-xray-sdk";

// Função de procurar produtos

// Vai receber uma requisão que vai ser mapeada no API Gateway que invoca a função, nesse momento ele passa dois parametros:
// event: informações da requisição (parametros, headers, corpo da requisição)
// context: proprio recurso lambda injeta na função (contem as informações de como a função lambda está sendo executada)


/**
 * Aws XRay da para instumentar de todas as chamadas feitas com o sdk
 * 
 * Capturar todas as execulções da biblioteca sdk
 *  XRay captura e mede o tempo de acesso usando o sdk em qualquer contexto
 */
// AWSXRay.captureAWSClient(require("aws-sdk"))

// Capturando a variavel de ambiente que foi passada para a função lambda para fazer a tabela do DynamoDB
const productsDbd = process.env.PRODUCTS_DDB!
// criando um cliente para acessar o DynamoDB
const ddbClient = new DynamoDB.DocumentClient()

// criando uma instancia da classe ProductRepository 
const productRepository = new ProductRepository(ddbClient, productsDbd)

// Retorna uma promessa de um objeto do tipo APIGatewayProxyResult --> quando terminar a função vai retornar algo pro API Gateway
export async function handler(
    event: APIGatewayProxyEvent,
    context: Context):
    Promise<APIGatewayProxyResult> {


    // id unico da execução da função Lambda 
    const lambdaRequestID = context.awsRequestId

    // id da requisição que entrou pelo API Gateway
    // requestContext --> informações da requisição que entrou pelo API Gateway
    const apiRequestId = event.requestContext.requestId

    // gerando log no console Clound Watch AWS dos IDs [Log gera custos, e não colocar informações sensíveis]
    console.log(`API Gateway Request ID: ${apiRequestId} - Lambda Request ID: ${lambdaRequestID}`)


    // dentro desse corpo sempre estaremos lidando com requisições HTTP
    const method = event.httpMethod


    // recebe a função rest com metodo HTTP
    // event.resource --> onde o recurso foi solicitado (endereço products)
    if (event.resource === "/products") {
        // se o evento foi um get (um retorna)
        if (method === "GET") {
            // diz para o console AWS que foi um metodo GET
            console.log('GET /products')

            // await --> espera a promessa ser resolvida para continuar a execução do código e retornar a resposta
            const products = await productRepository.getAllProducts()

            /**
             * retornando resposta a requisição
             * 200 --> codigo HTTP que indica que tudo ocorreu bem
             * 
             * body: JSON.stringify(products) --> transforma o array de produtos em uma string JSON e retorna no corpo da requisição
            */
            return {
                statusCode: 200,
                body: JSON.stringify(products)
            }

        }
    } else if (event.resource === "/products/{id}") {
        /**
         * "!" --> indica que o valor não é nulo (não é undefined)
         * Pega o ID do produto capturado na url da requisição
         *  */
        const productId = event.pathParameters!.id as string
        console.log(`GET /products/${productId}`)

        const product = await productRepository.getProductById(productId)

        // Se o produto não for encontrado retorna um erro, logo temos que trata-lo
        try {
            return {
                statusCode: 200,
                body: JSON.stringify(product)
            }
        }catch (error){
            // (<Tipo>variavel).message --> pega a msg de erro
            console.error((<Error>error).message)
            return {
                statusCode: 404,
                body: (<Error>error).message,
            }
        }
        
    }

    // caso não seja um GET ou não seja o endereço products retorna:
    // statusCode: 400 --> codigo HTTP que indica que a requisição foi mal feita (não tem significado)
    return {
        statusCode: 400,
        body: JSON.stringify({
            message: "Bad Request",
        })
    }
}