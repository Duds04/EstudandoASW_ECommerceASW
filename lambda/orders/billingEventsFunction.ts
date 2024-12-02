import { SNSEvent, Context } from "aws-lambda";

// Só para gerar uma informação de log (e testar a chamada sns com filtro)
export async function handler(event: SNSEvent, context: Context): Promise<void> {
    // Para cada registro gera um log só pra ver que gerou um evento
    event.Records.forEach(record => {
        console.log('Event: ', JSON.stringify(record, null, 2));
    });

    return
}