// controllers/mqttController.js
import {log} from '../utils/log.js';
import {receiveImage} from './milesightController.js'

export const handlePublish = async (packet, client) => {
    if (client) {
        const body = packet.payload.toString()
        const obj = JSON.parse(body);
        log(`mqttController:handlePublish: Mensagem recebida do cliente ${client.id}: ${obj.values.devName}`);
        
        const result = await receiveImage(obj);
        log(`mqttController:handlePublish: Fim do tratamento da mensagem recebida do cliente ${obj.values.devName}`);
    } else {
        log(`mqttController:handlePublish: Mensagem publicada no broker: ${packet.payload.toString()}`);
    }
};

export const handleClientConnect = (client) => {
    log(`mqttController:handleClientConnect Cliente conectado: ${client.id}`);
};

export const handleClientDisconnect = (client) => {
    log(`mqttController:handleClientDisconnect: Cliente desconectado: ${client.id}`);
};

export const handleSubscribe = (subscriptions, client) => {
    log(`mqttController:handleSubscribe: Cliente ${client.id} se inscreveu no tópico: ${subscriptions.map(s => s.topic).join(', ')}`);
};

export const handleUnsubscribe = (subscriptions, client) => {
    log(`mqttController:handleUnsubscribe:Cliente ${client.id} cancelou a assinatura dos tópicos: ${subscriptions.join(', ')}`);
};