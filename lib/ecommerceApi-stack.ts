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

        // criando uma integração do API Gateway com a função lambda productsFetchHandler
        const productsFetchIntegration = new apigateway.LambdaIntegration(props.productsFetchHandler)
        // definindo de que forma a função lambda será chamada (como ela será integrada com o API Gateway)

        // criando recurso que representa meu serviço de produtos ("/products")
        // adicionando um novo recurso na raiz ("/") da API
        const productsResource = api.root.addResource("products")

        // Invoca ao ser chamado o recurso /products com o metodo GET a função productsFetchIntegration
        productsResource.addMethod("GET", productsFetchIntegration)

        /* Buscando produto pelo seu id
            endereço do recurso é /products/{id} acessado pelo metodo GET
            adicionando um subrecurso ao recurso de "produtos" (que já tem o endereço /products definido) 
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
}