import * as cdk from "aws-cdk-lib"
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"
import * as apigateway from "aws-cdk-lib/aws-apigateway" // biblioteca para criar API Gateway
import * as cwlogs from "aws-cdk-lib/aws-logs" // biblioteca para criar logs no CloudWatch
import { Construct } from "constructs"

// ao atribuir um novo parametro na interface é necessário adicionar no ECommerceApiStack (ou seja declarar lá que essa stack existe)
// interface para passar propriedades para a stack sendo criada
interface ECommerceApiStackProps extends cdk.StackProps {
    // Da acesso a nossa classe a função lambda de retornar produtos
    productsFetchHandler: lambdaNodeJS.NodejsFunction
    // Da acesso a nossa classe a função lambda de administração de produtos
    productsAdminHandler: lambdaNodeJS.NodejsFunction

    ordersHandler: lambdaNodeJS.NodejsFunction
}

export class ECommerceApiStack extends cdk.Stack {

    // sem atributo de classe (tudo no constructor) pois nenhuma stack externa precisa acessar essa função

    // Integrar o API Gateway com as funções lambda

    /* Integrar API Gateway com a função de busca de produtos 
        (quando fizer uma requisição get no endereço /products chamara a função criada)
    */


    constructor(scope: Construct, id: string, props: ECommerceApiStackProps) {
        super(scope, id, props)

        // como pastas que agrupam recursos de log
        // criando logs para a API 
        const logGroup = new cwlogs.LogGroup(this, "ECommerceApiLogs")

        // RestApi permite validações 
        // scope do recurso criado é a stack onde ele está sendo criado
        /* 
        geração de logs -> gera custos e pode ser um problema de segurança (logs podem conter informações sensíveis do usuario)
                            no ambiente de desenvolvimento é importante para se entender o comportamento da aplicação 
                            mas em produção é importante ter cuidado retirando informações sensíveis
        deployOptions --> contem algumas configurações de logs (cdk já faz essas definições de forma automatica)
             accessLogDestination --> onde irei gerar os logs
             accessLogFormat --> formato do log sendo gerado
               ajustando atributos do formato de log gerado
               httpMethod --> colocar no log o método HTTP que foi usado para invocar a API
               ip --> colocar no log o endereço IP de quem fez a requisição
               protocol --> colocar no log o protocolo usado para fazer a requisição (HTTP por exemplo)
               requestTime --> colocar no log o tempo em que a requisição foi feita
               resourcePath -->  colocar no log o caminho utilizado para acessar a requisição (dá para ver se tem requisição no endereço errado)
               responseLength -->  colocar no log o tamanho da resposta que foi enviada pela função lambda
               status -->  colocar no log o status da resposta que foi enviada pela função lambda
               caller --> idenficar quem invocou o API Gateway (quem fez a requisição)
               user --> identificar quem foi o usuário que fez a requisição
       */
        const api = new apigateway.RestApi(this, "ECommerceApi", {
            restApiName: "ECommerceApi",
            cloudWatchRole: true,
            deployOptions: {
                accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
                accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
                    httpMethod: true,
                    ip: true,
                    protocol: true,
                    requestTime: true,
                    resourcePath: true,
                    responseLength: true,
                    status: true,
                    caller: true,
                    user: true,
                }),
            }
        })

        this.createProductsService(props, api) 
        // passando o mesmo apiGateway para a funç de pedidos
        this.createOrdersService(props, api)
    }

    private createProductsService(props: ECommerceApiStackProps, api: apigateway.RestApi) {

        // criando uma integração do API Gateway com a função lambda productsFetchHandler
        const productsFetchIntegration = new apigateway.LambdaIntegration(props.productsFetchHandler)
       
        // definindo de que forma a função lambda será chamada (como ela será integrada com o API Gateway)
        // criando recurso que representa meu serviço de produtos ("/products")
        // adicionando um novo recurso na raiz ("/") da API
        const productsResource = api.root.addResource("products")

        // Invoca ao ser chamado o recurso /products com o metodo GET a função productsFetchIntegration
        productsResource.addMethod("GET", productsFetchIntegration)

        /* Adicionando um recurso novo recurso dentro do recurso /products para receber como parametro o id do produto
        */
        const productIdResource = productsResource.addResource("{id}")
        productIdResource.addMethod("GET", productsFetchIntegration)

        // criando uma integração do API Gateway com a função lambda productsAdminHandler
        const productsAdminIntegration = new apigateway.LambdaIntegration(props.productsAdminHandler)

        // Outras operacões de administração de produtos
        // POST /products --> criar um novo produto	
        // Dentro do recurso raiz ("/products") adiciona esse novo metodo
        productsResource.addMethod("POST", productsAdminIntegration)
        // PUT /products/{id} --> atualizar um produto existente
        productIdResource.addMethod("PUT", productsAdminIntegration)
        // DELETE /products/{id} --> deletar um produto existente
        productIdResource.addMethod("DELETE", productsAdminIntegration)
    }

    private createOrdersService(props: ECommerceApiStackProps, api: apigateway.RestApi) {
        // criando uma integração do API Gateway com a função lambda ordersHandler
        const ordersIntegration = new apigateway.LambdaIntegration(props.ordersHandler)

        // recurso (/orders)
            // cria na raiz do nosso apiGateway esse recurso 
        const ordersResource = api.root.addResource("orders")

        /**
         * * GET /orders --> buscar todos os pedidos
         * 
         * * GET /orders?email=exemplo@gmail.com 
         *      --> buscar um pedido pelo email do cliente
         *      pegando parametros com queryString
         * 
         * * GET /orders?email=exemplo@gmail.com&orderID=123
         *      --> buscar um pedido pelo email do cliente e pelo id do pedido
         *      pegando parametros com queryString
         * 
         * 
         * 
         * ! Nesse caso como é o mesmo tipo de requisição HTTP podemos tratar com um unico metodo
         *  */ 
        ordersResource.addMethod("GET", ordersIntegration)


        /**
         * Validador para deletar um pedido
         * 
         * Atributos:
         *  restApi --> API que será usada
         *  requestValidatorName --> nome do validador
         *  validateRequestParameters --> diz se queremos validar os parametros da minha requisição
         *  validateRequestBody --> diz se queremos validar o corpo da requisição, formato da mensagem que está chegando
         * 
         */
        const ordersDeletionValidator = new apigateway.RequestValidator(this, "OrdersDeletionValidator", {
            restApi: api,
            requestValidatorName: "OrdersDeletionValidator",
            validateRequestParameters: true,
        })
        
        /**
         * * DELETE /orders?email=exemplo@gmail.com&orderID=123
         *   
         *       Definindo validação para que só invoque o metodo se passarmos os parametros corretos (evitar invocações desnecessárias, reduz custos) 
         * 
         *        --> requestParameters (define quais são os parametros, de onde eles vem e se  são obrigatórios para invocar o metodo)
         *             'method.request.querystring.email': true, (definindo o parametro email como obrigatório)
         *              'method.request.querystring.orderID': true, (definindo o parametro orderID como obrigatório)
         * 
         *       --> requestValidator (validador que será usado para validar a requisição)
         *  */ 
        ordersResource.addMethod("DELETE", ordersIntegration, {
            requestParameters: {
                'method.request.querystring.email': true,
                'method.request.querystring.orderID': true,
            },
            requestValidator: ordersDeletionValidator,
        })
        
        // * POST /orders --> criar um novo pedido
        ordersResource.addMethod("POST", ordersIntegration)

    }

}