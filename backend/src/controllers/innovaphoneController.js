// controllers/innovaphoneController.js
import { broadcast, send } from '../managers/webSocketManager.js';
import { getDateNow } from '../utils/getDateNow.js';
import db from '../managers/databaseSequelize.js';
import { QueryTypes, Op } from 'sequelize';
import { stringToBase64 } from '../utils/typeHelpers.js';
import { log } from '../utils/log.js';
import {sendHttpPostRequest, sendHttpGetRequest } from '../managers/httpClient.js'
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Define o diretório onde os arquivos estáticos serão servidos
const staticDir = path.join(__dirname, '../httpfiles/');

let presences = [];
let pbxUsers = [];

export const innovaphonePassiveRCCMonitor = async (user) => {
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
        log('innovaphoneController:innovaphonePassiveRCCMonitor: urlPbxTableUsers '+JSON.stringify(urlPbxTableUsers.value))
    

        const res = await sendHttpPostRequest(urlPbxTableUsers.value+"/rcc", { 
            mode: 'PassiveRCCMonitor', 
            guid: user.sip
        }, customHeaders.value)
        log("innoaphoneController:innovaphonePassiveRCCMonitor: will return: " +JSON.stringify(res.statusText));
        return res.statusText;
    }
    catch(e){
        log("innoaphoneController:innovaphonePassiveRCCMonitor: will return error: " +e);
        return e;
    }
}
export const innovaphonePassiveRCCMonitorEnd = async (user) => {
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
        log('innovaphoneController:innovaphonePassiveRCCMonitorEnd: urlPbxTableUsers '+JSON.stringify(urlPbxTableUsers.value))
    

        const res = await sendHttpPostRequest(urlPbxTableUsers.value+"/rcc", { 
            mode: 'PassiveRCCMonitorEnd', 
            guid: user.sip
        }, customHeaders.value)
        log("innoaphoneController:innovaphonePassiveRCCMonitorEnd: will return: " +JSON.stringify(res.statusText));
        return res.statusText;
    }
    catch(e){
        log("innoaphoneController:innovaphonePassiveRCCMonitorEnd: will return error: " +e);
        return e;
    }
}
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
        log('innovaphoneController:innovaphoneMakeCall: urlPbxTableUsers '+JSON.stringify(urlPbxTableUsers.value))
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
        log("innoaphoneController:innovaphoneMakeCall: will return: " +JSON.stringify(res.statusText));
        return res.statusText;
    }
    catch(e){
        log("innoaphoneController:innovaphoneMakeCall: will return error: " +e);
        return e;
    }
}
export const innovaphoneConnectCall = async (user, device, call) => {
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
        //const usersInn = await pbxTableUsers()
        //const userInn = usersInn.filter(u => u.guid == user.sip )[0]
        //const deviceInn = userInn.devices.filter(d => d.text == device)[0];
        const res = await sendHttpPostRequest(urlPbxTableUsers.value+"/rcc", {
            mode: 'ConnectCall', 
            guid: user.sip, 
            device: device,
            call: call}, customHeaders.value)
        log("innovaphoneController:innovaphoneConnectCall: will return "+JSON.stringify(res.statusText));
        return res.statusText;
    }
    catch(e){
        log("innovaphoneController:innovaphoneConnectCall: will return error " + e);
        return e;
    }
}
export const innovaphoneHeldCall = async (btn, user) => {
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
            mode: 'HeldCall', 
            guid: user.sip, 
            device: btn.button_device,
            btn_id: btn.id}, customHeaders.value)
        log("innovaphoneController:innovaphoneHeldCall: will return "+JSON.stringify(res.statusText));
        return res.statusText;
    }
    catch(e){
        log("innovaphoneController:innovaphoneHeldCall: will return error " + e);
        return e;
    }
}
export const innovaphoneHeldIncomingCall = async (user, device, num, call) => {
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
        //const usersInn = await pbxTableUsers()
        //const userInn = usersInn.filter(u => u.guid == user.sip )[0]
        //const deviceInn = userInn.devices.filter(d => d.text == device)[0];
        const res = await sendHttpPostRequest(urlPbxTableUsers.value+"/rcc", { num: num, 
            mode: 'HeldIncomingCall', 
            guid: user.sip, 
            device: device,
            call: call,
            btn_id: ''}, customHeaders.value)
        log("innovaphoneController:innovaphoneHeldIncomingCall: will return "+JSON.stringify(res.statusText));
        return res.statusText;
    }
    catch(e){
        log("innovaphoneController:innovaphoneHeldIncomingCall: will return error " + e);
        return e;
    }
}
export const innovaphoneRedirectCall = async (btn, user, destination) => {
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
            mode: 'RedirectCall', 
            guid: user.sip, 
            device: btn.button_device,
            btn_id: btn.id,
            destination: destination}, customHeaders.value)
        log("innovaphoneController:innovaphoneRedirectCall: will return "+JSON.stringify(res.statusText));
        return res.statusText;
    }
    catch(e){
        log("innovaphoneController:innovaphoneRedirectCall: will return error " + e);
        return e;
    }
}
export const innovaphoneRedirectIncomingCall = async (user, device, call, destination) => {
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
        //const usersInn = await pbxTableUsers()
        //const userInn = usersInn.filter(u => u.guid == user.sip )[0]
        //const deviceInn = userInn.devices.filter(d => d.text == device)[0];

        const res = await sendHttpPostRequest(urlPbxTableUsers.value+"/rcc", { 
            mode: 'RedirectIncomingCall', 
            guid: user.sip, 
            device: device,
            btn_id: '',
            call: call,
            destination: destination}, customHeaders.value)
        log("innovaphoneController:innovaphoneRedirectIncomingCall: will return "+JSON.stringify(res.statusText));
        return res.statusText;
    }
    catch(e){
        log("innovaphoneController:innovaphoneRedirectIncomingCall: will return error " + e);
        return e;
    }
}
export const innovaphoneDtmfCall = async (btn, user, digit) => {
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
            mode: 'SendDtmfDigits', 
            guid: user.sip, 
            device: btn.button_device,
            btn_id: btn.id,
            digit: digit}, customHeaders.value)
        log("innovaphoneController:innovaphoneDtmfCall: will return "+JSON.stringify(res.statusText));
        return res.statusText;
    }
    catch(e){
        log("innovaphoneController:innovaphoneDtmfCall: will return error " + e);
        return e;
    }
}
export const innovaphoneDtmfIncomingCall = async (user, device, call, digit) => {
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
        //const usersInn = await pbxTableUsers()
        //const userInn = usersInn.filter(u => u.guid == user.sip )[0]
        //const deviceInn = userInn.devices.filter(d => d.text == device)[0];

        const res = await sendHttpPostRequest(urlPbxTableUsers.value+"/rcc", { 
            mode: 'SendDtmfDigitsIncomingCall', 
            guid: user.sip, 
            device: device,
            btn_id: '',
            call: call,
            digit: digit}, customHeaders.value)
        log("innovaphoneController:innovaphoneDtmfIncomingCall: will return "+JSON.stringify(res.statusText));
        return res.statusText;
    }
    catch(e){
        log("innovaphoneController:innovaphoneDtmfIncomingCall: will return error " + e);
        return e;
    }
}
export const innovaphoneRetrieveCall = async (btn, user) => {
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
            mode: 'RetrieveCall', 
            guid: user.sip, 
            device: btn.button_device,
            btn_id: btn.id}, customHeaders.value)
        log("innovaphoneController:innovaphoneRetrieveCall: will return "+JSON.stringify(res.statusText));
        return res.statusText;
    }
    catch(e){
        log("innovaphoneController:innovaphoneRetrieveCall: will return error " + e);
        return e;
    }
}
export const innovaphoneRetrieveIncomingCall = async (user, device, num, call) => {
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
        //const usersInn = await pbxTableUsers()
        //const userInn = usersInn.filter(u => u.guid == user.sip )[0]
        //const deviceInn = userInn.devices.filter(d => d.text == device)[0];
        const res = await sendHttpPostRequest(urlPbxTableUsers.value+"/rcc", { num: num, 
            mode: 'RetrieveIncomingCall', 
            guid: user.sip, 
            device: device,
            call: call,
            btn_id: ''}, customHeaders.value)
        log("innovaphoneController:innovaphoneRetrieveIncomingCall: will return "+JSON.stringify(res.statusText));
        return res.statusText;
    }
    catch(e){
        log("innovaphoneController:innovaphoneRetrieveIncomingCall: will return error " + e);
        return e;
    }
}
export const innovaphoneClearIncomingCall = async (user, device, num) => {
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
        //const usersInn = await pbxTableUsers()
        //const userInn = usersInn.filter(u => u.guid == user.sip )[0]
        //const deviceInn = userInn.devices.filter(d => d.text == device)[0];
        const res = await sendHttpPostRequest(urlPbxTableUsers.value+"/rcc", {num: num, 
            mode: 'ClearCall', 
            guid: user.sip, 
            device: device,
            btn_id:''}, customHeaders.value)
        log("innovaphoneController:innovaphoneClearIncomingCall: will return "+JSON.stringify(res.statusText));
        return res.statusText;
    }
    catch(e){
        log("innovaphoneController:innovaphoneClearIncomingCall: will return error " + e);
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
        log("innovaphoneController:innovaphoneClearCall: will return "+JSON.stringify(res.statusText));
        return res.statusText;
    }
    catch(e){
        log("innovaphoneController:innovaphoneClearCall: will return error " + e);
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
            log(`innovaphoneController:pbxApiPresenceSubscription: result ${pbxResponse.data.length} users`)
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
        if(pbxUsers.length==0){
            let config = await db.config.findOne({
                where:{ 
                    entry: 'urlPbxTableUsers'
                }
            });
            log('innovaphoneController:pbxTableUsers: config '+JSON.stringify(config))
            // Solicitação para obter dispositivos
            const pbxResponse = await sendHttpGetRequest(config.value+"/pbxTableUsers", '{}');
            if(pbxResponse.data && pbxResponse){
                log(`innovaphoneController:pbxTableUsers: result ${pbxResponse.data.length} users`)
                if (Array.isArray(pbxResponse.data)) {
                    pbxUsers = pbxResponse.data;
                    return pbxResponse.data;
                } else {
                    return [];
                }
            }
        }else{
            return pbxUsers
        }
    }
    catch(e){
        return e;
    }
}

export const propfind = () =>{
    const responseXml = `<?xml version="1.0" encoding="utf-8"?>
        <multistatus xmlns="DAV:">
            <response>
                <href>/api/innovaphone/recording/</href>
                <propstat>
                    <prop>
                        <resourcetype><collection/></resourcetype>
                        <getcontentlength>0</getcontentlength>
                        <creationdate>${new Date().toISOString()}</creationdate>
                        <getlastmodified>${new Date().toUTCString()}</getlastmodified>
                    </prop>
                    <status>HTTP/1.1 200 OK</status>
                </propstat>
            </response>
        </multistatus>`;
        return responseXml;
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
        if(obj.mode == 'CallRecordId'){
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
                    //send(user.guid, {api: "user", mt: "CallDisconnected", btn_id: btn.id})
                    //broadcast({ api: "user", mt: "NumberOnline", number: obj.num, note: "online", color: "online" })
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
                        { record_id: obj.record_id,
                            status: 1
                         }, // Valores a serem atualizados
                        { where: { id: parseInt(call.id) } } // Condição para atualização
                    );
                    log("innovaphoneController:callEvents:CallRecordId:callToUpdateResult "+callToUpdateResult)
                }
            } 
        }
        if(obj.mode == 'CallDisconnected'){
            const user = await db.user.findOne({
                where:{
                    sip:obj.guid
                }
            })

            if(user){
                if(obj.btn_id && obj.btn_id != ''){
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
                        log("innovaphoneController:callEvents:CallDisconnected:callToUpdateResult "+callToUpdateResult)
                    }
                }else{
                    const call = await db.call.findOne({
                        where: {
                          guid: user.guid,
                          number: obj.num,
                          call_innovaphone: obj.call,
                          status: 1,
                          direction: 'inc'
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
                        log("innovaphoneController:callEvents:IncomingCallDisconnected:callToUpdateResult "+callToUpdateResult)
                    }
                    const usersInn = await pbxTableUsers()
                    const userInn = usersInn.filter(u => u.guid == obj.guid )[0]
                    const device = userInn.devices.filter(d => d.hw == obj.device)[0];
                    send(user.guid, {api: "user", mt: "IncomingCallDisconnected", device: obj.device, deviceText: device.text, num: obj.num, call: obj.call , btn_id: ''})
                    broadcast({ api: "user", mt: "NumberOnline", number: obj.num, note: "online", color: "online" })
                    broadcast({ api: "user", mt: "NumberOnline", number: userInn.e164, note: "online", color: "online" })
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
        if(obj.mode == 'IncomingCallRinging'){
            const user = await db.user.findOne({
                where:{
                    sip:obj.guid
                }
            })
            if(user){
                const call = await db.call.findOne({
                    where: {
                      guid: user.guid,
                      number: obj.num,
                      call_innovaphone: obj.call,
                      status: 1,
                      direction: 'inc'
                    },
                    order: [
                      ['id', 'DESC']
                    ]
                  });
                if(!call){
                    let result = await db.call.create({
                        guid: user.guid,
                        number: obj.num,
                        call_started: getDateNow(),
                        call_ringing: getDateNow(),
                        call_innovaphone: obj.call,
                        status: 1,
                        direction: "inc",
                        device: obj.device
                    })
                    log("innovaphoneController:callEvents:IncomingCallRinging: db.create.call success " + result.id);
                }else{
                    log("innovaphoneController:callEvents:IncomingCallRinging: call already exist on DB with id " + call.id);
                }
                
                const usersInn = await pbxTableUsers()
                const userInn = usersInn.filter(u => u.guid == obj.guid )[0]
                const device = userInn.devices.filter(d => d.hw == obj.device)[0];
                send(user.guid, {api: "user", mt: "IncomingCallRing", device: obj.device, deviceText: device.text, num: obj.num, call: obj.call})
                broadcast({ api: "user", mt: "NumberBusy", number: userInn.e164, note: "ringing", color: "ringing" })
                broadcast({ api: "user", mt: "NumberBusy", number: obj.num, note: "ringing", color: "ringing" })
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
        if(obj.mode == 'IncomingCallConnected'){
            const user = await db.user.findOne({
                where:{
                    sip:obj.guid
                }
            })
            if(user){
                const call = await db.call.findOne({
                    where: {
                      guid: user.guid,
                      number: obj.num,
                      call_innovaphone: obj.call,
                      status: 1,
                      direction: 'inc'
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
                      log("innovaphoneController:callEvents:IncomingCallConnected:callToUpdateResult "+callToUpdateResult)
                }
                const usersInn = await pbxTableUsers()
                const userInn = usersInn.filter(u => u.guid == obj.guid )[0]
                const device = userInn.devices.filter(d => d.hw == obj.device)[0];
                send(user.guid, {api: "user", mt: "IncomingCallConnected", device: obj.device, deviceText: device.text, num: obj.num, call: obj.call})
                broadcast({ api: "user", mt: "NumberBusy", number: userInn.e164, note: "busy", color: "busy" })
                broadcast({ api: "user", mt: "NumberBusy", number: obj.num, note: "busy", color: "busy" })
            }
        }
        if(obj.mode == 'CallHeld'){
            const user = await db.user.findOne({
                where:{
                    sip:obj.guid
                }
            })
            if(user){
                send(user.guid, {api: "user", mt: "CallHeld", device: obj.device, btn_id: obj.btn_id, num: obj.num, call: obj.call})
                //broadcast({ api: "user", mt: "NumberBusy", number: obj.num, note: "ringing", color: "ringing" })
            }
        }
        if(obj.mode == 'UserCallHeld'){
            const user = await db.user.findOne({
                where:{
                    sip:obj.guid
                }
            })
            if(user){
                send(user.guid, {api: "user", mt: "UserCallHeld", device: obj.device, btn_id: obj.btn_id, num: obj.num, call: obj.call})
                //broadcast({ api: "user", mt: "NumberBusy", number: obj.num, note: "ringing", color: "ringing" })
                
            }
        }
        if(obj.mode == 'UserIncomingCallHeld'){
            const user = await db.user.findOne({
                where:{
                    sip:obj.guid
                }
            })
            if(user){
                send(user.guid, {api: "user", mt: "UserCallHeld", device: obj.device, btn_id: obj.btn_id, num: obj.num, call: obj.call})
                //broadcast({ api: "user", mt: "NumberBusy", number: obj.num, note: "ringing", color: "ringing" })
                
            }
        }
        if(obj.mode == 'CallRetrieved'){
            const user = await db.user.findOne({
                where:{
                    sip:obj.guid
                }
            })
            if(user){
                send(user.guid, {api: "user", mt: "CallRetrieved", device: obj.device, btn_id: obj.btn_id, num: obj.num, call: obj.call})
                //broadcast({ api: "user", mt: "NumberBusy", number: obj.num, note: "ringing", color: "ringing" })
            }
        }
        if(obj.mode == 'UserCallRetrieved'){
            const user = await db.user.findOne({
                where:{
                    sip:obj.guid
                }
            })
            if(user){
                send(user.guid, {api: "user", mt: "UserCallRetrieved", device: obj.device, btn_id: obj.btn_id, num: obj.num, call: obj.call})
                //broadcast({ api: "user", mt: "NumberBusy", number: obj.num, note: "ringing", color: "ringing" })
                
            }
        }
        if(obj.mode == 'UserIncomingCallRetrieved'){
            const user = await db.user.findOne({
                where:{
                    sip:obj.guid
                }
            })
            if(user){
                send(user.guid, {api: "user", mt: "UserCallRetrieved", device: obj.device, btn_id: obj.btn_id, num: obj.num, call: obj.call})
                //broadcast({ api: "user", mt: "NumberBusy", number: obj.num, note: "ringing", color: "ringing" })
                
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

export const convertRecordingPcapToWavg711u = async (pcapFilePath, outputDirectory, filenameBase) => {
    try{
        const rawFilePath = path.join(outputDirectory, filenameBase + '.raw');
        const wavFilePath = path.join(outputDirectory, filenameBase + '.wav');

        // Comando para determinar todos os SSRCs presentes no arquivo .pcap
        const findSSRCCommand = `tshark -r ${pcapFilePath} -q -z rtp,streams`;

        exec(findSSRCCommand, (err, stdout, stderr) => {
            if (err) {
                log(`innovaphoneController:convertRecordingPcapToWav: Error finding SSRCs: ${stderr}`);
                return err;
            }

            // Encontrar todos os SSRCs no resultado
            const ssrcMatches = stdout.match(/0x[0-9A-Fa-f]+/g);
            if (!ssrcMatches || ssrcMatches.length === 0) {
                log(`innovaphoneController:convertRecordingPcapToWav: No SSRCs found.`);
                return new Error("No SSRCs found in the RTP stream.");
            }

            log(`innovaphoneController:convertRecordingPcapToWav: Found SSRCs: ${ssrcMatches.join(', ')}`);

            // Extrair todos os fluxos RTP em um único arquivo RAW
            const tsharkCommand = ssrcMatches.map(ssrc => 
                `tshark -r ${pcapFilePath} -Y "rtp && rtp.ssrc==${ssrc}" -T fields -e rtp.payload`
            ).join(' | ') + ` | xxd -r -p > ${rawFilePath}`;

            exec(tsharkCommand, (err, stdout, stderr) => {
                if (err) {
                    log(`innovaphoneController:convertRecordingPcapToWav: Error running tshark: ${stderr}`);
                    return err;
                }

                log(`innovaphoneController:convertRecordingPcapToWav: tshark extraction complete: ${rawFilePath}`);

                // Converter o arquivo RAW para WAV
                const soxCommand = `sox -t raw -r 8000 -e u-law -b 8 -c 1 ${rawFilePath} ${wavFilePath}`;

                exec(soxCommand, (err, stdout, stderr) => {
                    if (err) {
                        log(`innovaphoneController:convertRecordingPcapToWav: Error running sox: ${stderr}`);
                        return err;
                    }

                    log(`innovaphoneController:convertRecordingPcapToWav: sox conversion complete: ${wavFilePath}`);
                    // Remover arquivos .pcap e .raw após o sucesso
                    fs.unlink(rawFilePath, (err) => {
                        if (err) {
                            log(`innovaphoneController:convertRecordingPcapToWav: Error deleting raw file: ${err}`);
                        } else {
                            log(`innovaphoneController:convertRecordingPcapToWav: Deleted raw file: ${rawFilePath}`);
                        }
                    });

                    fs.unlink(pcapFilePath, (err) => {
                        if (err) {
                            log(`innovaphoneController:convertRecordingPcapToWav: Error deleting pcap file: ${err}`);
                        } else {
                            log(`innovaphoneController:convertRecordingPcapToWav: Deleted pcap file: ${pcapFilePath}`);
                        }
                    });

                    return wavFilePath;
                });
            });
        });
    }catch(e){
        return e;
    }
}
export const convertRecordingPcapToWav = async (pcapFilePath, outputDirectory, filenameBase) => {
    try {
        const rawFilePath = path.join(outputDirectory, filenameBase + '.raw');
        const wavFilePath = path.join(outputDirectory, filenameBase + '.wav');

        // Comando para determinar todos os SSRCs e Payloads presentes no arquivo .pcap
        const findSSRCCommand = `tshark -r ${pcapFilePath} -q -z rtp,streams`;

        exec(findSSRCCommand, (err, stdout, stderr) => {
            if (err) {
                log(`innovaphoneController:convertRecordingPcapToWav: Error finding SSRCs: ${stderr}`);
                return err;
            }

            // Encontrar todos os SSRCs e Payloads no resultado
            const ssrcMatches = [...stdout.matchAll(/(0x[0-9A-Fa-f]+)\s+(\w+)/g)];
            if (!ssrcMatches || ssrcMatches.length === 0) {
                log(`innovaphoneController:convertRecordingPcapToWav: No SSRCs found.`);
                return new Error("No SSRCs found in the RTP stream.");
            }

            log(`innovaphoneController:convertRecordingPcapToWav: Found SSRCs: ${ssrcMatches.map(match => match[1]).join(', ')}`);

            // Construir o comando tshark para cada SSRC e Payload
            const tsharkCommands = ssrcMatches.map(([_, ssrc, payload]) => {
                return `tshark -r ${pcapFilePath} -Y "rtp && rtp.ssrc==${ssrc}" -T fields -e rtp.payload`;
            }).join(' | ');

            const finalTsharkCommand = `${tsharkCommands} | xxd -r -p > ${rawFilePath}`;

            exec(finalTsharkCommand, async (err, stdout, stderr)  =>  {
                if (err) {
                    log(`innovaphoneController:convertRecordingPcapToWav: Error running tshark: ${stderr}`);
                    return err;
                }

                log(`innovaphoneController:convertRecordingPcapToWav: tshark extraction complete: ${rawFilePath}`);

                // Mapear Payload para os parâmetros corretos no sox
                const codecParameters = {
                    g711U: '-t raw -r 8000 -e u-law -b 8 -c 1',
                    g711A: '-t raw -r 8000 -e a-law -b 8 -c 1',
                    g722: '-t raw -r 16000 -e signed -b 16 -c 1',
                    g729: '-t raw -r 8000 -e signed -b 8 -c 1' // Exemplo para G.729, pode precisar de decodificação adicional
                    // Adicione outros codecs aqui conforme necessário
                };

                // Use o payload do primeiro SSRC para determinar os parâmetros sox
                const payload = ssrcMatches[0][2]; // Exemplo: g711U, g711A, etc.

                if(payload == 'opus'){
                    log(`innovaphoneController:convertRecordingPcapToWav: OPUS CODEC DETECTED`);
                    return await convertOpusPcapToWav(pcapFilePath, outputDirectory, filenameBase)
                }

                const soxParams = codecParameters[payload] || codecParameters['g711U']; // Default para g711U

                // Converter o arquivo RAW para WAV usando os parâmetros corretos
                const soxCommand = `sox ${soxParams} ${rawFilePath} ${wavFilePath}`;

                exec(soxCommand, (err, stdout, stderr) => {
                    if (err) {
                        log(`innovaphoneController:convertRecordingPcapToWav: Error running sox: ${stderr}`);
                        return err;
                    }

                    log(`innovaphoneController:convertRecordingPcapToWav: sox conversion complete: ${wavFilePath}`);

                    // Remover arquivos .pcap e .raw após o sucesso
                    fs.unlink(rawFilePath, (err) => {
                        if (err) {
                            log(`innovaphoneController:convertRecordingPcapToWav: Error deleting raw file: ${err}`);
                        } else {
                            log(`innovaphoneController:convertRecordingPcapToWav: Deleted raw file: ${rawFilePath}`);
                        }
                    });

                    // fs.unlink(pcapFilePath, (err) => {
                    //     if (err) {
                    //         log(`innovaphoneController:convertRecordingPcapToWav: Error deleting pcap file: ${err}`);
                    //     } else {
                    //         log(`innovaphoneController:convertRecordingPcapToWav: Deleted pcap file: ${pcapFilePath}`);
                    //     }
                    // });

                    return wavFilePath;
                });
            });
        });
    } catch (e) {
        return e;
    }
};

export const convertRecordingPcapToWavffmpeg = async (pcapFilePath, outputDirectory, filenameBase) => {
    try {
        const rawFilePath = path.join(outputDirectory, filenameBase + '.raw');
        const wavFilePath = path.join(outputDirectory, filenameBase + '.wav');

        // Comando para determinar todos os SSRCs e Payloads presentes no arquivo .pcap
        const findSSRCCommand = `tshark -r ${pcapFilePath} -q -z rtp,streams`;

        exec(findSSRCCommand, (err, stdout, stderr) => {
            if (err) {
                log(`innovaphoneController:convertRecordingPcapToWav: Error finding SSRCs: ${stderr}`);
                return err;
            }

            // Encontrar todos os SSRCs e Payloads no resultado
            const ssrcMatches = [...stdout.matchAll(/(0x[0-9A-Fa-f]+)\s+(\w+)/g)];
            if (!ssrcMatches || ssrcMatches.length === 0) {
                log(`innovaphoneController:convertRecordingPcapToWav: No SSRCs found.`);
                return new Error("No SSRCs found in the RTP stream.");
            }

            log(`innovaphoneController:convertRecordingPcapToWav: Found SSRCs: ${ssrcMatches.map(match => match[1]).join(', ')}`);

            // Extrair todos os fluxos RTP em um único arquivo RAW usando tshark
            const tsharkCommands = ssrcMatches.map(([_, ssrc]) => {
                return `tshark -r ${pcapFilePath} -Y "rtp && rtp.ssrc==${ssrc}" -T fields -e rtp.payload`;
            }).join(' | ');

            const finalTsharkCommand = `${tsharkCommands} | xxd -r -p > ${rawFilePath}`;

            exec(finalTsharkCommand, (err, stdout, stderr) => {
                if (err) {
                    log(`innovaphoneController:convertRecordingPcapToWav: Error running tshark: ${stderr}`);
                    return err;
                }

                log(`innovaphoneController:convertRecordingPcapToWav: tshark extraction complete: ${rawFilePath}`);

                // Converter o arquivo RAW para WAV usando ffmpeg
                const ffmpegCommand = `ffmpeg -f s16le -ar 8000 -i ${rawFilePath} ${wavFilePath}`;

                exec(ffmpegCommand, (err, stdout, stderr) => {
                    if (err) {
                        log(`innovaphoneController:convertRecordingPcapToWav: Error running ffmpeg: ${stderr}`);
                        return err;
                    }

                    log(`innovaphoneController:convertRecordingPcapToWav: ffmpeg conversion complete: ${wavFilePath}`);

                    // Remover arquivos .pcap e .raw após o sucesso
                    fs.unlink(rawFilePath, (err) => {
                        if (err) {
                            log(`innovaphoneController:convertRecordingPcapToWav: Error deleting raw file: ${err}`);
                        } else {
                            log(`innovaphoneController:convertRecordingPcapToWav: Deleted raw file: ${rawFilePath}`);
                        }
                    });

                    fs.unlink(pcapFilePath, (err) => {
                        if (err) {
                            log(`innovaphoneController:convertRecordingPcapToWav: Error deleting pcap file: ${err}`);
                        } else {
                            log(`innovaphoneController:convertRecordingPcapToWav: Deleted pcap file: ${pcapFilePath}`);
                        }
                    });

                    return wavFilePath;
                });
            });
        });
    } catch (e) {
        return e;
    }
};


export const convertOpusPcapToWav = async (pcapFilePath, outputDirectory, filenameBase) => {
    try {
        const rawFilePath = path.join(outputDirectory, filenameBase + '.raw');
        const wavFilePath = path.join(outputDirectory, filenameBase + '.wav');

        // Extrair o payload RTP Opus do arquivo .pcap
        const tsharkCommand = `tshark -r ${pcapFilePath} -Y "rtp && rtp.payload_type==96" -T fields -e rtp.payload | xxd -r -p > ${rawFilePath}`;

        exec(tsharkCommand, (err, stdout, stderr) => {
            if (err) {
                log(`innovaphoneController:convertOpusPcapToWav: Error running tshark: ${stderr}`);
                return err;
            }

            log(`innovaphoneController:convertOpusPcapToWav: tshark extraction complete: ${rawFilePath}`);

            // Converter o arquivo RAW para WAV usando ffmpeg
            const ffmpegCommand = `ffmpeg -f opus -i ${rawFilePath} -acodec pcm_s16le -ar 48000 ${wavFilePath}`;

            exec(ffmpegCommand, (err, stdout, stderr) => {
                if (err) {
                    log(`innovaphoneController:convertOpusPcapToWav: Error running ffmpeg: ${stderr}`);
                    return err;
                }

                log(`innovaphoneController:convertOpusPcapToWav: ffmpeg conversion complete: ${wavFilePath}`);

                // Remover arquivos .pcap e .raw após o sucesso
                fs.unlink(rawFilePath, (err) => {
                    if (err) {
                        log(`innovaphoneController:convertOpusPcapToWav: Error deleting raw file: ${err}`);
                    } else {
                        log(`innovaphoneController:convertOpusPcapToWav: Deleted raw file: ${rawFilePath}`);
                    }
                });

                fs.unlink(pcapFilePath, (err) => {
                    if (err) {
                        log(`innovaphoneController:convertOpusPcapToWav: Error deleting pcap file: ${err}`);
                    } else {
                        log(`innovaphoneController:convertOpusPcapToWav: Deleted pcap file: ${pcapFilePath}`);
                    }
                });

                return wavFilePath;
            });
        });
    } catch (e) {
        return e;
    }
};

export async function returnRecordLink(recordList) {
    return new Promise((resolve, reject) => {
        const outputDirectory = path.join(__dirname, '../httpfiles/recordings');
        // Ler todos os arquivos do diretório de saída
        fs.readdir(outputDirectory, (err, files) => {
            if (err) {
                return resolve(recordList);
            }

            // Percorrer a lista de objetos
            recordList.forEach(record => {
                // Verificar se algum arquivo corresponde ao record_id
                const matchingFile = files.find(file => file.includes(record.record_id));
                
                // Se encontrar uma correspondência, atribuir o nome do arquivo ao record_id
                if (matchingFile) {
                    record.record_link = '/api/innovaphone/recordings/'+matchingFile;
                }else{
                    record.record_link = '';
                }
            });

            // Retornar a lista editada
            return resolve(recordList);
        });
    });
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
    // if (imStatuses.every(status => status === 'closed' && telStatuses.every(status => status != 'closed'))) { //Se Todos = true
    //     return 'UserOffline';
    // }
    if (imStatuses.some(status => status === 'open') || telStatuses.some(status => status != 'closed')) { //Se Pelo menos um = true
        return 'UserOnline';
    }else{
        return 'UserOffline';
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
