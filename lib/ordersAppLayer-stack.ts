import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as ssm from "aws-cdk-lib/aws-ssm"


export class OrdersAppLayerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        const ordersLayer = new lambda.LayerVersion(this, "OrdersLayer", {
            code: lambda.Code.fromAsset("lambda/orders/layers/ordersLayer"),
            compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
            layerVersionName: "OrdersLayer",
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        })

        // Guardando a versão do layer para ser consultada pela stack de produtos
        new ssm.StringParameter(this, "OrdersLayerVersionArn", {
            parameterName: "OrdersLayerVersionArn",
            stringValue: ordersLayer.layerVersionArn
        })

        const ordersApiLayer = new lambda.LayerVersion(this, "OrdersApiLayer", {
            code: lambda.Code.fromAsset("lambda/orders/layers/ordersApiLayer"),
            compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
            layerVersionName: "OrdersApiLayer",
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        })

        // Guardando a versão do layer para ser consultada pela stack de produtos
        new ssm.StringParameter(this, "OrdersApiLayerVersionArn", {
            parameterName: "OrdersApiLayerVersionArn",
            stringValue: ordersApiLayer.layerVersionArn
        })

       const orderEventsLayer = new lambda.LayerVersion(this, "orderEventsLayer", {
            code: lambda.Code.fromAsset("lambda/orders/layers/orderEventsLayer"),
            compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
            layerVersionName: "orderEventsLayer",
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        })

        // Guardando a versão do layer para ser consultada pela stack de produtos
        new ssm.StringParameter(this, "orderEventsLayerVersionArn", {
            parameterName: "orderEventsLayerVersionArn",
            stringValue: orderEventsLayer.layerVersionArn
        })

        const orderEventsRepositoryLayer = new lambda.LayerVersion(this, "orderEventsRepositoryLayer", {
            code: lambda.Code.fromAsset("lambda/orders/layers/orderEventsRepositoryLayer"),
            compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
            layerVersionName: "orderEventsRepositoryLayer",
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        })

        // Guardando a versão do layer para ser consultada pela stack de produtos
        new ssm.StringParameter(this, "orderEventsRepositoryLayerVersionArn", {
            parameterName: "orderEventsRepositoryLayerVersionArn",
            stringValue: orderEventsRepositoryLayer.layerVersionArn
        })
    } 
}