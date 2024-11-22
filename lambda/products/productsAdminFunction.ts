import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB } from "aws-sdk";
// import * as AWSXRay from "aws-xray-sdk";

// AWSXRay.captureAWSClient(require("aws-sdk"))

const productsDbd = process.env.PRODUCTS_DDB!
const ddbClient = new DynamoDB.DocumentClient()

const productRepository = new ProductRepository(ddbClient, productsDbd)

export async function handler(event: APIGatewayProxyEvent,
  context: Context): Promise<APIGatewayProxyResult> {
  // id unico da execução da função Lambda 
  const lambdaRequestID = context.awsRequestId
  // id da requisição que entrou pelo API Gateway
  // requestContext --> informações da requisição que entrou pelo API Gateway
  const apiRequestId = event.requestContext.requestId
  // gerando log no console Clound Watch AWS dos IDs [Log gera custos, e não colocar informações sensíveis]
  console.log(`API Gateway Request ID: ${apiRequestId} - Lambda Request ID: ${lambdaRequestID}`)

  // POST ("/products")
  // PUT ("/products/{id}")
  // DELETE ("/products/{id}")
  if (event.resource === "/products") {
    console.log("POST /products")

    /**
     * Receber o produto que queremos criar no corpo da requisição,
     * vai ser do tipo lambda layer
     *  */
    const product = JSON.parse(event.body!) as Product
    // produto criado no banco de dados
    const productCreated = await productRepository.create(product)
    return {
      statusCode: 201, // o codigo de status representa que o recurso foi criado
      body: JSON.stringify(productCreated), // converte de string para JSON
    }
  } else if (event.resource === "/products/{id}") {
    // Pega o ID do produto capturado na url da requisição
    const productId = event.pathParameters!.id as string

    // Verificando qual metodo foi acessado
    if (event.httpMethod === "PUT") {
      console.log(`PUT /products/${productId}`)
      const product = JSON.parse(event.body!) as Product
      try {
        const productUpdated = await productRepository.updateProduct(productId, product)

        return {
          statusCode: 200,
          body: JSON.stringify(productUpdated)
        }
      } catch (ConditionalCheckFailedException) {
        return {
          statusCode: 404,
          body: 'Product not found'
        }
      }
    } else if (event.httpMethod === "DELETE") {
      console.log(`DELETE /products/${productId}`)

      try {
        const productDeleted = await productRepository.deleteProduct(productId)
        return {
          statusCode: 200, // o codigo de status representa que o recurso foi deletado com sucesso
          body: JSON.stringify(productDeleted),
        }
      } catch (error) {
        console.error((<Error>error).message)
        return {
          statusCode: 404, // o codigo de status representa que o recurso não foi encontrado
          body: ((<Error>error).message),
        }
      }
    }
  }

  return {
    statusCode: 400,
    body: "Bad Request",
  }
}