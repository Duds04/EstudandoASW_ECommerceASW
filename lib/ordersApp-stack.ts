import * as lambda from "aws-cdk-lib/aws-lambda"
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"
import * as cdk from "aws-cdk-lib"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import * as ssm from "aws-cdk-lib/aws-ssm"
import { Construct } from "constructs"

/**
 *  Precisa de um atributo de acesso a tabela de produtos 
 *      para primeiro consultar existencia para depois trazer os dados
 * 
 *  */
interface OrdersAppStackProps extends cdk.StackProps {
    productsDdb: dynamodb.Table
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



        /**
         * Instanciando Layer de Produtos
         * 
         */
        const productsLayerArn = ssm.StringParameter
            .valueForStringParameter(this, "ProductsLayerVersionArn")
        const productsLayer = lambda.LayerVersion
            .fromLayerVersionArn(this, "ProductsLayerVersionArn", productsLayerArn)


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
            },
            layers: [ordersLayer, productsLayer, ordersApiLayer],
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
    }
}