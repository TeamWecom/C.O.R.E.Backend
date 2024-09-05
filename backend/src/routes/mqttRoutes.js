// routes/mqttRoutes.js

import {
    handlePublish,
    handleClientConnect,
    handleClientDisconnect,
    handleSubscribe,
    handleUnsubscribe
} from '../controllers/mqttController.js';

const mqttRoutes = (broker) => {
    // Evento disparado quando um cliente se conecta
    broker.on('client', handleClientConnect);

    // Evento disparado quando um cliente se desconecta
    broker.on('clientDisconnect', handleClientDisconnect);

    // Evento disparado quando uma mensagem é recebida
    broker.on('publish', handlePublish);

    // Evento disparado quando uma assinatura de tópico é feita
    broker.on('subscribe', handleSubscribe);

    // Evento disparado quando uma assinatura de tópico é cancelada
    broker.on('unsubscribe', handleUnsubscribe);
};

export default mqttRoutes;
