import * as lambda from "aws-cdk-lib/aws-lambda"
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"
import * as cdk from "aws-cdk-lib"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import * as ssm from "aws-cdk-lib/aws-ssm"
import { Construct } from "constructs"
import * as iam from "aws-cdk-lib/aws-iam"
// Biblioteca para criar tópicos SNS
import * as sns from "aws-cdk-lib/aws-sns"
// Biblioteca para criar inscrição/assinatura de tópicos SNS
import * as subs from "aws-cdk-lib/aws-sns-subscriptions"
// Biblioteca para criar filas SQS
import * as sqs from "aws-cdk-lib/aws-sqs"
// Biblioteca para configurar a fonte de envetos da função lambda
import * as lambdaEventSource from "aws-cdk-lib/aws-lambda-event-sources"

/**
 *  Precisa de um atributo de acesso a tabela de produtos 
 *      para primeiro consultar existencia para depois trazer os dados
 * 
 *  */
interface OrdersAppStackProps extends cdk.StackProps {
    productsDdb: dynamodb.Table,
    eventsDdb: dynamodb.Table // Acessar a tabela de eventos
}

export class OrdersAppStack extends cdk.Stack {
    // Expor a função de pedidos para ser lida na stack do API Gateway
    readonly ordersHandler: lambdaNodeJS.NodejsFunction

    constructor(scope: Construct, id: string, props: OrdersAppStackProps) {
        super(scope, id, props)


        /**
         * Criando a tabela de pedidos
         * 
         */
        const ordersDdb = new dynamodb.Table(this, "OrdersDdb", {
            tableName: "orders",
            partitionKey: {
                name: "pk",
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: "sk",
                type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PROVISIONED, // Padrão
            readCapacity: 1,
            writeCapacity: 1
        })

        /**
         * Instanciando Layer de Pedidos
         * 
         */
        const ordersLayerArn = ssm.StringParameter
            .valueForStringParameter(this, "OrdersLayerVersionArn")
        const ordersLayer = lambda.LayerVersion
            .fromLayerVersionArn(this, "OrdersLayerVersionArn", ordersLayerArn)

        const ordersApiLayerArn = ssm.StringParameter
            .valueForStringParameter(this, "OrdersApiLayerVersionArn")
        const ordersApiLayer = lambda.LayerVersion
            .fromLayerVersionArn(this, "OrdersApiLayerVersionArn", ordersApiLayerArn)


        const orderEventsLayerArn = ssm.StringParameter
            .valueForStringParameter(this, "OrderEventsLayerVersionArn")
        const orderEventsLayer = lambda.LayerVersion
            .fromLayerVersionArn(this, "OrderEventsLayerVersionArn", orderEventsLayerArn)

        const orderEventsRepositoryLayerArn = ssm.StringParameter
            .valueForStringParameter(this, "OrderEventsRepositoryLayerArn")
        const orderEventsRepositoryLayer = lambda.LayerVersion
            .fromLayerVersionArn(this, "OrderEventsRepositoryLayer", orderEventsRepositoryLayerArn)

        /**
         * Instanciando Layer de Produtos
         * 
         */
        const productsLayerArn = ssm.StringParameter
            .valueForStringParameter(this, "ProductsLayerVersionArn")
        const productsLayer = lambda.LayerVersion
            .fromLayerVersionArn(this, "ProductsLayerVersionArn", productsLayerArn)


        // Topico para pedidos criados e pedidos apagados (tudo em um só, depois filtraremos assinaturas)
        const orderTopic = new sns.Topic(this, "OrderEventsTopic", {
            displayName: "Order Events Topic", // Descrição do topico
            topicName: "order-events-topic", // Nomde do topico
        })

        this.ordersHandler = new lambdaNodeJS.NodejsFunction(this, "OrdersFunction", {
            runtime: lambda.Runtime.NODEJS_18_X,
            functionName: "OrdersFunction",
            entry: "lambda/orders/ordersFunction.ts",
            handler: "handler",
            memorySize: 128,
            timeout: cdk.Duration.seconds(2),
            bundling: {
                minify: false,
                sourceMap: true,
            },
            environment: {
                PRODUCTS_DDB: props.productsDdb.tableName,
                ORDERS_DDB: ordersDdb.tableName,
                ORDER_EVENTS_TOPIC_ARN: orderTopic.topicArn, // ARN do tópico
            },
            layers: [ordersLayer, productsLayer, ordersApiLayer, orderEventsLayer],
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
        })

        /**
         * Definindo permissões para a função de pedidos
         * 
         */

        // Permissão para ler e escrever os pedidos (handler tem acesso de leitura e escrita na tabela de pedidos)
        ordersDdb.grantReadWriteData(this.ordersHandler)

        /**
         * Acesso a leitura da tabela de produtos
         *      garantindo que não haja escrita e modificações a uma tabela que não é desse serviço
         */
        props.productsDdb.grantReadData(this.ordersHandler)

        // Permissão para a função de pedidos publicar mensagens no tópico de eventos de pedidos
        orderTopic.grantPublish(this.ordersHandler)



        /** 
         * Função de Eventos de Pedidos
         *
         *  Essa função vai se inscrever mas não vai ALTERAR o tópico, LOGO não precisa acessar a variavel de ambiente que dá esse acesso a ela
         * 
         * 
         * Policies de acesso a tabela de eventos fará: 
         *      Essa função só pode acessar a tabela se for para CRIAR itens de EVENTOS DE PEDIDOS na tabela de eventos  --> Dando uma maior restrição de acesso
         */
        const orderEventsHandler = new lambdaNodeJS.NodejsFunction(this, "OrderEventsFunction", {
            runtime: lambda.Runtime.NODEJS_18_X,
            functionName: "OrderEventsFunction",
            entry: "lambda/orders/orderEventsFunction.ts",
            handler: "handler",
            memorySize: 128,
            timeout: cdk.Duration.seconds(2),
            bundling: {
                minify: false,
                sourceMap: true,
            },
            environment: {
                ORDER_EVENTS_DDB: props.eventsDdb.tableName,  // Acessando a tabela de eventos
            },
            layers: [orderEventsLayer, orderEventsRepositoryLayer], // Só precisa do layer de eventos
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
        })

        /**
         * Inscrevendo a função de eventos de pedidos no topico de pedidos
         *      Adicionando uma inscrição no topico, passando por parametro a nova inscrição sendo criada para a função orderEventsHandler
         */
        orderTopic.addSubscription(new subs.LambdaSubscription(orderEventsHandler))

        /**
         * Define como será o acesso a tabela de eventos atraves de politicas de acesso
         * 
         * 
         *      actions: ["dynamodb:PutItem"] --> acessar o "dynamodb" e a ação que queremos permitir ou negar é "PutItem" (criar um item)
         */
        const eventsDdbPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW, // Queremos permitir ou negar o acesso?
            actions: ["dynamodb:PutItem"], // Qual(is) é(são) a(s) ação(ões) que queremos permitir ou negar? (pode ser uma lista de açoes)
            resources: [props.eventsDdb.tableArn], // Qual(is) é(são) o(s) recurso(s) [tabelas, stacks, etc..] que queremos permitir ou negar o acesso? (pode ser uma lista de recursos)
            conditions: {
                ['ForAllValues:StringLike']: {
                    'dynamodb:LeadingKeys': ['#order_*'] // have que define a entidade comece com "#order_"
                } // Só posso escrever valores do tipo string desde que a chave que define a entidade comece com "#order_"
            } // Condições para permitir o acesso a tabela
        })

        /**
         * Adicionando a politica de acesso a função de eventos para que ela possa escrever na tabela de eventos
         * 
         */
        orderEventsHandler.addToRolePolicy(eventsDdbPolicy)

        const billingHandler = new lambdaNodeJS.NodejsFunction(this, "BillingEventsFunction", {
            runtime: lambda.Runtime.NODEJS_18_X,
            functionName: "BillingEventsFunction",
            entry: "lambda/orders/billingEventsFunction.ts",
            handler: "handler",
            memorySize: 128,
            timeout: cdk.Duration.seconds(2),
            bundling: {
                minify: false,
                sourceMap: true,
            },
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
        })

        orderTopic.addSubscription(new subs.LambdaSubscription(billingHandler, {
            filterPolicy: {
                // Filtrando eventos de pedidos que tenham o atributo eventType com o valores presentes na lista de permissão
                // Poderia ter um lista para negar a inscrição tbm 
                eventType: sns.SubscriptionFilter.stringFilter({
                    allowlist: ["ORDER_CREATED"]
                })
            }
        }))


        const orderEventsDlq = new sqs.Queue(this, "OrderEventsDlq", {
            queueName: "order-events-dlq",
            enforceSSL: false,
            encryption: sqs.QueueEncryption.UNENCRYPTED,
            retentionPeriod: cdk.Duration.days(10), // Quanto tempo a mensagem pode ficar na fila 10 dias (padrão é 4)
        })


        // Criando a fila de eventos de pedidos
        const orderEventsQueue = new sqs.Queue(this, "OrderEventsQueue", {
            queueName: "order-events", //nome da fila
            // Tirando o acesso criptografado a fila
            enforceSSL: false,
            encryption: sqs.QueueEncryption.UNENCRYPTED,
            deadLetterQueue: {
                maxReceiveCount: 3, // Quantas vezes a mensagem pode ser recebida (tentar tratar o erro) antes de ser enviada para a DLQ
                queue: orderEventsDlq, // Fila de eventos de pedidos DLQ
            }
        })

        /**
         *  Inscrevendo a fila de eventos de pedidos no tópico de eventos de pedidos
         * 
         *      Construir um filtro de inscrição na fila de eventos
         */
        orderTopic.addSubscription(new subs.SqsSubscription(orderEventsQueue, {
            filterPolicy: {
                eventType: sns.SubscriptionFilter.stringFilter({
                    allowlist: ["ORDER_CREATED"]
                })
            }
        }))




        const orderEmailsHandler = new lambdaNodeJS.NodejsFunction(this, "OrderEmailsEventsFunction", {
            runtime: lambda.Runtime.NODEJS_18_X,
            functionName: "OrderEmailsEventsFunction",
            entry: "lambda/orders/orderEmailsEventsFunction.ts",
            handler: "handler",
            memorySize: 128,
            timeout: cdk.Duration.seconds(2),
            bundling: {
                minify: false,
                sourceMap: true,
            },
            layers: [orderEventsLayer], // Vai receber um evento de pedido
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
        })

        // Adicionando a fonte de eventos para a função orderEmailsHandler
        orderEmailsHandler.addEventSource(new lambdaEventSource.SqsEventSource(orderEventsQueue, /* {
            batchSize: 5, // Esperar que cinco mensagens apareçam na fila antes de invocar a função
            enabled: true,
            maxBatchingWindow: cdk.Duration.minutes(1), // Tempo máximo que a fila vai espera para invocar a função (mesmo que não tenha 5 mensagens manda se passou 1 minuto)
        } */))
        // Dando permissão a função orderEmailsHandler de consumir mensagens da fila
        orderEventsQueue.grantConsumeMessages(orderEmailsHandler)

    }
}