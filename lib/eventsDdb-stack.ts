import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"



export class EventsDdbStack extends cdk.Stack {
    readonly table: dynamodb.Table

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        /**
         * Sort Key: define que é uma chave primaria composta
         * TimeToLiveAttribute: ttl --> o ttl é um valor atribuido que define o tempo de vida do item na tabela
         * 
         * PAY_PER_REQUEST --> Paga por requisição
         * 
         */
        this.table = new dynamodb.Table(this, "EventsDdb", {
            tableName: "events",
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            partitionKey: {
                name: "pk",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "sk",
                type: dynamodb.AttributeType.STRING,
            },
            timeToLiveAttribute: "ttl",
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            //readCapacity: 1,
            //writeCapacity: 1, // Não tem mais limite pois não está utilizando o modo provisionado
        })

/* 
        /**
         * 
         * No projeto isso está sendo usado para fazer um testo de carga 
         *  de alto consumo de recursos (leitura e escrita)
         * 
         *  * 

        /**
        * 
        * Criando scale de leitura e escrita automatica
        *   Tentando tratar/reduzir requisições estranguladas ou em timeout por não estarem no limite de capacidade
        * 
        *  *
        const readScale = this.table.autoScaleReadCapacity({
            // Definindo a capacidade maxima e minima (ocila entre uma unidade e duas)
            maxCapacity: 2,
            minCapacity: 1,
        })

        /** 
         * Auto scalling baseado em utilização de recurso
         * 
         * targetUtilizationPercent -- > Se a capacidade de leitura ultrapassar 50% a capacidade de leitura em uma unidade 
         * scaleInCooldown --> tempo de espera para reduzir a capacidade de leitura para o original
         * scaleOutCooldown --> tempo de espera para aumentar a capacidade de leitura para o original (se eu já subi uma vez quanto tempo vou esperar para subir de novo)
         *
        readScale.scaleOnUtilization({
            targetUtilizationPercent: 50,
            scaleInCooldown: cdk.Duration.seconds(60),
            scaleOutCooldown: cdk.Duration.seconds(60),
        })

        const writeScale = this.table.autoScaleWriteCapacity({
            maxCapacity: 4,
            minCapacity: 1,
        })

        writeScale.scaleOnUtilization({
            targetUtilizationPercent: 30, // Reação + sensivel (30% de utilização)
            scaleInCooldown: cdk.Duration.seconds(60),
            scaleOutCooldown: cdk.Duration.seconds(60),
        })
 */
    }
}