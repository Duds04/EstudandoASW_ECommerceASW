import { Callback, Context } from "aws-lambda";
import { ProductEvent } from "/opt/nodejs/productEventsLayer";
import { DynamoDB } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";

// Captura tudo o que for feito com o sdk (acesso a tabela no nosso caso)
AWSXRay.captureAWS(require('aws-sdk'))

// capturando a variavel de ambiente que foi passada para a função lambda para utilizar a tabela de eventos
const eventsDdb = process.env.EVENTS_DDB!
// criando um cliente para acessar o DynamoDB
const ddbClient = new DynamoDB.DocumentClient()


/**  Funcão invocada por outra função lambda
     Função retorna valor através do callback

*/
export async function handler(event: ProductEvent, context: Context, callback: Callback): Promise<void> {
    // o que chegou de informação do evento 
    console.log(event);

    // Request ID dessa execução
    console.log(`Lamda Request ID: ${context.awsRequestId}`)

    // Tem que esperar que o evento seja concluido para continuar a execução 
    await createEvent(event)

    // NULL --> não houve erro
    // 2º Parametro --> resposta para o resultado
    callback(null, JSON.stringify({
        productEventCreated: true,
        message: "Product event created"
    }))
}

/** Criando um metodo auxiliar
 * Timestamp --> data e hora atual
 * 
 *  */ 
function createEvent(event: ProductEvent) {
    // Em milisegundos
    const timestamp = Date.now()
    // Cinco minutos no futuro (~~ --> arredonda para baixo)
    const ttl = ~~(timestamp / 1000) + 5 * 60
    
    // inserindo o evento na tabela do DynamoDB
    return ddbClient.put({
        TableName: eventsDdb,
        Item: {
            pk: `#product#${event.productCode}`,
            sk: `${event.eventType}#${timestamp}`,
            email: event.email,
            createdAt: timestamp,
            requestId: event.requestId, // que gerou o evento na função anterior
            eventType: event.eventType,
            info: { 
                productId: event.productId,
                price: event.productPrice
            },
            ttl: ttl
        }
    }).promise()
}