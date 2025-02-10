import { log } from '../utils/log.js';
import { getDateNow } from '../utils/getDateNow.js';
import db from '../managers/databaseSequelize.js';
import { renewToken, validateToken } from '../utils/validadeToken.js';

let connectionsUser = []; // Mantém uma lista de clientes conectados
const renewTimers = new Map();

export const addConnection = async (conn) => {
    if(conn.guid){
        connectionsUser.push(conn);
        log("webSocketManager:addConnection connectionsUser: added conn "+conn.dn);
        
        const connCount = connectionsUser.filter(client => client.guid === conn.guid);
        if(connCount.length==1){
            //notifia a todos sobre o noo login
            broadcast({ mt: "CoreUserOnline", guid: conn.guid }); //Substituído pelo innovaphoneController
            // Insert into DB the event of new login
            const today = getDateNow();
            const msg = { guid: conn.guid, name: conn.dn, date: today, status: "Login", details: "APP" };
            const insertResult = await db.availability.create(msg);
        }
        conn.send(JSON.stringify({ mt: "UserSessionResult", guid: conn.guid }));
        
        //Ronava o token
        startTokenAutoRenew(conn.guid, conn.token);

    }
};

// Inicia a renovação automática para uma conexão específica
export function startTokenAutoRenew(connectionId, token) {
    if (renewTimers.has(connectionId)) {
        log(`webSocketManager:startTokenAutoRenew: ⚠️ Já existe um timer ativo para a conexão ${connectionId}.`);
        stopTokenAutoRenew(connectionId)
        //return;
    }

    log(`webSocketManager:startTokenAutoRenew: 🔄 Iniciando renovação automática para conexão ${connectionId}`);
    scheduleTokenRenewal(connectionId, token);
}


export const removeConnection = async (conn) => {
    connectionsUser = connectionsUser.filter(client => client !== conn);
    if(conn.guid){
        log("webSocketManager:removeConnection connectionsUser: removed conn "+conn.dn);
        const connCount = connectionsUser.filter(client => client.guid === conn.guid);
        if(connCount.length==0 && conn.guid){
            //notifia a todos sobre o noo login
            broadcast({ mt: "CoreUserOffline", guid: conn.guid });
            stopTokenAutoRenew(conn.guid);
        }
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

// Agendar a renovação do token para uma conexão específica
function scheduleTokenRenewal(connectionId, token) {
    validateToken(token)
        .then(decoded => {
            const expiresIn = decoded.exp - Math.floor(Date.now() / 1000); // Tempo restante em segundos
            const renewTime = expiresIn - 60; // Renova 1 minuto antes do vencimento

            log(`webSocketManager:scheduleTokenRenewal: ⏳ Token da conexão ${connectionId} expira em ${expiresIn}s. Renovação agendada para ${renewTime}s antes.`);

            if (renewTime > 0) {
                // Cria um novo timer para essa conexão
                const timer = setTimeout(async () => {
                    try {
                        const newToken = await renewToken(token);
                        log(`webSocketManager:scheduleTokenRenewal: 🔄 Token da conexão ${connectionId} renovado:`, newToken);

                        // Atualiza o timer com o novo token
                        scheduleTokenRenewal(connectionId, newToken);
                    } catch (error) {
                        log(`webSocketManager:scheduleTokenRenewal: ❌ Erro ao renovar token da conexão ${connectionId}:`, error);
                    }
                }, renewTime * 1000);

                // Armazena o timer na lista de timers
                renewTimers.set(connectionId, timer);
            }
        })
        .catch(error => {
            log(`webSocketManager:scheduleTokenRenewal: ❌ Token inválido para a conexão ${connectionId}:`, error);
        });
}

// Remove a renovação automática para uma conexão específica
export function stopTokenAutoRenew(connectionId) {
    if (renewTimers.has(connectionId)) {
        clearTimeout(renewTimers.get(connectionId)); // Cancela o timer
        renewTimers.delete(connectionId); // Remove do Map
        log(`webSocketManager:stopTokenAutoRenew: 🛑 Renovação automática de token cancelada para conexão ${connectionId}`);
    } else {
        log(`webSocketManager:stopTokenAutoRenew: ⚠️ Nenhum timer encontrado para a conexão ${connectionId}`);
    }
}

// Para remover todos os timers ativos (ex: durante um shutdown)
export function stopAllTokenRenewals() {
    renewTimers.forEach((timer, connectionId) => {
        clearTimeout(timer);
        log(`webSocketManager:stopAllTokenRenewals: 🛑 Renovação de token cancelada para conexão ${connectionId}`);
    });
    renewTimers.clear();
}



export const getConnections = () => connectionsUser;


