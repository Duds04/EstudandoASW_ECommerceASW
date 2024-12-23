import { DynamoDB, SNS } from "aws-sdk"
import { Order, OrderRepository } from "/opt/nodejs/ordersLayer"
import { Product, ProductRepository } from "/opt/nodejs/productsLayer"
import * as AWSXRay from "aws-xray-sdk"
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda"
import { CarrierType, OrderProductResponse, OrderRequest, OrderResponse, PaymentType, ShippingType } from "/opt/nodejs/ordersApiLayer"
import { OrderEvent, OrderEventType, Envelope } from "/opt/nodejs/orderEventsLayer"
import { v4 as uuid } from "uuid"

AWSXRay.captureAWS(require("aws-sdk"))

const ordersDdb = process.env.ORDERS_DDB!
const productsDdb = process.env.PRODUCTS_DDB!
const orderEventsTopicArn = process.env.ORDER_EVENTS_TOPIC_ARN! // ARN do tópico

const ddbClient = new DynamoDB.DocumentClient()
const snsClient = new SNS() // criando cliente SNS

const orderRepository = new OrderRepository(ddbClient, ordersDdb)
const productRepository = new ProductRepository(ddbClient, productsDdb)


export async function handler(event: APIGatewayProxyEvent, context: Context): 
   Promise<APIGatewayProxyResult> {

   const method = event.httpMethod
   const apiRequestId = event.requestContext.requestId
   const lambdaRequestId = context.awsRequestId

   console.log(`API Gateway RequestId: ${apiRequestId} - LambdaRequestId :${lambdaRequestId}`)

   if (method === 'GET') {
      if (event.queryStringParameters) {
         const email = event.queryStringParameters!.email
         const orderId = event.queryStringParameters!.orderId
         if (email) {
            if (orderId) {
               //Get one order from an user
               try {
                  const order = await orderRepository.getOrder(email, orderId)
                  return {
                     statusCode: 200,
                     body: JSON.stringify(convertToOrderResponse(order))
                  }   
               } catch (error) {
                  console.log((<Error>error).message)
                  return {
                     statusCode: 404,
                     body: (<Error>error).message
                  }
               }
            } else {
               //Get all orders from an user
               const orders = await orderRepository.getOrdersByEmail(email)
               return {
                  statusCode: 200,
                  body: JSON.stringify(orders.map(convertToOrderResponse))
               }
            }
         }
      } else {
         //Get all orders
         const orders = await orderRepository.getAllOrders()
         return {
            statusCode: 200,
            body: JSON.stringify(orders.map(convertToOrderResponse))
         }
      }
   } else if (method === 'POST') {
      console.log('POST /orders')
      
      const orderRequest = JSON.parse(event.body!) as OrderRequest
      const products = await productRepository.getProductsByIds(orderRequest.productIds)
      
      if (products.length === orderRequest.productIds.length) {

         const order = buildOrder(orderRequest, products)
         const orderCreatedPromisse =  orderRepository.createOrder(order)

         /** Publicar evento de criação de pedido
          * 
          *    Retorna uma promisse precisa aguardar que ela seja resolvida
          * 
          * Retorno pode ser usado para rastrear a criação do evento
          * 
          * 
          * Tirando o await da frente da chamada da função, a execução do código não espera a execução da função (logo duas operações assincronas podem ser feitas em paralelo)
          */
         const eventResultPromisse = sendOrderEvent(order, OrderEventType.CREATED, lambdaRequestId)


         /**
          *  Aguarda a execução de todas a s promisses passasdas na lista para prosseguir a execução  
          * 
          *  Results guarda o retorno das duas operações assincronas como um vetor
          *    indice 0: retorno da criação do pedido (orderCreatedPromisse)
          *    indice 1: retorno da publicação do evento (eventResultPromisse)
          * 
          * */ 
         const results = await Promise.all([orderCreatedPromisse, eventResultPromisse])
         console.log(`Order created event published - OrderId ${order.sk} - MessageId ${results[1].MessageId}`) 

         return {
            statusCode: 201,
            body: JSON.stringify(convertToOrderResponse(order))
         }
      } else {
         return {
            statusCode: 404,
            body: "Some product was not found"
         }
      }
   } else if (method === 'DELETE') {
      console.log('DELETE /orders')
      const email = event.queryStringParameters!.email!
      const orderId = event.queryStringParameters!.orderId!

      try {
         const orderDelete = await orderRepository.deleteOrder(email, orderId)
         /** Logo apos a criação do evento de delete */
         const eventResult = await sendOrderEvent(orderDelete, OrderEventType.DELETE, lambdaRequestId)
         console.log(`Order deleted event published - OrderId ${orderDelete.sk} - MessageId ${eventResult.MessageId}`)
         
         return {
            statusCode: 200,
            body: JSON.stringify(convertToOrderResponse(orderDelete))
         }   
      } catch (error) {
         console.log((<Error>error).message)
         return {
            statusCode: 404,
            body: (<Error>error).message
         }
      }
   }

   return {
      statusCode: 400,
      body: 'Bad request'
   }
}

/** Metodo auxiliar para publicar eventos no topico SNS
 *       Vai ser usada em diferentes partes do código
 * 
 * Parametros:
 *    - order: Order - Pedido que gerou o evento (que foi alterado/criado)
 *    - eventType: OrderEventType - Tipo de evento que foi gerado
 *    - lambdaRequestId: string - RequestId da execução da função lambda que originou o evento
 * */ 
function sendOrderEvent(order: Order, eventType: OrderEventType, lambdaRequestId: string) {
   const productCodes: string[] = []

   // Para cada produto dentro da lista (order.products) vou adicionar o código do produto DESSA LISTA em outra lista denominada productCodes
   order.products?.forEach((product) => {
      productCodes.push(product.code)
   })

   const orderEvent: OrderEvent = {
      email: order.pk,
      orderId: order.sk!, // sk é obrigatório (! = not null)
      billing: order.billing,
      shipping: order.shipping,
      requestId: lambdaRequestId,
      productCodes: productCodes
   }

   // Mensagem que será publicada
   const envelope: Envelope = {
      eventType: eventType,
      data: JSON.stringify(orderEvent)
   }

   // Assim que é publicado uma informação em um tópico SNS
      // Invocação assincrona, precisa aguardar a resposta
   return snsClient.publish({
      TopicArn: orderEventsTopicArn, // Amazon resorce name do tópico
      // Mensagem sendo enviada
      Message: JSON.stringify(envelope), // Converte o objeto para string
      MessageAttributes:{
         // Posso definir um atributo de qualquer nome
         eventType: {
            DataType: 'String', // tipo do atributo
            StringValue: eventType // valor do atributo (param do metodo, eventType)
         }
      } // Inserir atributo a ser publicado para ser feito depois a filtragem dos eventos recebidos por quem assina a função
   }).promise()
}


function convertToOrderResponse (order: Order): OrderResponse {
   const orderProducts: OrderProductResponse[] = []
   // se o atributo products não existir (opcional -> ?) ele não vai executar o forEach
   order.products?.forEach((product) => {
      orderProducts.push({
         code: product.code,
         price: product.price
      })
   })
   const orderResponse: OrderResponse = {
      email: order.pk,
      id: order.sk!,
      createdAt: order.createdAt!,
      products: orderProducts.length ? orderProducts : undefined, // se o tamanho for maior que zero manda a lista se não manda undefined
      billing: {
         payment: order.billing.payment as PaymentType,
         totalPrice: order.billing.totalPrice
      },
      shipping: {
         type: order.shipping.type as ShippingType,
         carrier: order.shipping.carrier as CarrierType
      }
   }

   return orderResponse
}

function buildOrder(orderRequest: OrderRequest, products: Product[]): Order {
   const orderProducts: OrderProductResponse[] = []
   let totalPrice = 0

   products.forEach((product) => {
      totalPrice += product.price
      orderProducts.push({
         code: product.code,
         price: product.price
      })
   })


   const order: Order = {
      pk: orderRequest.email,
      sk: uuid(),
      createdAt: Date.now(),
      billing: {
         payment: orderRequest.payment,
         totalPrice: totalPrice
      },
      shipping: {
         type: orderRequest.shipping.type,
         carrier: orderRequest.shipping.carrier
      },
      products: orderProducts
   }

   return order
}
