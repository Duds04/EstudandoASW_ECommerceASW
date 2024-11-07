import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';



// Agrupa as classes que definem as nossas stacks



// Cada classe que extende cdk.Stack representa uma stack no CloudFormation
export class ECommerceAswStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Pode definir os nosso recursos

    // example resource
    // const queue = new sqs.Queue(this, 'ECommerceAswQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
