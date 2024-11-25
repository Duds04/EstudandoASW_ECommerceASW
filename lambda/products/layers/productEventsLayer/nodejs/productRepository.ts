import { DocumentClient } from "aws-sdk/clients/dynamodb"
import { v4 as uuid } from "uuid" // gerar um numero aleatorio para o id do produto


// Enumerando quais são os tipos de eventos possiveis de serem registrados 
export enum ProductEventType{
    CREATED = "PRODUCT_CREATED",
    UPDATED = "PRODUCT_UPDATED",
    DELETED = "PRODUCT_DELETED"
}

// Interface para representar um EVENTO em cima de um produto
export interface ProductEvent {
    requestId: string, // identificação unica do evento
    eventType: ProductEventType,
    productId: string,
    productCode: string,
    productPrice: number,
    email: string, // email do usuario que fez a ação do evento
} 

