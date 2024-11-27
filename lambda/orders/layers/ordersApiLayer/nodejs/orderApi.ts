// Vai conter o modelo de requisição e resposta da minha API

// Valores possiveis de tipo de pagamento
export enum PaymentType {
    CASH = "CASH",
    CREDIT_CARD = "CREDIT_CARD",
    DEBIT_CARD = "DEBIT_CARD"
}

// Valores possiveis de tipo de envio
export enum ShippingType {
    ECONOMIC = "ECONOMIC",
    URGENT = "URGENT"
}

// Valores possiveis de transportadoras
export enum CarrierType {
    CORREIOS = "CORREIOS",
    FEDEX = "FEDEX",
}

// Modelo de Lista de produtos
export interface OrderProductResponse {
    code: string,
    price: number
}

// Modelo de requisição de  criação pedido 
export interface OrderRequest {
    email: string,
    productIds: string[],
    payment: PaymentType,
    shipping: {
        type: ShippingType,
        carrier: CarrierType,
    }
}

// Modelo de resposta de busca  de pedido 
    // Não mostra todas as informações do pedido, apenas o necessário, o que faz sentido para o cliente
export interface OrderResponse {
    email: string,
    id: string, // Id do pedido
    createdAt: number,
    // Infos sobre o pagamento
    billing: {
        totalPrice: number,
        payment: PaymentType,
    },
    shipping: {
        type: ShippingType,
        carrier: CarrierType,
    },
    products: OrderProductResponse[]
}