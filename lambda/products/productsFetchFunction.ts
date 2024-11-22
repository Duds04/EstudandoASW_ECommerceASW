import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { DynamoDB } from "aws-sdk"

// Função de procurar produtos

// Vai receber uma requisão que vai ser mapeada no API Gateway que invoca a função, nesse momento ele passa dois parametros:
// event: informações da requisição (parametros, headers, corpo da requisição)
// context: proprio recurso lambda injeta na função (contem as informações de como a função lambda está sendo executada)

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
            console.log('GET')

            // retornando resposta a requisição
            // statusCode: 200 --> codigo HTTP que indica que tudo ocorreu bem
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "GET Products - OK",
                })
            }

        }
    } else if (event.resource === "/products/{id}") {
        const productId = event.pathParameters!.id as string
        console.log(`GET /products/${productId}`)
  
        try {
           return {
              statusCode: 200,
              body: JSON.stringify({
                message: `GET /products/${productId}`
            })
           }   
        } catch (error) {
           console.error((<Error>error).message)
           return {
              statusCode: 404,
              body: (<Error>error).message
           }
        }
     }
  
     return {
        statusCode: 400,
        body: JSON.stringify({
           message: "Bad request"
        })
     }

    // caso não seja um GET ou não seja o endereço products retorna:
    // statusCode: 400 --> codigo HTTP que indica que a requisição foi mal feita (não tem significado)
}