// controllers/innovaphoneController.js
import { broadcast, send } from '../managers/webSocketManager.js';
import { getDateNow } from '../utils/getDateNow.js';
import db from '../managers/databaseSequelize.js';
import { QueryTypes, Op } from 'sequelize';
import { stringToBase64 } from '../utils/typeHelpers.js';
import { log } from '../utils/log.js';
import {sendHttpPostRequest, sendHttpGetRequest } from '../managers/httpClient.js'


let presences = [];


export const innovaphoneMakeCall = async (btn, user) => {
    try {
        let urlPbxTableUsers = await db.config.findOne({
            where:{ 
                entry: 'urlPbxTableUsers'
            }
        });
        let customHeaders = await db.config.findOne({
            where:{ 
                entry: 'customHeaders'
            }
        });
        log('innovaphoneController:MakeCall: urlPbxTableUsers '+JSON.stringify(urlPbxTableUsers.value))
        if(btn.button_type == 'user'){
            const usersInn = await pbxTableUsers()
            const userInn = usersInn.filter(u => u.guid == btn.button_prt )[0]
            btn.button_prt = userInn.e164
        }

        const res = await sendHttpPostRequest(urlPbxTableUsers.value+"/rcc", { 
            num: btn.button_prt, 
            mode: 'MakeCall', 
            guid: user.sip, 
            device: btn.button_device,
            btn_id: btn.id}, customHeaders.value)
        log("innoaphoneController:MakeCall: will return: " +JSON.stringify(res.statusText));
        return res.statusText;
    }
    catch(e){
        log("innoaphoneController:MakeCall: will return error: " +e);
        return e;
    }
}

export const innovaphoneClearCall = async (btn, user) => {
    try {
        let urlPbxTableUsers = await db.config.findOne({
            where:{ 
                entry: 'urlPbxTableUsers'
            }
        });
        let customHeaders = await db.config.findOne({
            where:{ 
                entry: 'customHeaders'
            }
        });
        if(btn.button_type == 'user'){
            const usersInn = await pbxTableUsers()
            const userInn = usersInn.filter(u => u.guid == btn.button_prt )[0]
            btn.button_prt = userInn.e164
        }
        const res = await sendHttpPostRequest(urlPbxTableUsers.value+"/rcc", { num: btn.button_prt, 
            mode: 'ClearCall', 
            guid: user.sip, 
            device: btn.button_device,
            btn_id: btn.id}, customHeaders.value)
        log("innovaphoneController:ClearCall: will return "+JSON.stringify(res.statusText));
        return res.statusText;
    }
    catch(e){
        log("innovaphoneController:ClearCall: will return error " + e);
        return e;
    }
}
export const pbxApiPresenceSubscription = async () => {
    try {
        let config = await db.config.findOne({
            where:{ 
                entry: 'urlPbxTableUsers'
            }
        });
        let customHeaders = await db.config.findOne({
            where:{ 
                entry: 'customHeaders'
            }
        });
        log('innovaphoneController:pbxApiPresenceSubscription: config '+JSON.stringify(config))
        // Solicitação para obter dispositivos
        const pbxResponse = await sendHttpGetRequest(config.value+"/pbxApiPresences", customHeaders.value);
        if(pbxResponse.data && pbxResponse){
            log('innovaphoneController:pbxApiPresenceSubscription: result '+JSON.stringify(pbxResponse.data))
            const list_presences = pbxResponse.data;
            list_presences.forEach(p =>{
                presenceSubscription(p)
            })
        }
        
    }
    catch(e){
        log('innovaphoneController:pbxApiPresenceSubscription: error '+e)
    }
}

export const pbxTableUsers = async () => {
    try {
        let config = await db.config.findOne({
            where:{ 
                entry: 'urlPbxTableUsers'
            }
        });
        log('innovaphoneController:pbxTableUsers: config '+JSON.stringify(config))
        // Solicitação para obter dispositivos
        const pbxResponse = await sendHttpGetRequest(config.value+"/pbxTableUsers", '{}');
        if(pbxResponse.data && pbxResponse){
            log('innovaphoneController:pbxTableUsers: result '+JSON.stringify(pbxResponse.data))
            return pbxResponse.data;
        }
        
    }
    catch(e){
        return e;
    }
}

export const presenceSubscription = async (obj) => {
    try{
        const userInn = await db.user.findOne({
            where:{
                sip:obj.src
            }
        })
        
        updateOrAddPresence(obj)
            
        const status = mapPresenceStatus(obj)

        let notes = getNoteFromPresence(obj)
        let color = getActivityFromPresence(obj)
        notes = notes.length > 0 ? notes : color;

        notes = notes.length > 0 ? notes : 'online';
        color = color.length > 0 ? color : 'online';
        if(userInn){
            log('innovaphoneController:presenceSubscription: update = '+ status+ ' from '+userInn.name)
        }else{
            log('innovaphoneController:presenceSubscription: update = '+ status+ ' from '+obj.src)
        }
        broadcast({ api:"user", mt: status, guid: obj.src, note: notes, color: color })
    }catch(e){
        log('innovaphoneController:presenceSubscription: error = '+ e)
    }
}

export const requestPresences = async (guid) => {
    try{
        presences.forEach(async (p)=>{
            const status = mapPresenceStatus(p)

            let notes = getNoteFromPresence(p)
            // const userInn = await db.user.findOne({
            //     where:{
            //         sip:p.src
            //     }
            // })
            
            let color = getActivityFromPresence(p)
            notes = notes.length > 0 ? notes : color;

            notes = notes.length > 0 ? notes : 'online';
            color = color.length > 0 ? color : 'online';
            log('innovaphoneController:requestPresence: mapPresenceStatus = '+ status)
            send(guid, {api:"user", mt: status, guid: p.src, note: notes, color: color })
        })

    }catch(e){
        log('innovaphoneController:requestPresence: error = '+ e)
    }
}

export const callEvents = async (obj) =>{
    try{
        if(obj.mode == 'CallDisconnected'){
            const user = await db.user.findOne({
                where:{
                    sip:obj.guid
                }
            })

            if(user){
                const btn = await db.button.findOne({
                    where: {
                        id: obj.btn_id,
                    }
                })
                if(btn){
                    send(user.guid, {api: "user", mt: "CallDisconnected", btn_id: btn.id})
                    broadcast({ api: "user", mt: "NumberOnline", number: obj.num, note: "online", color: "online" })
                }

                const call = await db.call.findOne({
                    where: {
                      guid: user.guid,
                      number: btn.button_prt,
                      status: 1
                    },
                    order: [
                      ['id', 'DESC']
                    ]
                  });
                  
                if(call){
                    const callToUpdateResult = await db.call.update(
                        { call_ended: getDateNow(),
                            status: 3
                         }, // Valores a serem atualizados
                        { where: { id: parseInt(call.id) } } // Condição para atualização
                    );
                    log("innovaphoneController:callEvents::callToUpdateResult "+callToUpdateResult)
                }
            } 
        }

        if(obj.mode == 'CallRinging'){
            const user = await db.user.findOne({
                where:{
                    sip:obj.guid
                }
            })
            if(user){
                const btn = await db.button.findOne({
                    where: {
                        id: obj.btn_id,
                    }
                })
                if(btn){
                    send(user.guid, {api: "user", mt: "CallRinging", btn_id: btn.id})
                    broadcast({ api: "user", mt: "NumberBusy", number: obj.num, note: "ringing", color: "ringing" })
                }
                const call = await db.call.findOne({
                    where: {
                      guid: user.guid,
                      number: btn.button_prt,
                      status: 1
                    },
                    order: [
                      ['id', 'DESC']
                    ]
                  });
    
                if(call){
                    const callToUpdateResult = await db.call.update(
                        { call_ringing: getDateNow(),
                            status: 1
                         }, // Valores a serem atualizados
                        { where: { id: parseInt(call.id) } } // Condição para atualização
                    );
                    log("innovaphoneController:callEvents::callToUpdateResult "+callToUpdateResult)
                }
            }
        }

        if(obj.mode == 'CallConnected'){
            const user = await db.user.findOne({
                where:{
                    sip:obj.guid
                }
            })
            if(user){
                const btn = await db.button.findOne({
                    where: {
                        id: obj.btn_id,
                    }
                })
                if(btn){
                    send(user.guid, {api: "user", mt: "CallConnected", btn_id: btn.id})
                    broadcast({ api: "user", mt: "NumberBusy", number: obj.num, note: "busy", color: "busy" })
                }
                const call = await db.call.findOne({
                    where: {
                      guid: user.guid,
                      number: btn.button_prt,
                      status: 1
                    },
                    order: [
                      ['id', 'DESC']
                    ]
                  });
    
                if(call){
                    const callToUpdateResult = await db.call.update(
                        { call_connected: getDateNow(),
                            status: 1
                         }, // Valores a serem atualizados
                        { where: { id: parseInt(call.id) } } // Condição para atualização
                      );
                      log("innovaphoneController:callEvents::callToUpdateResult "+callToUpdateResult)
                }
            }
        }
        
    }catch(e){
        log('innovaphoneController:callEvents: error = '+ e)
    }
}

export const pbxStatus = async () => {
    try {
        let config = await db.config.findOne({
            where:{ 
                entry: 'urlPbxTableUsers'
            }
        });
        log('innovaphoneController:pbxStatus: config '+JSON.stringify(config))
        // Solicitação para obter dispositivos
        const pbxResponse = await sendHttpGetRequest(config.value+"/pbxStatus", '{}');
        if(pbxResponse.data && pbxResponse){
            log('innovaphoneController:pbxStatus: result '+JSON.stringify(pbxResponse.data))
            return pbxResponse.status;
        }
        
    }
    catch(e){
        return e;
    }
}

function updateOrAddPresence(obj) {
    const index = presences.findIndex(presence => presence.src === obj.src);

    if (index === -1) {
        // Caso o objeto não exista, adicionar à lista
        presences.push(obj);
    } else {
        // Caso o objeto já exista, atualizar o objeto existente
        presences[index] = obj;
    }
}


function mapPresenceStatus(data) {
    const telStatuses = data.presence
        .filter(p => p.contact === 'tel:')
        .map(p => p.status);

    const imStatuses = data.presence
        .filter(p => p.contact === 'im:')
        .map(p => p.status);
    
    if (telStatuses.every(status => status === 'on-the-phone')) { //Se Todos = true
        return 'UserBusy';
    }
    if (imStatuses.every(status => status === 'closed')) { //Se Todos = true
        return 'UserOffline';
    } else if (imStatuses.some(status => status === 'open') || telStatuses.some(status => status != 'closed')) { //Se Pelo menos um = true
        return 'UserOnline';
    }
    
    
    return 'Unknown'; // Caso nenhum dos casos seja atendido
}

function getNoteFromPresence(data) {
    // Filtra os objetos que possuem o campo 'note'
    const notes = data.presence
        .filter(p => p.contact === 'tel:' && p.note)
        .map(p => p.note);

    // Retorna o primeiro valor de 'note' encontrado, ou 'Note não encontrado' caso não exista
    return notes.length > 0 ? notes[0] : '';
}
function getActivityFromPresence(data) {
    // Filtra os objetos que possuem o campo 'note'
    const activities = data.presence
        .filter(p => p.contact === 'tel:' && p.activity)
        .map(p => p.activity);

    // Retorna o primeiro valor de 'note' encontrado, ou 'Note não encontrado' caso não exista
    return activities.length > 0 ? activities[0] : '';
}
