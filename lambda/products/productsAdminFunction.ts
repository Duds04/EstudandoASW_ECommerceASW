import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";


export async function handler(event: APIGatewayProxyEvent,
                                context:Context): Promise<APIGatewayProxyResult> {
      // id unico da execução da função Lambda 
      const lambdaRequestID = context.awsRequestId
      // id da requisição que entrou pelo API Gateway
          // requestContext --> informações da requisição que entrou pelo API Gateway
      const apiRequestId = event.requestContext.requestId
      // gerando log no console Clound Watch AWS dos IDs [Log gera custos, e não colocar informações sensíveis]
      console.log(`API Gateway Request ID: ${apiRequestId} - Lambda Request ID: ${lambdaRequestID}`)
  
      // POST ("/products")
      // PUT ("/products/{id}")

      if(event.resource === "/products"){
        console.log("POST /products")
        return {
            statusCode: 201, // o codigo de status representa que o recurso foi criado
            body: "POST /products", 
        }
      } else if (event.resource === "/products/{id}") {
        const productId = event.pathParameters!.id as string
        
        // Verificando qual metodo foi acessado
        if(event.httpMethod === "PUT"){
            console.log(`PUT /products/${productId}`)
            return {
                statusCode: 200, // o codigo de status representa que o recurso foi atualizado
                body: `PUT /products/${productId}`, 
            }
        } else if(event.httpMethod === "DELETE"){
            console.log(`DELETE /products/${productId}`)
            return {
                statusCode: 200, // o codigo de status representa que o recurso foi deletado com sucesso
                body: `DELETE /products/${productId}`, 
            }
        }
      }

      return {
        statusCode: 400,
        body: "Bad Request",
      }
}