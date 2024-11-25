import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as lambda from "aws-cdk-lib/aws-lambda"
// Recurso para guardar parametros (sem que as stacks precisem ter dependencias)
import * as ssm from "aws-cdk-lib/aws-ssm"

export class ProductsAppLayerStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        /*
            code: lambda.Code.fromAsset("layers/productsLayer") --> caminho para a pasta onde está o código do layer
            compatibleRuntimes: [lambda.Runtime.NODEJS_18_X] --> runtimes que são compativeis com o layer, coloquei apenas o node na versão que estou utilizando no exato momento
            layerVersionName: "ProductsLayer" --> nome do layer
            removalPolicy:  cdk.RemovalPolicy.RETAIN --> manter o layer mesmo se a stack for deletada, faz isso pois tem uso desse layer em outra stack (tem essa dependencia não explicita)
             isso nos diz também que caso uma nova versão do layer seja criada, a antiga NÃO será deletada
                [por padrão é cdk.RemovalPolicy.DESTROY --> politica de remoção do layer (destruir o layer quando a stack é deletada)
        */
        const productsLayers = new lambda.LayerVersion(this, "ProductsLayer", {
            code: lambda.Code.fromAsset("lambda/products/layers/productsLayer"),
            compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
            layerVersionName: "ProductsLayer",
            removalPolicy: cdk.RemovalPolicy.RETAIN
        })

        /*
            Guardar informação de como outras funções podem usar esse layer
            O parametro vai ser usado para poder apontar pro layer (param da versão)
            Arn --> Amazon Resource Name (identificador unico de um recurso na AWS)
            stringValue --> this.productsLayers.layerVersionArn --> valor que vai ser guardado no parametro (ARN do layer criado)
        */
        new ssm.StringParameter(this, "ProductsLayerVersionArn", {
            parameterName: "ProductsLayerVersionArn",
            stringValue: productsLayers.layerVersionArn,
        })


        const productEventsLayers = new lambda.LayerVersion(this, "ProductEventsLayer", {
            code: lambda.Code.fromAsset("lambda/products/layers/productEventsLayer"),
            compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
            layerVersionName: "ProductEventsLayer",
            removalPolicy: cdk.RemovalPolicy.RETAIN
        })

        new ssm.StringParameter(this, "ProductEventsLayerVersionArn", {
            parameterName: "ProductEventsLayerVersionArn",
            stringValue: productEventsLayers.layerVersionArn,
        })

    }
}