import { log } from '../utils/log.js';
import { getDateNow } from '../utils/getDateNow.js';
import db from '../managers/databaseSequelize.js';

let connectionsUser = []; // Mantém uma lista de clientes conectados

export const addConnection = async (conn) => {
    connectionsUser.push(conn);
    log("webSocketManager:addConnection connectionsUser: added conn "+conn.dn);
    
    const connCount = connectionsUser.filter(client => client.guid === conn.guid);
    if(connCount.length==1){
        //notifia a todos sobre o noo login
        broadcast({ mt: "CoreUserOnline", guid: conn.guid }); //Substituído pelo innovaphoneController
        // Insert into DB the event of new login
        const today = getDateNow();
        const msg = { guid: conn.guid, name: conn.dn, date: today, status: "Login", details: "APP" };
        await db.availability.create(msg);
    }
    conn.send(JSON.stringify({ mt: "UserSessionResult", guid: conn.guid }));
    
};

export const removeConnection = async (conn) => {
    connectionsUser = connectionsUser.filter(client => client !== conn);
    log("webSocketManager:removeConnection connectionsUser: removed conn "+conn.dn);
    const connCount = connectionsUser.filter(client => client.guid === conn.guid);
    if(connCount.length==0 && conn.guid){
        //notifia a todos sobre o noo login
        broadcast({ mt: "CoreUserOffline", guid: conn.guid });
    }

    // Insert into DB the event
    const today = getDateNow();
    if(conn.guid){
        const msg = { guid: conn.guid, name: conn.dn, date: today, status: "Logout", details: "APP" };
        await db.availability.create(msg);
    }
};

export const send = async (guid, message) => {
    let result = false;
    try {
        connectionsUser.forEach( async client =>  {
            if (client.guid === guid) {
                client.send(JSON.stringify(message));
                log(`################################# Mensagem enviada: Client Guid: ${client.guid} CN: ${client.dn} notified about message: ${JSON.stringify(message.mt)}`);
                result = true;
            }
        });
    } catch (e) {
        log(`Error sending message: ${e}`);
    }
    return result;
};
export const broadcast = (message) => {
    let result = 0;
    try {
        connectionsUser.forEach(client => {
                client.send(JSON.stringify(message));
                log(`################################# Mensagem enviada: Client Guid: ${client.guid} CN: ${client.dn} notified about message: ${JSON.stringify(message.mt)}`);
                result++;
        });
    } catch (e) {
        log(`Error sending message: ${e}`);
    }
    return result;
};


export const getConnections = () => connectionsUser;


