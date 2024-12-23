//https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda-readme.html
import * as lambda from "aws-cdk-lib/aws-lambda"

//https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs-readme.html
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"

//https://docs.aws.amazon.com/cdk/api/v2/docs/aws-construct-library.html
import * as cdk from "aws-cdk-lib"

// Biblioteca para criar tabelas no dynamoDB
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
// Sistem manager (usaremos para ler o parametro do layer)
import * as ssm from "aws-cdk-lib/aws-ssm"

import { Construct } from "constructs"

import * as iam from "aws-cdk-lib/aws-iam"

import * as sqs from "aws-cdk-lib/aws-sqs"



interface ProductsAppStackProps extends cdk.StackProps {
    // Tabela onde os eventos serão armazenados
    eventsDdb: dynamodb.Table
}

/* Representara uma Stack que irá conter os recursos de:
    Função de administração de produtos
    Função de exibição, pesquisa, do produtos 
    Função que gera eventos (pra ser guardado em outra tabela para ser retornado futuramente)
    Tabela de Produtos 
    Tabela de Eventos 
*/
export class ProductsAppStack extends cdk.Stack {
    /* Representando a product fetch (pesquisa valores) --> precisa acessar essa função externamente no API 
        Handler --> significa metodo que é chamado quando é invocado a função
    */
    readonly productsFetchHandler: lambdaNodeJS.NodejsFunction
    readonly productsAdminHandler: lambdaNodeJS.NodejsFunction // Função de administração de produtos (criar, deletar e editar produtos)
    readonly productsDbd: dynamodb.Table


    /* todo contrutor de stack deve ter esses três parametros
        escopo --> onde a stack será criada, inserida
        id --> nome da stack
        props --> propriedades da stack
        props é opcional (pois após ele tem um ?), se não for passado ele será um objeto vazio
    Funções sendo criadas dentro do construtor pois não terão seus modulos acessados fora da stack 
    */
    constructor(scope: Construct, id: string, props: ProductsAppStackProps) {
        super(scope, id, props)

        /**
         * removalPolicy --> politica de remoção da tabela (o que acontece com a tabela quando a stack é deletada)
         *      Padrão é que a tabela será mantida mesmo sem a stack (RETAIND) [geralmente se deixa assim]
         *      DESTROY --> deleta a tabela quando a stack é deletada [deixando assim pois é só para o curso]
         * partitionKey --> chave primaria da tabela (não pode ser alterada depois de criada)
         * billingMode --> modo de cobrança da tabela (PAY_PER_REQUEST --> paga por requisição feita na tabela, não por capacidade reservada)
         * readCapacity --> capacidade de leitura da tabela (quantidade de leituras por segundo que a tabela pode fazer)
         * writeCapacity --> capacidade de escrita da tabela (quantidade de escritas por segundo que a tabela pode fazer)
         */

        this.productsDbd = new dynamodb.Table(this, "ProductsDbd", {
            tableName: "products",
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            partitionKey: {
                name: "id",
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PROVISIONED,
            readCapacity: 1,
            writeCapacity: 1,
        })

        //Chamando os Layers que usaremos

        //  Product Layer
        const productsLayerArn = ssm.StringParameter.valueForStringParameter(this, "ProductsLayerVersionArn")
        // Recriando o layer a partir de um ARN (Igual ao criado em ProductsAppLayerStack, mas agora estamos importando)
        const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductsLayerVersionArn", productsLayerArn)

        const productEventsLayerArn = ssm.StringParameter.valueForStringParameter(this, "ProductEventsLayerVersionArn")
        // Recriando o layer a partir de um ARN (Igual ao criado em ProductsAppLayerStack, mas agora estamos importando)
        const productEventsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductEventsLayerVersionArn", productEventsLayerArn)


        const productsEventsDlq = new sqs.Queue(this, "ProductEventsDlq", {
            queueName: "product-events-dlq",
            enforceSSL: false,
            encryption: sqs.QueueEncryption.UNENCRYPTED,
            retentionPeriod: cdk.Duration.days(10), // Quanto tempo a mensagem pode ficar na fila 10 dias (padrão é 4)
        })


        // Nenhuma outra stack fara referencia a essa tabela, logo não precisa ser um atributo de classe
        const productsEventsHandler = new lambdaNodeJS.NodejsFunction(this, "ProductsEventsFunction", {
            runtime: lambda.Runtime.NODEJS_18_X,
            functionName: "ProductsEventsFunction",
            entry: "lambda/products/productEventsFunction.ts",
            handler: "handler",
            memorySize: 128,
            timeout: cdk.Duration.seconds(2),
            bundling: {
                minify: false,
                sourceMap: true,
            },
            environment: {
                EVENTS_DDB: props.eventsDdb.tableName,
            },
            layers: [productEventsLayer],
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
            deadLetterQueueEnabled: true,
            deadLetterQueue: productsEventsDlq
        })
        // Permitir gravar os eventos de produtos
        // props.eventsDdb.grantWriteData(productsEventsHandler)

        const eventsDdbPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW, // Queremos permitir ou negar o acesso?
            actions: ["dynamodb:PutItem"], // Qual(is) é(são) a(s) ação(ões) que queremos permitir ou negar? (pode ser uma lista de açoes)
            resources: [props.eventsDdb.tableArn], // Qual(is) é(são) o(s) recurso(s) [tabelas, stacks, etc..] que queremos permitir ou negar o acesso? (pode ser uma lista de recursos)
            conditions: {
                ['ForAllValues:StringLike']: {
                    'dynamodb:LeadingKeys': ['#product_*']
                } 
            } 
        })

        /**
         * Adicionando a politica de acesso a função de eventos para que ela possa escrever na tabela de eventos
         * 
         */
        productsEventsHandler.addToRolePolicy(eventsDdbPolicy)


        // cria a função lambda (tem os mesmos parametros padrões de um construtor de stack) (scope, id e propiedades)
        // this referencia a stack onde a função está inserida 
        // id --> identificação do recurso na stack [functionName é realmente o nome da função, aparece no console AWS]
        /* entry: ponto de entrada da função lambda --> arquivo que contem o metodo que será chamado quando a função for invocada
            handler: nome do metodo que será chamado quando a função for invocada (dentro do arquivo de entrada)
            Quantidade de memoria em megaBytes que posso definir para a função lambda usar para executar (default 128MB)
            timeout: tempo maximo que a funç��o lambda pode executar (default 3 segundos) [geralmente as funcs lambdas são executadas em tempos curtos]
            bundling: propriedades de bundling (empacotamento) do código da função lambda [pra subir uma func precisa de gerar um arquivo zip, o bundling faz isso automaticamente, e mandar pro AWS]
                minify: converter o codigo para deixa-lo o mais enxuto (pequeno possivel)
                sourceMap: mapeamento do codigo fonte (para debugar o codigo) [o sourceMap desligado pode deixar a func ainda menor

            função precisa conhecer o nome da tabela sendo acessada
            aws-sdk é uma biblioteca que permite acessar recursos da AWS (como a tabela de produtos) pra isso precisamos passar
            evorimronment variables (variaveis de ambiente) para a função lambda
                Nome Variavel de ambinete: nome da tabela (pegando direto do componente)
            layers: lugar onde a função pode buscar trechos de codigo
            tracing: habilita o tracing (rastreamento) da função lambda (para saber o que acontece dentro da função) [pequeno impacto de custo]
            insightsVersion: versão do lambda insights (para monitorar a função lambda) [pequeno impacto de custo] [clound watch console lambda insights]
         */
        this.productsFetchHandler = new lambdaNodeJS.NodejsFunction(this, "ProductsFetchFunction", {
            runtime: lambda.Runtime.NODEJS_18_X,
            functionName: "ProductsFetchFunction",
            entry: "lambda/products/productsFetchFunction.ts",
            handler: "handler",
            memorySize: 128,
            timeout: cdk.Duration.seconds(5),
            bundling: {
                minify: false,
                sourceMap: true,
            },
            environment: {
                PRODUCTS_DDB: this.productsDbd.tableName,
            },
            layers: [productsLayer],
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
        })

        // Permissão para a função lambda ler dados da tabela de produtos
        this.productsDbd.grantReadData(this.productsFetchHandler)

        /*
            Função para fazer a manipulação de produtos (criar, deletar e editar produtos)

                Duas funções utilizando trechos de codigos compartilhados pelo layer


            Dizer que dentro dessa fução invocaremos a função de eventos de produtos (atraves do sdk) --> passando como variaveis de ambiente (para garantir que sempre estará atualizado)
        */
        this.productsAdminHandler = new lambdaNodeJS.NodejsFunction(this, "ProductsAdminFunction", {
            runtime: lambda.Runtime.NODEJS_18_X,
            functionName: "ProductsAdminFunction",
            entry: "lambda/products/productsAdminFunction.ts",
            handler: "handler",
            memorySize: 128,
            timeout: cdk.Duration.seconds(5),
            bundling: {
                minify: false,
                sourceMap: true,
            },
            environment: {
                PRODUCTS_DDB: this.productsDbd.tableName,
                PRODUCTS_EVENTS_FUNCTION_NAME: productsEventsHandler.functionName,
            },
            layers: [productsLayer, productEventsLayer],
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
        })

        // Escrever informações na tabela
        this.productsDbd.grantWriteData(this.productsAdminHandler)

        // Função de eventos de produtos de está permitindo que a função de administração de produtos invoque ela
        productsEventsHandler.grantInvoke(this.productsAdminHandler)

    }
}