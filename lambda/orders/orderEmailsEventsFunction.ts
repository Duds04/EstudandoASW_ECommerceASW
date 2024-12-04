import { Context, SNSMessage, SQSEvent } from 'aws-lambda';
import * as AWSXRay from "aws-xray-sdk"
import { Envelope, OrderEvent } from "/opt/nodejs/orderEventsLayer"
import { AWSError, SES } from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';

AWSXRay.captureAWS(require('aws-sdk'));

/**
 * Função para enviar o Emails
*/

const sesClient = new SES() // Criano um cliente para acessar o SES (enviar emails)
export async function handler(event: SQSEvent, context: Context): Promise<void> {
    const promisse: Promise<PromiseResult<SES.SendEmailResponse, AWSError>>[] = []

    event.Records.forEach(record => {
        console.log(record);
        const body = JSON.parse(record.body) as SNSMessage // Pega a mensagem do topico do SNS
        promisse.push(sendOrderEmail(body))
    })

    // Aguardando que todas as operações de envio de emails sejam concluidos antes de finalizar a função lambda
    await Promise.all(promisse)

    return
}


function sendOrderEmail(body: SNSMessage) {
    const envelope = JSON.parse(body.Message) as Envelope
    const event = JSON.parse(envelope.data) as OrderEvent // Dados do evento

    return sesClient.sendEmail({
        Destination: {
            ToAddresses: [event.email] // Email do cliente (destinatario), quem criou o pedido de compra
        },
        Message: {
            Body: {
                Text: { // Corpo do email
                    Charset: "UTF-8", // Tipo de formato usado para enviar a mensagem
                    Data: `Recebemos seu pedido de número ${event.orderId}, no valor de R$ ${event.billing.totalPrice}` // Mensagem do email
                }
            },
            Subject: { // Assunto do email
                Charset: "UTF-8",
                Data: "Recebemos seu pedido!"
            }
        },
        Source: "mpbduda@outlook.com", // Email de quem está enviando o email
        ReplyToAddresses: ["mpbduda@outlook.com"] // Email para responder o email
    }).promise()
}