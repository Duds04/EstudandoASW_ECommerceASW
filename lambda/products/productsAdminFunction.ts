import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { DynamoDB } from "aws-sdk"


export async function handler(event: APIGatewayProxyEvent,
  context: Context): Promise<APIGatewayProxyResult> {

  // id unico da execução da função Lambda 
  const lambdaRequestId = context.awsRequestId
  // id da requisição que entrou pelo API Gateway
  // requestContext --> informações da requisição que entrou pelo API Gateway
  const apiRequestId = event.requestContext.requestId

  // gerando log no console Clound Watch AWS dos IDs [Log gera custos, e não colocar informações sensíveis]
  console.log(`API Gateway RequestId: ${apiRequestId} - Lambda RequestId: ${lambdaRequestId}`)

  // POST ("/products")
  // PUT ("/products/{id}")

  // if(event.resource === "/products"){
  //   console.log("POST /products")
  //   return {
  //       statusCode: 201, // o codigo de status representa que o recurso foi criado
  //       body: "POST /products", 
  //   }
  // } else if (event.resource === "/products/{id}") {
  //   const productId = event.pathParameters!.id as string

  //   // Verificando qual metodo foi acessado
  //   if(event.httpMethod === "PUT"){
  //       console.log(`PUT /products/${productId}"`)
  //       return {
  //           statusCode: 200, // o codigo de status representa que o recurso foi atualizado
  //           body: "PUT /products", 
  //       }
  //   } else if(event.httpMethod === "DELETE"){
  //       console.log(`DELETE /products/${productId}"`)
  //       return {
  //           statusCode: 200, // o codigo de status representa que o recurso foi deletado com sucesso
  //           body: "DELETE /products", 
  //       }
  //   }
  // }

  // return {
  //   statusCode: 400,
  //   body: "Bad Request",
  // }


  if (event.resource === "/products") {
    console.log("POST /products")
    return {
      statusCode: 201,
      body: "POST /products"
    }
  } else if (event.resource === "/products/{id}") {
    const productId = event.pathParameters!.id as string
    if (event.httpMethod === "PUT") {
      console.log(`PUT /products/${productId}`)
      try {
        return {
          statusCode: 200,
          body: "PUT /products"
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
        return {
          statusCode: 200,
          body: "DELETE /products"
        }
      } catch (error) {
        console.error((<Error>error).message)
        return {
          statusCode: 404,
          body: (<Error>error).message
        }
      }
    }
  }

  return {
    statusCode: 400,
    body: "Bad request"
  }
}