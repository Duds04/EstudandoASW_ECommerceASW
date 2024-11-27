import { DocumentClient } from "aws-sdk/clients/dynamodb"
// gerar um numero aleatorio para identificação unica do pedido
import { v4 as uuid } from "uuid"

// Criando uma interface que representa o produto guardado dentro do pedido
export interface OrderProduct {
    code: string,
    price: number,
}

// Criando uma interface que representa o pedido
export interface Order {
    pk: string,
    // valor desse campo definido dentro do repositorio
    // não precisa passar como parametro
    sk?: string,
    createdAt?: number,
    shipping: {
        type: "URGENT" | "ECONOMIC", // define dois tipos de envios
        carrier: "CORREIOS" | "FEDEX",
    },
    billing: {
        payment: "CREDIT_CARD" | "DEBIT_CARD" | "CASH",
        totalPrice: number,
    }
    products: OrderProduct[],	// lista de produtos de pedidos
}

// Classe que representa o repositorio de pedidos
export class OrderRepository {
    private ddbClient: DocumentClient
    private ordersDdb: string

    constructor(ddbClient: DocumentClient, ordersDdb: string) {
        this.ddbClient = ddbClient
        this.ordersDdb = ordersDdb

    }

    // Operação para criar um pedido
    async createOrder(order: Order): Promise<Order> {

        // Os demais atributos são passados como parametro

        order.sk = uuid() // gerando um id unico para o pedido
        order.createdAt = Date.now()

        // Criando um item na tabela de pedidos
        await this.ddbClient.put({
            TableName: this.ordersDdb,
            Item: order,
        }).promise()


        
        return order
    }

    async getAllOrders(): Promise<Order[]> {
        // Obtendo todos os pedidos
        const data = await this.ddbClient.scan({
            TableName: this.ordersDdb,
        }).promise()

        return data.Items as Order[]
    }


    // Pesquisa todos os pedidos de mesmo email
    async getOrdersByEmail(email: string): Promise<Order[]> {
        // Pesquisando pedido pela chave primaria (pk, que é = ao email do client)
        const data = await this.ddbClient.query({
           TableName: this.ordersDdb,
           KeyConditionExpression: "pk = :email",
            // Valor do email da pesquis é = ao email passado como parametro
           ExpressionAttributeValues: {
              ":email": email
           }
        }).promise()
        return data.Items as Order[]
     }
  

  
    // Buscar pedido especifico
    async getOrder(email: string, orderId: string): Promise<Order> {
        const data = await this.ddbClient.get({
            TableName: this.ordersDdb,
            Key: {
                pk: email,
                sk: orderId,
            }
        }).promise()

        if(!data.Item) {
            throw new Error("Order not found")
        }

        return data.Item as Order
    }

    async deleteOrder(email: string, orderId: string): Promise<Order> {
        const data = await this.ddbClient.delete({
            TableName: this.ordersDdb,
            Key: {
                pk: email,
                sk: orderId,
            },
            ReturnValues: "ALL_OLD" // retorna info apagada
        }).promise()

        if(!data.Attributes) {
            throw new Error("Order not found")
        }
        
        return data.Attributes as Order
    }

}