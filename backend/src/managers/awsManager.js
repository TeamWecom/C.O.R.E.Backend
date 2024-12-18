import  AWS  from 'aws-sdk';
import { log } from '../utils/log.js';
import process from 'process';

export const sendSms = (cgpn, msg) =>{
    return new Promise((resolve, reject) => {
        try{
            if(cgpn && cgpn.length >10){//cgpn == '051999958798' || cgpn == '051995418797'
                log('awsManager:sendSms: Número cgpn para ser notificado '+ cgpn.replace(/^\d/, '+55'))
                //Vai enviar SMS
                // Set region
                // Configurar o AWS SDK com as suas credenciais e região
                AWS.config.update({
                accessKeyId: process.env.AWS_ACCESSKEY_ID,
                secretAccessKey: process.env.AWS_ACCESSKEY_SECRET,
                region: process.env.AWS_REGION
                });
        
                // Create publish parameters
                const params = {
                Message: msg,
                PhoneNumber: cgpn.replace(/^\d/, '+55'),
                };
        
                // Create promise and SNS service object
                const publishTextPromise = new AWS.SNS({ apiVersion: "2010-03-31" })
                .publish(params)
                .promise();
        
                // Handle promise's fulfilled/rejected states
                publishTextPromise
                .then(function (data) {
                    log("awsManager:sendSms: MessageID is " + data.MessageId);
                    resolve(`Mensagem enviada ID ${data.MessageId}`);
                })
                .catch(function (err) {
                    log(`awsManager:sendSms: SNS Erro ${err}`);
                    reject(`awsManager:sendSms: SNS Erro ${err}`);
                });
            }else{
                reject(`awsManager:sendSms: Número inválido`)
            }
        }catch(e){
            log(`awsManager:sendSms: Erro ${e}`)
            reject(`awsManager:sendSms: Erro ${e}`);
        }    
    });
}