// Passo 1 criando as pastas e o arquivo seguindo o que foi definido anteriormente na Stack
// Passo 2: Altera o arquivo tsconfig.json para especificar onde o layer vai estar para o processo de build

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html
import { DocumentClient } from "aws-sdk/clients/dynamodb"
import { v4 as uuid } from "uuid" // gerar um numero aleatorio para o id do produto

// Criando uma interface que representa a tabela de produto
export interface Product {
    id: string,
    productName: string, // identificador "name" é reservado no DynamoDB
    code: string,
    price: number,
    model: string,
    productUrl: string, // identificador "url" é reservado no DynamoDB
}

// Criando metodos para acessar a tabela
export class ProductRepository {
    // Passar o cliente que vai ter acesso ao DynamoDB (cada instancia da função lambda tem seu cliente) (recebe por parametro)
    private ddbClient: DocumentClient
    // Nome da tabela que será acessada (recebe por parametro)
    private productsDdb: string

    // Params Cliente e Nome da tabela
    constructor(ddbClient: DocumentClient, productsDdb: string) {
        this.ddbClient = ddbClient
        this.productsDdb = productsDdb

        // Tendo um cliente DynamoDB tenho acesso a todas as operações em cima da minha tabela
    }

    /** Operação para pegar todos os produtos (só pra fins didaticos)
     * Scan --> varre **toda** a tabela e retorna um conjunto de itens (com bases nos filtros colocados)
     * custosa para tabelas com uma grande quantidade de itens pois passa por todos os itens da tabela
     * 
     * Operação assincrona quando executada na tabela (retorna uma promessa)
     *  operação assincorna é uma operação que funciona de forma independente do restante do código pq ela pode demorar para ser executada por inteiro
     *  */
    async getAllProducts(): Promise<Product[]> {
        // espera a promessa ser resolvida (ser executada) para retornar o resultado
        const data = await this.ddbClient.scan({
            TableName: this.productsDdb,
        }).promise()

        // os itens da tabela estão dentro desse atributo Items
        // usando a interface para definir o tipo de retorno e a conversão dos itens
        return data.Items as Product[]
    }

    /**
     * Operação para buscar um produto pelo seu ID
     * 
     */
    async getProductById(productId: string): Promise<Product> {
        // Get --> pega um item da tabela pela sua primary key
        // nome do campo que definimos como chave primaria, recebe o valor do parametro
        const data = await this.ddbClient.get({
            TableName: this.productsDdb,
            Key: {
                id: productId
            }
        }).promise()

        // Verifica se o produto não foi encontrado 
        // Item é um atributo que pode ser vazio, logo se ele não existir é porque o produto não foi encontrado
        if (!data.Item) {
            // O parametro é a mensagem que o erro vai retornar
            throw new Error("Product not found")
        }

        return data.Item as Product
    }

    /**
     * Acessar varios produtos em uma unica vez
     * 
     * Parametro: lista de ids dos produtos
     */
    async getProductsByIds(productIds: string[]): Promise<Product[]> {
        /** Lista de chaves que quero buscar
         * 
         * Atributo do tipo lista de Ids (que é são strings)
         * Inicializando a lista
         */
        const keys: { id: string }[] = []

        // Para cada id de produto passado como parametro, adiciono ele na lista de chaves
            // Conversão é necessária pois o atributo keys precisa ter o mesmo nome da chave primaria da tabela que quero pesquisar
        productIds.forEach(productId => {
            keys.push({ id: productId })
        })

        /** Busca varios itens da tabela de uma vez (em uma só requisição)
         * 
         *      RequestItems --> é um objeto que contem o nome da tabela e as chaves que quero buscar
         * 
         *  Com o comando batch eu poderia pesquisar em mais de uma tabela ao mesmo tempo
         * 
         */
        const data = await this.ddbClient.batchGet({
            RequestItems: {
                [this.productsDdb]: {
                    Keys: keys
                }
            }
        }).promise()

        // Response pode ou não vir, passa o nome da tabela que quero buscar as respostas e converter pra uma lista de products
        return data.Responses![this.productsDdb] as Product[]
    }


    /**
     * Persistindo (Criando, Salvando) um produto na tabela
     * adicionando um item do tipo da interface criada
     */
    async create(product: Product): Promise<Product> {
        // Id é gerado automaticamente
        product.id = uuid()
        await this.ddbClient.put({
            TableName: this.productsDdb,
            Item: product,
        }).promise()

        // retorna o produto com o id gerado
        return product
    }

    /** 
     * Apagar um produto da tabela pelo seu ID
     */
    async deleteProduct(productId: string): Promise<Product> {

        /** 
         * returnValues --> o que será retornado após a operação ser executada, o padrão é NONE (não retorna nada)
         *  ALL_OLD --> retorna o item antes de ser deletado  
        */

        const data = await this.ddbClient.delete({
            TableName: this.productsDdb,
            Key: {
                id: productId
            },
            ReturnValues: "ALL_OLD"
        }).promise()

        // Verifica se o produto não foi encontrado
        if (!data.Attributes) {
            throw new Error("Product not found")
        }

        // retorna o produto que foi deletado
        return data.Attributes as Product
    }

    /**
     * Atualizar (Alterar) um produto na tabela pelo seu ID
     */

    async updateProduct(productId: string, product: Product): Promise<Product> {
        /**
         * Id --> do produto a ser alterado
         * ConditionExpression: "attribute_exists(id)" --> só vai alterar se o ID do produto existir
         * Return Values --> UPDATED_NEW (retorna o item após a atualização)
         *  Alterar os campos da tabela
         *      UpdateExpression --> o que será atualizado 
         *          set productName = :name, code = :code, price = :price --> campos que serão alterados
         *      ExpressionAttributeValues --> valores que serão passados para a atualização
         *      
         *  */

        const data = await this.ddbClient.update({
            TableName: this.productsDdb,
            Key: {
                id: productId
            },
            ConditionExpression: 'attribute_exists(id)',
            ReturnValues: "UPDATED_NEW",
            UpdateExpression: "set productName = :n, code = :c, price = :p, model = :m, productUrl = :u",
            ExpressionAttributeValues: {
                ":n": product.productName,
                ":c": product.code,
                ":p": product.price,
                ":m": product.model,
                ":u": product.productUrl,
            }
        }).promise()

        // atribuindo o id do produto que foi alterado (o ! é para dizer que o atributo não é nulo)
        // se o produto não existir ele vai lançar uma exceção
        data.Attributes!.id = productId
        return data.Attributes as Product
    }


}