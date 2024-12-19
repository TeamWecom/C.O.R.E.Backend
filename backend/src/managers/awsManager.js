import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { log } from "../utils/log.js";
import process from "process";
import db from './databaseSequelize.js';

// Configurações
let AWS_ACCESSKEY_ID;
let AWS_ACCESSKEY_SECRET;
let AWS_REGION;

// Inicializar o cliente SNS
let snsClient = null;

export const initAwsSNS = async () => {
  try {
    // Obter valores de configuração necessários para a tarefa
    const entries = ['awsSnsKey', 'awsSnsSecret', 'awsSnsRegion'];

    // Faz uma consulta ao banco de dados para pegar todas as entradas correspondentes
    const configs = await db.config.findAll({
      where: {
        entry: entries,
      },
    });

    // Transforma o resultado em um objeto chave-valor
    const configObj = {};
    configs.forEach((config) => {
      configObj[config.entry] = config.value;
    });

    AWS_ACCESSKEY_ID = configObj.awsSnsKey;
    AWS_ACCESSKEY_SECRET = configObj.awsSnsSecret;
    AWS_REGION = configObj.awsSnsRegion;

    // Validação das configurações
    if (!AWS_ACCESSKEY_ID || !AWS_ACCESSKEY_SECRET || !AWS_REGION) {
      log(`awsManager:initAwsSNS: Configurações ausentes`);
      snsClient = null; // Limpa o cliente SNS caso as configurações sejam inválidas
      return;
    }

    // Verifica se o cliente SNS já existe, caso sim, limpa para recriar
    if (snsClient) {
      log("awsManager:initAwsSNS: Limpando instância anterior do SNS Client");
      snsClient = null;
    }

    // Cria uma nova instância do SNSClient
    snsClient = new SNSClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESSKEY_ID,
        secretAccessKey: AWS_ACCESSKEY_SECRET,
      },
    });

    log(`awsManager:initAwsSNS: SNS Client inicializado com sucesso`);
  } catch (e) {
    log(`awsManager:initAwsSNS: Erro ${e}`);
    snsClient = null; // Garante que o cliente é limpo em caso de erro
  }
};

export const sendSms = (cgpn, msg) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!snsClient) {
        log("awsManager:sendSms: SNS Client não está inicializado");
        return reject({ error: "awsManager:sendSms: SNS Client não está inicializado" });
      }

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
          resolve({ success: response.MessageId });
        } catch (err) {
          log(`awsManager:sendSms: SNS Erro ${err}`);
          reject({ error: `awsManager:sendSms: SNS Erro ${err}` });
        }
      } else {
        reject({ error: `awsManager:sendSms: Número inválido` });
      }
    } catch (e) {
      log(`awsManager:sendSms: Erro ${e}`);
      reject({ error: `awsManager:sendSms: Erro ${e}` });
    }
  });
};
