// controllers/innovaphoneController.js
import { broadcast, send, getConnections } from '../managers/webSocketManager.js';
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
import { triggerActionByStartType } from './actionController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Define o diretório onde os arquivos estáticos serão servidos
const staticDir = path.join(__dirname, '../httpfiles/');

let presences = [];
let pbxUsers = [];

export const restartPassiveRCCMonitor = async () =>{
    const usersLogged = getConnections();
    for (const user of usersLogged) {
        await innovaphonePassiveRCCMonitor(user);
    }
    
}

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
/**
 * 
 * @param {object} btn - Objeto que possui as definições de device e número de destino
 * @param {object} user - Objeto do usuário que está solicitando a chamada
 * @param {string} device - Device Id utilizado caso não seja fornecido um Objeto BTN
 * @param {string} num - Número de destino utilizado caso não seja fornecido um Objeto BTN
 * @returns 
 */
export const innovaphoneMakeCall = async (btn, user, device, num) => {
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
        let objCall;
        if(btn){
            // if(btn.button_type == 'user'){
            //     const usersInn = await pbxTableUsers()
            //     const userInn = usersInn.filter(u => u.guid == btn.button_prt )[0]
            //     btn.button_prt = userInn.e164
            // }
            // if(btn.button_type == 'google_calendar'){
            //     btn.button_prt = num;
            // }
            objCall = { 
                num: btn.button_prt, 
                mode: 'MakeCall', 
                guid: user.sip, 
                device: btn.button_device,
                btn_id: btn.id
            }

        }else{

            objCall = { 
                num: num, 
                mode: 'MakeCall', 
                guid: user.sip, 
                device: device,
                btn_id: ''
            }

        }
        const res = await sendHttpPostRequest(urlPbxTableUsers.value+"/rcc", objCall, customHeaders.value)
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
export const innovaphoneHeldCall = async (btn, user, device, call) => {
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
        let objCall;
        if(btn){
            if(btn.button_type == 'user'){
                const usersInn = await pbxTableUsers()
                const userInn = usersInn.filter(u => u.guid == btn.button_prt )[0]
                btn.button_prt = userInn.e164
            }
            objCall = { num: btn.button_prt, 
                mode: 'HeldCall', 
                guid: user.sip, 
                device: btn.button_device,
                btn_id: btn.id
            }

        }else{
            objCall = { mode: 'HeldCall', 
                guid: user.sip, 
                device: device,
                call: call,
                btn_id: ''
            }

        }
        
        const res = await sendHttpPostRequest(urlPbxTableUsers.value+"/rcc", objCall, customHeaders.value)
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
export const innovaphoneRedirectCall = async (btn, user, destination, device, call) => {
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
        let objCall;
        if(btn){
            if(btn.button_type == 'user'){
                const usersInn = await pbxTableUsers()
                const userInn = usersInn.filter(u => u.guid == btn.button_prt )[0]
                btn.button_prt = userInn.e164
            }
            objCall = { 
                mode: 'RedirectCall', 
                guid: user.sip, 
                device: btn.button_device,
                btn_id: btn.id,
                destination: destination
            }
        }else{
            objCall = { 
                mode: 'RedirectCall', 
                guid: user.sip, 
                device: device,
                btn_id: '',
                call: call,
                destination: destination
            }
        }
        
        const res = await sendHttpPostRequest(urlPbxTableUsers.value+"/rcc", objCall, customHeaders.value)
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
export const innovaphoneDtmfCall = async (btn, user, digit, device, call) => {
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
        let objCall;
        if(btn){
            if(btn.button_type == 'user'){
                const usersInn = await pbxTableUsers()
                const userInn = usersInn.filter(u => u.guid == btn.button_prt )[0]
                btn.button_prt = userInn.e164
            }
            objCall = { num: btn.button_prt, 
                mode: 'SendDtmfDigits', 
                guid: user.sip, 
                device: btn.button_device,
                btn_id: btn.id,
                digit: digit
            }

        }else{
            objCall = { mode: 'SendDtmfDigits', 
                guid: user.sip, 
                device: device,
                btn_id: '',
                call: call,
                digit: digit
            }
        }
        
        const res = await sendHttpPostRequest(urlPbxTableUsers.value+"/rcc", objCall, customHeaders.value)
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
export const innovaphoneRetrieveCall = async (btn, user, device, call) => {
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
        let objCall;
        if(btn){
            if(btn.button_type == 'user'){
                const usersInn = await pbxTableUsers()
                const userInn = usersInn.filter(u => u.guid == btn.button_prt )[0]
                btn.button_prt = userInn.e164
            }
            objCall = {
                mode: 'RetrieveCall', 
                guid: user.sip, 
                device: btn.button_device,
                btn_id: btn.id
            }
        }else{
            objCall = {
                mode: 'RetrieveCall', 
                guid: user.sip, 
                device: device,
                call: call,
                btn_id: ''
            }
        }
        
        const res = await sendHttpPostRequest(urlPbxTableUsers.value+"/rcc", objCall, customHeaders.value)
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
export const innovaphoneClearCall = async (btn, user, device, call) => {
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
        let objCall;
        if(btn){
            if(btn.button_type == 'user'){
                const usersInn = await pbxTableUsers()
                const userInn = usersInn.filter(u => u.guid == btn.button_prt )[0]
                btn.button_prt = userInn.e164
            }
            objCall = { num: btn.button_prt, 
                mode: 'ClearCall', 
                guid: user.sip, 
                device: btn.button_device,
                btn_id: btn.id
            }

        }else{
            objCall ={ mode: 'ClearCall', 
                guid: user.sip, 
                device: device,
                call: call,
                btn_id: ''
            }

        }
        
        const res = await sendHttpPostRequest(urlPbxTableUsers.value+"/rcc", objCall, customHeaders.value)
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
        if(!config){
            log('innovaphoneController:pbxApiPresenceSubscription: URL not configured')
            return;
        }
        log('innovaphoneController:pbxApiPresenceSubscription: requesting to the PBX')
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
        // if(pbxUsers.length==0){
        //     let config = await db.config.findOne({
        //         where:{ 
        //             entry: 'urlPbxTableUsers'
        //         }
        //     });
        //     log('innovaphoneController:pbxTableUsers: config '+JSON.stringify(config))
        //     // Solicitação para obter dispositivos
        //     const pbxResponse = await sendHttpGetRequest(config.value+"/pbxTableUsers", '{}');
        //     if(pbxResponse.data && pbxResponse){
        //         log(`innovaphoneController:pbxTableUsers: result ${pbxResponse.data.length} users`)
        //         if (Array.isArray(pbxResponse.data)) {
        //             pbxUsers = pbxResponse.data;
        //             return pbxResponse.data;
        //         } else {
        //             return [];
        //         }
        //     }
        // }else{
        //     return pbxUsers
        // }
        let config = await db.config.findOne({
            where:{ 
                entry: 'urlPbxTableUsers'
            }
        });
        //log('innovaphoneController:pbxTableUsers: config '+JSON.stringify(config))
        // Solicitação para obter dispositivos
        if(config.value != ''){
            const pbxResponse = await sendHttpGetRequest(config.value+"/pbxTableUsers", '{}');
            if(pbxResponse.data && pbxResponse){
                log(`innovaphoneController:pbxTableUsers: result ${pbxResponse.data.length} users`)
                if (Array.isArray(pbxResponse.data)) {
                    pbxUsers = pbxResponse.data;
                    return pbxResponse.data;
                }
            }
        }else{
            log('innovaphoneController:pbxTableUsers: No config')
        }
        return [];
    }
    catch(e){
        log(`innovaphoneController:pbxTableUsers: Error ${e}`)
        return [];
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

export const callEvents = async (obj) => {
    //log('innovaphoneController:callEvents: '+JSON.stringify(obj))
    try{
        if(obj.mode == 'CallRecordId'){
            const user = await db.user.findOne({
                where:{
                    sip:obj.guid
                }
            })

            if(user){
                if(obj.btn_id && obj.btn_id !=""){
                    const btn = await db.button.findOne({
                        where: {
                            id: obj.btn_id,
                        }
                    })
                    if(btn){
                        //obj.num = btn.button_prt;
                        
                    }
                    const call = await db.call.findOne({
                        where: {
                          guid: user.guid,
                          device: obj.device,
                          btn_id: obj.btn_id,
                          status: 1
                        },
                        order: [
                          ['id', 'DESC']
                        ]
                    });
                    if(call){
                        const callToUpdateResult = await db.call.update(
                            { record_id: obj.record_id,
                                call_innovaphone: obj.call,
                                status: 1
                                }, // Valores a serem atualizados
                            { where: { id: parseInt(call.id) } } // Condição para atualização
                        );
                        log("innovaphoneController:callEvents:CallRecordId:callToUpdateResult "+callToUpdateResult)
                        send(user.guid, {api: "user", mt: "CallConnecting", call: obj.call, btn_id: obj.btn_id, device: obj.device, num: btn.button_prt})
                    }
                }else{
                    const call = await db.call.findOne({
                        where: {
                          guid: user.guid,
                          device: obj.device,
                          number: obj.num,
                          status: 1
                        },
                        order: [
                          ['id', 'DESC']
                        ]
                      });
                      
                    if(call){
                        const callToUpdateResult = await db.call.update(
                            { record_id: obj.record_id,
                                call_innovaphone: obj.call,
                                status: 1
                             }, // Valores a serem atualizados
                            { where: { id: parseInt(call.id) } } // Condição para atualização
                        );
                        log("innovaphoneController:callEvents:CallRecordId:callToUpdateResult "+callToUpdateResult)
                        send(user.guid, {api: "user", mt: "CallConnecting", call: obj.call, device: obj.device, num: obj.num})
                    }
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
                        obj.num = btn.button_prt;
                        send(user.guid, {api: "user", mt: "CallDisconnected", call: obj.call, btn_id: btn.id, device: obj.device})
                        broadcast({ api: "user", mt: "NumberOnline", number: obj.num, note: "online", color: "online" })
                    }
    
                    const call = await db.call.findOne({
                        where: {
                          guid: user.guid,
                          call_innovaphone: obj.call
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
                        log(`innovaphoneController:callEvents:CallDisconnected: updated ${callToUpdateResult} call with id ${call.id}`)
                        //intert into DB the event
                        var msg = { 
                            guid: user.guid, 
                            from: call.direction == "out"? obj.guid : obj.num, 
                            name: "call", 
                            date: getDateNow(), 
                            status: call.call_connected == null ? "not_connected" : "connected", 
                            details: call.id, 
                            prt: call.direction == "out" ? obj.num : obj.guid 
                        }
                        //log("innovaphoneController:callEvents:CallRinging will insert it on DB : " + JSON.stringify(msg));
                        let resultInsert = await db.activity.create(msg)
                        log("innovaphoneController:callEvents:CallDisconnected inserted activity with id : " + resultInsert.id);
                        const detail = await db.call.findOne({where:{
                            id:parseInt(call.id)
                        }})
                        let finalCall =  detail.toJSON();
                        returnRecordLink([finalCall])
                            .then(async(result) =>{
                                finalCall = result[0]
                                resultInsert.details = finalCall
                                log(`innovaphoneController:callEvents:returnRecordLink: ${finalCall.record_link == ''? false : true}`)
                                send(user.guid, { api: "user", mt: "getHistoryResult", result: [resultInsert] });
                            })
                            .catch(async(e)=>{
                                log(`innovaphoneController:callEvents:returnRecordLink: error ${e}`)
                                send(user.guid, { api: "user", mt: "getHistoryResult", result: [resultInsert] });
                            })
                        
                    }else{
                        log(`innovaphoneController:callEvents:CallDisconnected: call not found in DB ${JSON.stringify(call)} : for obj received ${JSON.stringify(obj)}`)
                        
                    }
                }else{
                    const call = await db.call.findOne({
                        where: {
                          guid: user.guid,
                          call_innovaphone: obj.call
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
                        log(`innovaphoneController:callEvents:CallDisconnected: updated ${callToUpdateResult} call with id ${call.id}`)
                        //intert into DB the event
                        var msg = { 
                            guid: user.guid, 
                            from: call.direction == "out" ? obj.guid : obj.num,  
                            name: "call", 
                            date: getDateNow(), 
                            status: call.call_connected == null ? "not_connected" : "connected", 
                            details: call.id, 
                            prt: call.direction == "out" ? obj.num : obj.guid 
                        }
                        //log("innovaphoneController:callEvents:CallRinging will insert it on DB : " + JSON.stringify(msg));
                        let resultInsert = await db.activity.create(msg)
                        const detail = await db.call.findOne({where:{
                            id:parseInt(call.id)
                        }})
                        let finalCall =  detail.toJSON();
                        returnRecordLink([finalCall])
                            .then(async(result) =>{
                                finalCall = result[0]
                                resultInsert.details = finalCall
                                log(`innovaphoneController:callEvents:returnRecordLink: ${finalCall.record_link == ''? false : true}`)
                                send(user.guid, { api: "user", mt: "getHistoryResult", result: [resultInsert] });
                            })
                            .catch(async(e)=>{
                                log(`innovaphoneController:callEvents:returnRecordLink: error ${e}`)
                                send(user.guid, { api: "user", mt: "getHistoryResult", result: [resultInsert] });
                            })
                    }else{
                        log(`innovaphoneController:callEvents:IncomingCallDisconnected: call not found in DB ${JSON.stringify(call)}`)                    
                    }
                    const usersInn = await pbxTableUsers()
                    const userInn = usersInn.filter(u => u.guid == obj.guid )[0]
                    const device = userInn.devices.filter(d => d.hw == obj.device)[0];
                    send(user.guid, {api: "user", mt: "IncomingCallDisconnected", device: obj.device, deviceText: device.text, num: obj.num, call: obj.call})
                    broadcast({ api: "user", mt: "NumberOnline", number: obj.num, note: "online", color: "online" })
                    broadcast({ api: "user", mt: "NumberOnline", number: userInn.e164, note: "online", color: "online" })
                    return;
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
                if(obj.btn_id && obj.btn_id !=""){
                    const btn = await db.button.findOne({
                        where: {
                            id: obj.btn_id,
                        }
                    })
                    if(btn){
                        //
                        send(user.guid, {api: "user", mt: "CallRinging", call: obj.call, btn_id: btn.id, device: obj.device, num: btn.button_prt})
                        broadcast({ api: "user", mt: "NumberBusy", number: obj.num, note: "ringing", color: "ringing" })
                        //obj.num = btn.button_prt;
                    }
                }else{
                    send(user.guid, {api: "user", mt: "CallRinging", call: obj.call, device: obj.device, num: obj.num})
                    broadcast({ api: "user", mt: "NumberBusy", number: obj.num, note: "ringing", color: "ringing" })
                }
                const call = await db.call.findOne({
                    where: {
                      guid: user.guid,
                      call_innovaphone: obj.call,
                      device: obj.device,
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
                    let resultCall = await db.call.create({
                        guid: user.guid,
                        number: obj.num,
                        call_started: getDateNow(),
                        call_ringing: getDateNow(),
                        call_innovaphone: obj.call,
                        status: 1,
                        direction: "inc",
                        device: obj.device
                    })
                    log("innovaphoneController:callEvents:IncomingCallRinging: db.create.call success " + resultCall.id);
           
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
                const usersInn = await pbxTableUsers()
                const userInn = usersInn.filter(u => u.guid == obj.guid )[0]
                broadcast({ api: "user", mt: "NumberBusy", number: userInn.e164, note: "busy", color: "busy" })

                if(obj.btn_id && obj.btn_id !=""){
                    const btn = await db.button.findOne({
                        where: {
                            id: obj.btn_id,
                        }
                    })
                    if(btn){
                        //
                        send(user.guid, {api: "user", mt: "CallConnected", call: obj.call, btn_id: btn.id, device: obj.device, num: btn.button_prt})
                        broadcast({ api: "user", mt: "NumberBusy", number: obj.num, note: "busy", color: "busy" })
                        //obj.num = btn.button_prt;
                    }
                }else{
                    send(user.guid, {api: "user", mt: "CallConnected", call: obj.call, device: obj.device, num: obj.num})
                    broadcast({ api: "user", mt: "NumberBusy", number: obj.num, note: "busy", color: "busy" })
                }
                const call = await db.call.findOne({
                    where: {
                      guid: user.guid,
                      call_innovaphone: obj.call,
                      status: 1
                    },
                    order: [
                      ['id', 'DESC']
                    ]
                  });
    
                if(call){
                    const callToUpdateResult = await db.call.update(
                        { call_connected: getDateNow(),
                            number: obj.num,
                            status: 1
                         }, // Valores a serem atualizados
                        { where: { id: parseInt(call.id) } } // Condição para atualização
                      );
                      log("innovaphoneController:callEvents::callToUpdateResult "+callToUpdateResult)
                }

                //Vamos verificar ações para ligações
                var actionResult = await triggerActionByStartType(user.guid, obj.num, 'destNumber')
                log("innovaphoneController:callEvents:CallConnected: triggerActionByStartType destNumber result " + actionResult);
                var actionResult = await triggerActionByStartType(user.guid, userInn.e164, 'origemNumber')
                log("innovaphoneController:callEvents:CallConnected: triggerActionByStartType origemNumber result " + actionResult);
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


                //Vamos verificar ações para ligações
                var actionResult = await triggerActionByStartType(obj.num, userInn.e164, 'destNumber')
                log("innovaphoneController:callEvents:IncomingCallConnected: triggerActionByStartType destNumber result " + actionResult);
                var actionResult = await triggerActionByStartType(obj.num, obj.num, 'origemNumber')
                log("innovaphoneController:callEvents:IncomingCallConnected: triggerActionByStartType origemNumber result " + actionResult);

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
        log('innovaphoneController:callEvents: Error = '+ e)
    }
}

export const userEvents = async (obj) =>{
    try{
        log('innovaphoneController:userEvents: '+JSON.stringify(obj))
        if(obj.mode == 'UserInfo' && obj.guid){
            const user = await db.user.findOne({
                where:{
                    sip:obj.guid
                }
            })

            if(user){
                log('innovaphoneController:userEvents:UserInfo: Registered Devices for '+JSON.stringify(user.name))
                send(user.guid, {api:"user",mt:"UserEvent", devices: obj.regs})
            } 
        }
        if(obj.mode == 'ReplicateUpdate' && obj.guid){
            const user = await db.user.findOne({
                where:{
                    sip:obj.guid
                }
            })

            if(user){
                log('innovaphoneController:userEvents:ReplicateUpdate: User updated '+JSON.stringify(user.name))
                broadcast({api:"user",mt:"ReplicateUpdate", result: obj.result})
            } 
        }

    }catch(e){
        log('innovaphoneController:userEvents: error = '+ e)
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
//Função chamada para conversão de gravações
export const convertRecordingPcapToWav = async (pcapFilePath, outputDirectory, filenameBase) => {
    try {
        const rawFilePath = path.join(outputDirectory, filenameBase + '.raw');
        const wavFilePath = path.join(outputDirectory, filenameBase + '.wav');

        // Comando para determinar todos os SSRCs e Payloads presentes no arquivo .pcap
        const findSSRCCommand = `tshark -r ${pcapFilePath} -q -z rtp,streams`;

        exec(findSSRCCommand, async (err, stdout, stderr) => {
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

            // Use o payload do primeiro SSRC para determinar os parâmetros sox
            const payload = ssrcMatches[0][2]; // Exemplo: g711U, g711A, etc.

            if(payload == 'opus'){
                log(`innovaphoneController:convertRecordingPcapToWav: OPUS CODEC DETECTED`);
                return await convertOpusPcapToOpus(pcapFilePath, outputDirectory, filenameBase)
            }

            // Construir o comando tshark para cada SSRC e Payload
            const tsharkCommands = ssrcMatches.map(([_, ssrc, payloadRtp]) => {
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

                const soxParams = codecParameters[payload] || codecParameters['g711U']; // Default para g711U

                // Converter o arquivo RAW para WAV usando os parâmetros corretos
                const soxCommand = `sox ${soxParams} ${rawFilePath} ${wavFilePath}`;

                exec(soxCommand, async (err, stdout, stderr) => {
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

                    //atualizar o hotorico do usuário com o record_link
                    const call = await updateUserHistoryByRecordFilename(filenameBase)

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

//Função auxiliar Converter OPUS PARA AUDIO
export const convertOpusPcapToOpus = async (pcapFilePath, outputDirectory, filenameBase) => {
    try {
        const opusFilePath = path.join(outputDirectory, filenameBase + '.opus');
        const wavFilePath = path.join(outputDirectory, filenameBase + '.wav');
        const rawFilePath = path.join(outputDirectory, filenameBase + '.txt');
        log(`innovaphoneController:convertOpusPcapToOpus: pcapFilePath: ${pcapFilePath}`);

        // Comando para determinar todas as portas de origem (source ports) presentes no arquivo .pcap
        const findPortCommand = `tshark -r ${pcapFilePath} -Y "rtp" -T fields -e udp.srcport -e rtp.p_type`;

        // Executar o comando tshark
        exec(findPortCommand, (err, stdout, stderr) => {
            if (err) {
                log(`innovaphoneController:convertOpusPcapToOpus: Error finding source ports: ${stderr}`);
                return err;
            }

            // Dividir a saída em linhas e processar cada uma
            const portPayloadPairs = stdout
            .split('\n')                       // Quebrar a saída em linhas
            .filter(line => line.trim() !== '') // Remover linhas vazias
            .map(line => line.trim().split('\t')) // Dividir cada linha entre 'porta' e 'payload'
            .filter(parts => parts.length === 2); // Certificar-se de que ambas as partes existem (porta e payload)

            // Usar Set para garantir combinações únicas de porta e payload
            const uniquePortPayloadPairs = [...new Set(portPayloadPairs.map(parts => `${parts[0]}:${parts[1]}`))];

            if (uniquePortPayloadPairs.length === 0) {
                log(`innovaphoneController:convertOpusPcapToOpus: No source ports or payload types found.`);
                return new Error("No source ports or payload types found in the RTP stream.");
            }

            // Exibir as portas e payload types encontrados
            let tsharkCommands = '';
            let payloadtype = 111;
            uniquePortPayloadPairs.forEach(pair => {
                const [port, payload] = pair.split(':');
                log(`innovaphoneController:convertOpusPcapToOpus: Found port: ${port}, payload type: ${payload}`);
                payloadtype = payload;
                tsharkCommands += `tshark -x -r ${pcapFilePath} -Y "udp.srcport==${port}" | `;
            });

            const finalTsharkCommand = `${tsharkCommands}cut -d " " -f 1-20 > ${rawFilePath}`;
            log(`innovaphoneController:convertOpusPcapToOpus: Extraction Command: ${finalTsharkCommand}`);
            exec(finalTsharkCommand, async (err, stdout, stderr)  =>  {
                if (err) {
                    log(`innovaphoneController:convertOpusPcapToOpus: Error running tshark: ${stderr}`);
                    return err;
                }

                log(`innovaphoneController:convertOpusPcapToOpus: tshark extraction complete: ${rawFilePath}`);
                // Extrair o payload RTP Opus do arquivo .pcap
                const conversionCommand = `python3 ./utils/hex_to_opus.py -x ${rawFilePath} --recordfile ${opusFilePath} --rtpoffset 42 --payloadtype ${payloadtype}`;
                log(`innovaphoneController:convertOpusPcapToOpus: Conversion Command: ${conversionCommand}`);
                exec(conversionCommand, async (err, stdout, stderr) => {
                    if (err) {
                        log(`innovaphoneController:convertOpusPcapToOpus: Error running python: ${stderr}`);
                        return err;
                    }

                    log(`innovaphoneController:convertOpusPcapToOpus: python conversion complete: ${opusFilePath}`);

                    //Converter o arquivo .opus em .wav usando o ffmpeg
                    await convertOpusToWav(opusFilePath, wavFilePath)
                    .then(async(result) =>{
                        log(`innovaphoneController:convertOpusPcapToOpus:convertOpusToWav: final record wav ${result}`)
                        if(result){
                            // Remover arquivos .raw após o sucesso
                            fs.unlink(rawFilePath, (err) => {
                                if (err) {
                                    log(`innovaphoneController:convertOpusPcapToOpus: Error deleting raw file: ${err}`);
                                } else {
                                    log(`innovaphoneController:convertOpusPcapToOpus: Deleted raw file: ${rawFilePath}`);
                                }
                            });
                            //delete .pcap file
                            fs.unlink(pcapFilePath, (err) => {
                                if (err) {
                                    log(`innovaphoneController:convertOpusPcapToOpus: Error deleting pcap file: ${err}`);
                                } else {
                                    log(`innovaphoneController:convertOpusPcapToOpus: Deleted pcap file: ${pcapFilePath}`);
                                }
                            });
                            //delete .opus file
                            fs.unlink(opusFilePath, (err) => {
                                if (err) {
                                    log(`innovaphoneController:convertOpusPcapToOpus: Error deleting opus file: ${err}`);
                                } else {
                                    log(`innovaphoneController:convertOpusPcapToOpus: Deleted opus file: ${opusFilePath}`);
                                }
                            });
                        }
                    })
                    .catch(async(e)=>{
                        log(`innovaphoneController:convertOpusPcapToOpus:convertOpusToWav: error ${e}`)
                    })

                    
                    //atualizar o hotorico do usuário com o record_link
                    const call = await updateUserHistoryByRecordFilename(filenameBase)

                    return wavFilePath;
                });
            });
        });
    } catch (e) {
        return e;
    }
};

async function convertOpusToWav(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
        try{
            const command = `ffmpeg -i ${inputFile} -acodec pcm_s16le -ar 44100 ${outputFile}`;
      
            exec(command, (error, stdout, stderr) => {
              if (error) {
                log(`innovaphoneController:convertOpusToWav: Erro ao converter arquivo: ${error.message}`);
                return resolve();
              }
              if (stderr) {
                log(`innovaphoneController:convertOpusToWav: FFmpeg log: ${stderr}`);
              }
              log(`innovaphoneController:convertOpusToWav: Arquivo convertido com sucesso: ${outputFile}`);
              return resolve(outputFile);
            });
        }catch(e){
            log(`innovaphoneController:convertOpusToWav: Erro ao converter arquivo: ${e.message}`);
            return resolve();
        }
    });
  }

export async function returnRecordLink(recordList) {
    return new Promise((resolve, reject) => {
        const outputDirectory = path.join(__dirname, '../httpfiles/recordings');
        // Ler todos os arquivos do diretório de saída
        fs.readdir(outputDirectory, (err, files) => {
            if (err) {
                return resolve(recordList);
            }

            // Percorrer a lista de objetos de forma assíncrona
            for (const record of recordList) {
                // Verificar se algum arquivo corresponde ao record_id
                const matchingFile = files.find(file => file.includes(record.record_id));
                
                // Se encontrar uma correspondência, atribuir o nome do arquivo ao record_id
                if (matchingFile) {
                    record.record_link = '/api/innovaphone/recordings/' + matchingFile;
                } else {
                    record.record_link = '';
                }
            }

            // Retornar a lista editada
            return resolve(recordList);
        });
    });
}
/**
 * Retorna o arquivo de audio para um record_id
 * @param {string} record_id - Id da gravação 
 * @returns {Promise<string|null>} Nome do arquivo ou null 
 */
export async function returnRecordFileByRecordId(record_id) {
    return new Promise((resolve, reject) => {
        const outputDirectory = path.join(__dirname, '../httpfiles/recordings');
        // Ler todos os arquivos do diretório de saída
        fs.readdir(outputDirectory, (err, files) => {
            if (err) {
                return resolve(null);
            }

            // Verificar se algum arquivo corresponde ao record_id
            const matchingFile = files.find(file => file.includes(record_id));
                
            // Se encontrar uma correspondência, atribuir o nome do arquivo ao record_id
            if (matchingFile) {
                return resolve('./httpfiles/recordings/'+matchingFile);
            }
            return resolve(null);
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

/**
 * Realiza o split na string, obtém o índice 0 e consulta no model Call
 * @param {string} inputString - A string a ser processada (ex: "12345-abc-def")
 * @returns {Promise<Object|null>} - Objeto encontrado ou null se não houver correspondência
 */
async function updateUserHistoryByRecordFilename(inputString) {
    try {
        log(`innovaphoneController:updateUserHistoryByRecordFilename: filename ${inputString}`)
        // Realiza o split da string pelo '-'
        const parts = inputString.split('-');
        log(`innovaphoneController:updateUserHistoryByRecordFilename: record_id ${parts[0]}`)
        // Obtém o valor do índice 0
        const recordId = parts[0];

        // Consulta no model Call onde record_id é igual ao valor do índice 0
        const call = await db.call.findOne({
            where: {
                record_id: recordId, // Ajuste o campo conforme o modelo
            },
        });
        log(`innovaphoneController:updateUserHistoryByRecordFilename: call ID ${call.id}`)
        // Retorna o objeto encontrado ou null se não houver correspondência

        let activity = await db.activity.findOne({where:{
            details: call.id
        }})
        let activityJSON =  activity.toJSON();
        let callJSON =  call.toJSON();
        log(`innovaphoneController:updateUserHistoryByRecordFilename: activity ID ${activity.id}`)
        await returnRecordLink([callJSON])
            .then(async(result) =>{
                log(`innovaphoneController:updateUserHistoryByRecordFilename:returnRecordLink: record_link ${result[0].record_link}`)
                activityJSON.details = result[0];
                send(activity.guid, { api: "user", mt: "getHistoryResult", result: [activityJSON] });
            })
            .catch(async(e)=>{
                log(`innovaphoneController:updateUserHistoryByRecordFilename:returnRecordLink: error ${e}`)
                send(activity.guid, { api: "user", mt: "getHistoryResult", result: [activityJSON] });
            })
        return call;
    } catch (error) {
        log('innovaphoneController:updateUserHistoryByRecordFilename: Erro ao buscar o registro:'+ error);
        throw error; // Lança o erro para ser tratado pelo chamador
    }
}
