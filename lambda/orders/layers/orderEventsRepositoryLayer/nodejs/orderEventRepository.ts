import { DocumentClient } from "aws-sdk/clients/dynamodb"

/**
 * Criando a interface que define o evento de pedido
 * 
 * Para salvar e receber eventos de pedidos da tabela
 *  */ 
export interface OrderEventDdb {
    pk: string,
    sk: string,
    ttl: number,
    email: string,
    createdAt: number,
    requestId: string,
    eventType: string,
    info: {
        orderId: string,
        productsCodes: string[],
        messageId: string // identificação unica da mensagem
    } // informações adicionais sobre o pedido
}

/**
 * Criando a interface que representa o repositorio de eventos de pedidos
 * 
 * repositorio é responsável por salvar e receber eventos de pedidos
 * 
 *  */
export class OrderEventRepository {
    private ddbClient: DocumentClient
    private eventsDdb: string  // Nome da tabela de eventos
    
    // Devemos receber esses dois parametros para instanciar o repositório
    constructor(ddbClient: DocumentClient, eventsDdb: string) {
        this.ddbClient = ddbClient
        this.eventsDdb = eventsDdb
    }

    /**
     * Recebendo o evento já pronto
     */
    createdOrderEvent(orderEvent: OrderEventDdb) {
        return this.ddbClient.put({
            TableName: this.eventsDdb,
            Item: orderEvent
        }).promise()
    }
}