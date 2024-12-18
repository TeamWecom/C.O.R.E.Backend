import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { log } from "../utils/log.js";
import process from "process";

// Configuração do cliente SNS
const snsClient = new SNSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESSKEY_ID,
    secretAccessKey: process.env.AWS_ACCESSKEY_SECRET,
  },
});

export const sendSms = (cgpn, msg) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (cgpn && cgpn.length > 10) {
        log("awsManager:sendSms: Número cgpn para ser notificado " + cgpn.replace(/^\d/, "+55"));

        // Parâmetros do comando SNS
        const params = {
          Message: msg,
          PhoneNumber: cgpn.replace(/^\d/, "+55"), // Ajustando o número para +55 formato internacional
        };

        try {
          const command = new PublishCommand(params);
          const response = await snsClient.send(command);

          log("awsManager:sendSms: MessageID is " + response.MessageId);
          resolve({success:response.MessageId});
        } catch (err) {
          log(`awsManager:sendSms: SNS Erro ${err}`);
          reject({error: `awsManager:sendSms: SNS Erro ${err}`});
        }
      } else {
        reject({error:`awsManager:sendSms: Número inválido`});
      }
    } catch (e) {
      log(`awsManager:sendSms: Erro ${e}`);
      reject({error:`awsManager:sendSms: Erro ${e}`});
    }
  });
};
