// Tipos de eventos possiveis
export enum OrderEventType {
    CREATED = "ORDER_CREATED",
    DELETE = "ORDER_DELETED"
}

// Interface que define o envelope  (O que será publicado no SNS)
export interface Evelope {
    eventType: OrderEventType,
    data: string
}
///*  */
// Formato do data evento (a ser passado para o data do envelope)
export interface OrderEvent {
    email: string,
    orderId: string,
    billing: {
        payment: string,
        totalPrice: number
    },
    shipping: {
        type: string,
        carrier: string
    },
    productCodes: string[]
    requestId: string, // Deu origem a transação
}