import { OrderEventDdb, OrderEventRepository } from '/opt/nodejs/orderEventsRepositoryLayer';
import * as AWSXRay from "aws-xray-sdk"
import { AWSError, DynamoDB } from "aws-sdk"
import { Context, SNSEvent, SNSMessage } from "aws-lambda"
import { OrderEvent, Evelope } from "/opt/nodejs/orderEventsLayer"
import { PromiseResult } from 'aws-sdk/lib/request';


/**  
 * Essa função só pode acessar a tabela se for para CRIAR itens de EVENTOS DE PEDIDOS na tabela de eventos  --> Dando uma maior restrição de acesso
 * */

AWSXRay.captureAWS(require("aws-sdk"))

const orderEventsDdb = process.env.ORDER_EVENTS_DDB!

const ddbClient = new DynamoDB.DocumentClient() // Cliente para acessar o DynamoDB
const orderEventsRepository = new OrderEventRepository(ddbClient, orderEventsDdb) // Instanciando o repositório de eventos de pedidos

/**
 * 
 * SNSEvent --> Evento que é enviado para a função
 * Contexto --> informações de onde nossa função está sendo invocada
 * 
 * Não retorna nada (void) pois a invocação é sempre assíncrona
 */
export async function handler(event: SNSEvent, context: Context): Promise<void> {
    /**
     * Records guarda uma lista das mensagens que foram enviadas para a função
     */


    /**
     * Promises --> Lista de promessas que será usada para aplicar a execução de forma paralela
     */
    const promises: Promise<PromiseResult<DynamoDB.DocumentClient.PutItemOutput, AWSError>>[] = []
    /**
     * Adicionando os eventos na tabela de forma paralela (já que não precisamos esperar a resposta de uma para adicionar a outra, ou seja são independentes um do outro)
     * 
     * createEvent(record.Sns.Message)
     *      Para cada mensagem que tenho dentro de records vou chamar o metodo createEvent e guardar a promessa dentro dessa lista
     * 
     */
    event.Records.forEach((record) => {
        promises.push(createEvent(record.Sns))
    })

    // Esperando todas as promessas serem resolvidas para finalizar a execução da função
        // O que efetivamente nos leva a esperar todas as mensagens serem adicionadas na tabela e sem precisar que seja feito de forma sequencial
    await Promise.all(promises) 

    // Só retorna depois que todos os registros foram adicionados na tabela
    return
}

/**
 * 
 * @param body --> Corpo da mensagem que foi enviada para a função
 */
function createEvent(body: SNSMessage){

    const envelope = JSON.parse(body.Message) as Evelope // Pegando o corpo da mensagem e transformando em um objeto do tipo Evelope

    const event = JSON.parse(envelope.data) as OrderEvent // Pegando o data e convertendo para um objeto do tipo OrderEvent para criarmos a variavel que representa as informações (o data) do evento	

    // Recebio o order event com esse messageId (identificador da mensagem recebida), orderId (identificador do pedido) e eventType (tipo do evento)
    console.log(
        `Recebi o Order Event - MessageId: ${body.MessageId}`
    )

    const timestamp = Date.now() // Pegando o tempo em milisegundos que recebi a mensagem

    const ttl = ~~(timestamp/1000) + 5 * 60  // Definindo o tempo de vida da mensagem (5 minutos) [Primeiro converte o timestamp de milisegundos para segundos (1s = 1000ms) e depois soma 5 minutos]

    const orderEventDdb: OrderEventDdb = {
        pk: `#order_${event.orderId}`, // Chave primária
        sk: `${envelope.eventType}#${timestamp}`, 
        ttl: ttl,
        email: event.email,
        createdAt: timestamp,
        requestId: event.requestId,
        eventType: envelope.eventType,
        info: {
            orderId: event.orderId,
            productsCodes: event.productCodes,
            messageId: body.MessageId
        }
    }

    // Inserindo o evento na tabela de eventos
    return orderEventsRepository.createdOrderEvent(orderEventDdb)
}