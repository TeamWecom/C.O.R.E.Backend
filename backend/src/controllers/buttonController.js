import { send } from '../managers/webSocketManager.js';
import { getDateNow } from '../utils/getDateNow.js';
import {sendHttpPostRequest} from '../managers/httpClient.js';
import {log} from '../utils/log.js';
import db from '../managers/databaseSequelize.js'
import { triggerActionByStartType } from './actionController.js';
import path from 'path';
import process from 'process';
import configFile from '../config/config.js';
import { config as dotenvConfig } from 'dotenv';
import { QueryTypes, Op } from 'sequelize';
import {innovaphoneMakeCall, 
    innovaphoneHeldCall, 
    innovaphoneRetrieveCall, 
    innovaphoneClearCall, 
    innovaphoneRedirectCall, 
    innovaphoneDtmfCall,
    innovaphonePassiveRCCMonitor,
    innovaphonePassiveRCCMonitorEnd,
    innovaphoneConnectCall,
    innovaphoneClearIncomingCall,
    innovaphoneHeldIncomingCall,
    innovaphoneRetrieveIncomingCall,
    innovaphoneRedirectIncomingCall,
    innovaphoneDtmfIncomingCall,
    pbxTableUsers
} from '../controllers/innovaphoneController.js';
dotenvConfig();

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getDevices } from './milesightController.js';
import { listCalendars, getOngoingEventGuests } from '../managers/googleCalendarManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = configFile[env];

export const rccMonitor = async (guid) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        
        const user = await db.user.findOne({
            where: {
                guid: guid
            }
        })

        
        log("buttonController:rccMonitor: pbxType " + pbxType.value);
        if(pbxType.value && pbxType.value == 'INNOVAPHONE'){
            
            return await innovaphonePassiveRCCMonitor(user)
        }
        if(pbxType.value && pbxType.valuel == 'EPYGI'){                                    
            // if(pbxConfig.customHeaders){
            //     httpClient.setCustomHeaders(pbxConfig.customHeaders)
            // }
            
            // var post = await sendHttpPostRequest(pbxType.vl, {
            //     restPeerIP: pbxConfig.restPeerIP,
            //     cmd: "CreateCall",
            //     username: pbxConfig.usernameEpygi, //Ramal virtual para controle das chamadas com 3PCC habilitado.
            //     password: pbxConfig.passwordEpygi, //Senha do ramal virtual
            //     displayName: "REST 3PCC 120",
            //     restCallID: result.id, //"7325840796693965112"
            //     ownerID: "REST Req2Call",
            //     sipUsername: "EmergencyS", //Nome mostrado durante o ring
            //     callSource: device,
            //     callDestination: prt
            //     },pbxType.vl)
            // log("danilo-req MakeCall: httpService.sendHttpPostRequest success "+post);
            // return post
        }
    }catch(e){
        log("danilo-req rccMonitor: error " + e)
        return e
    }  
}
export const rccMonitorEnd = async (guid) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        
        const user = await db.user.findOne({
            where: {
                guid: guid
            }
        })

        
        log("buttonController:rccMonitorEnd: pbxType " + pbxType.value);
        if(pbxType.value && pbxType.value == 'INNOVAPHONE'){
            
            return await innovaphonePassiveRCCMonitorEnd(user)
        }
        if(pbxType.value &&pbxType.valuel == 'EPYGI'){                                    
            // if(pbxConfig.customHeaders){
            //     httpClient.setCustomHeaders(pbxConfig.customHeaders)
            // }
            
            // var post = await sendHttpPostRequest(pbxType.vl, {
            //     restPeerIP: pbxConfig.restPeerIP,
            //     cmd: "CreateCall",
            //     username: pbxConfig.usernameEpygi, //Ramal virtual para controle das chamadas com 3PCC habilitado.
            //     password: pbxConfig.passwordEpygi, //Senha do ramal virtual
            //     displayName: "REST 3PCC 120",
            //     restCallID: result.id, //"7325840796693965112"
            //     ownerID: "REST Req2Call",
            //     sipUsername: "EmergencyS", //Nome mostrado durante o ring
            //     callSource: device,
            //     callDestination: prt
            //     },pbxType.vl)
            // log("danilo-req MakeCall: httpService.sendHttpPostRequest success "+post);
            // return post
        }
    }catch(e){
        log("danilo-req rccMonitorEnd: error " + e)
        return e
    }  
}
export const connectCall = async (guid, device, call) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        
        const user = await db.user.findOne({
            where: {
                guid: guid
            }
        })

        
        log("buttonController:connectCall: pbxType " + pbxType.value);
        if(pbxType.value == 'INNOVAPHONE'){
            
            return await innovaphoneConnectCall(user, device, call)
        }
        if(pbxType.valuel == 'EPYGI'){                                    
            // if(pbxConfig.customHeaders){
            //     httpClient.setCustomHeaders(pbxConfig.customHeaders)
            // }
            
            // var post = await sendHttpPostRequest(pbxType.vl, {
            //     restPeerIP: pbxConfig.restPeerIP,
            //     cmd: "CreateCall",
            //     username: pbxConfig.usernameEpygi, //Ramal virtual para controle das chamadas com 3PCC habilitado.
            //     password: pbxConfig.passwordEpygi, //Senha do ramal virtual
            //     displayName: "REST 3PCC 120",
            //     restCallID: result.id, //"7325840796693965112"
            //     ownerID: "REST Req2Call",
            //     sipUsername: "EmergencyS", //Nome mostrado durante o ring
            //     callSource: device,
            //     callDestination: prt
            //     },pbxType.vl)
            // log("danilo-req MakeCall: httpService.sendHttpPostRequest success "+post);
            // return post
        }
    }catch(e){
        log("danilo-req connectCall: error " + e)
        return e
    }  
}
export const clearIncomingCall = async (guid, device, num) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        
        const user = await db.user.findOne({
            where: {
                guid: guid
            }
        })

        
        log("buttonController:connectCall: pbxType " + pbxType.value);
        if(pbxType.value == 'INNOVAPHONE'){
            
            return await innovaphoneClearIncomingCall(user, device, num)
        }
        if(pbxType.valuel == 'EPYGI'){                                    
            // if(pbxConfig.customHeaders){
            //     httpClient.setCustomHeaders(pbxConfig.customHeaders)
            // }
            
            // var post = await sendHttpPostRequest(pbxType.vl, {
            //     restPeerIP: pbxConfig.restPeerIP,
            //     cmd: "CreateCall",
            //     username: pbxConfig.usernameEpygi, //Ramal virtual para controle das chamadas com 3PCC habilitado.
            //     password: pbxConfig.passwordEpygi, //Senha do ramal virtual
            //     displayName: "REST 3PCC 120",
            //     restCallID: result.id, //"7325840796693965112"
            //     ownerID: "REST Req2Call",
            //     sipUsername: "EmergencyS", //Nome mostrado durante o ring
            //     callSource: device,
            //     callDestination: prt
            //     },pbxType.vl)
            // log("danilo-req MakeCall: httpService.sendHttpPostRequest success "+post);
            // return post
        }
    }catch(e){
        log("danilo-req connectCall: error " + e)
        return e
    }  
}
export const makeCall = async (guid, btn_id, device, num) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })

        const user = await db.user.findOne({
            where: {
                guid: guid
            }
        })

        if(btn_id){

            //const callid = random.generateRandomBigInt(19);
            const btn = await db.button.findOne({
                where: {
                    id: btn_id
                }
            })

            if(btn.button_type == 'user'){
                const usersInn = await pbxTableUsers()
                const userInn = usersInn.filter(u => u.guid == btn.button_prt )[0]
                btn.button_prt = userInn.e164
            }
            if(btn.button_type == 'google_calendar'){
                btn.button_prt = num;
            }
            

            let result = await db.call.create({
                guid: guid,
                number: btn.button_prt,
                call_started: getDateNow(),
                status: 1,
                direction: "out",
                btn_id: btn.id,
                device: btn.button_device
            })
            log("buttonController:MakeCall: db.create.call success " + result.id);
            log("buttonController:MakeCall: pbxType " + pbxType.value);
            if(pbxType.value == 'INNOVAPHONE'){
                
                return await innovaphoneMakeCall(btn, user)
            }
            if(pbxType.valuel == 'EPYGI'){                                    
                // if(pbxConfig.customHeaders){
                //     httpClient.setCustomHeaders(pbxConfig.customHeaders)
                // }
                
                // var post = await sendHttpPostRequest(pbxType.vl, {
                //     restPeerIP: pbxConfig.restPeerIP,
                //     cmd: "CreateCall",
                //     username: pbxConfig.usernameEpygi, //Ramal virtual para controle das chamadas com 3PCC habilitado.
                //     password: pbxConfig.passwordEpygi, //Senha do ramal virtual
                //     displayName: "REST 3PCC 120",
                //     restCallID: result.id, //"7325840796693965112"
                //     ownerID: "REST Req2Call",
                //     sipUsername: "EmergencyS", //Nome mostrado durante o ring
                //     callSource: device,
                //     callDestination: prt
                //     },pbxType.vl)
                // log("danilo-req MakeCall: httpService.sendHttpPostRequest success "+post);
                // return post
            }
        }else{
            let result = await db.call.create({
                guid: guid,
                number: num,
                call_started: getDateNow(),
                status: 1,
                direction: "out",
                device: device
            })
            log("buttonController:MakeCall: db.create.call success " + result.id);
            log("buttonController:MakeCall: pbxType " + pbxType.value);
            if(pbxType.value == 'INNOVAPHONE'){
                
                return await innovaphoneMakeCall(null, user, device, num)
            }
            if(pbxType.valuel == 'EPYGI'){  

            }

        }
        
        
    }catch(e){
        log("danilo-req MakeCall: error " + e)
        return e
    }  
}
export const heldCall = async (guid, btn_id, device, call) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        const user = await db.user.findOne({
            where: {
                guid: guid
            }
        })

        if(btn_id){
            //const callid = random.generateRandomBigInt(19);
            const btn = await db.button.findOne({
                where: {
                    id: btn_id
                }
            })
            

            let call = await db.call.findOne({
                where: {
                guid: guid,
                number: btn.button_prt,
                status: 1
                },
                order: [
                ['id', 'DESC']
                ]
            });

            log("buttonController:HeldCall: call.id " + call.id);
            log("buttonController:HeldCall: pbxType " + pbxType.value);
            if(pbxType.value == 'INNOVAPHONE'){
                
                return await innovaphoneHeldCall(btn, user)
            }
            if(pbxType.valuel == 'EPYGI'){                                    
            }

        }else{
            log("buttonController:HeldCall: pbxType " + pbxType.value);
            if(pbxType.value == 'INNOVAPHONE'){
                
                return await innovaphoneHeldCall(null, user, device, call)
            }
            if(pbxType.valuel == 'EPYGI'){                                    
            }

        }
        
    }catch(e){
        log("danilo-req HeldCall: error " + e)
        return e
    }  
}
export const heldIncomingCall = async (guid, device, num, call) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        //const callid = random.generateRandomBigInt(19);
        const user = await db.user.findOne({
            where: {
                guid: guid
            }
        })

        log("buttonController:HeldCall: pbxType " + pbxType.value);
        if(pbxType.value == 'INNOVAPHONE'){
            
            return await innovaphoneHeldIncomingCall(user, device, num, call)
        }
        if(pbxType.valuel == 'EPYGI'){                                    
        }
    }catch(e){
        log("danilo-req HeldCall: error " + e)
        return e
    }  
}
export const retrieveCall = async (guid, btn_id, device, call) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        const user = await db.user.findOne({
            where: {
                guid: guid
            }
        })
        if(btn_id){
            //const callid = random.generateRandomBigInt(19);
            const btn = await db.button.findOne({
                where: {
                    id: btn_id
                }
            })
            

            let call = await db.call.findOne({
                where: {
                guid: guid,
                number: btn.button_prt,
                status: 1
                },
                order: [
                ['id', 'DESC']
                ]
            });

            log("buttonController:RetrieveCall: call.id " + call.id);
            log("buttonController:RetrieveCall: pbxType " + pbxType.value);
            if(pbxType.value == 'INNOVAPHONE'){
                
                return await innovaphoneRetrieveCall(btn, user)
            }
            if(pbxType.valuel == 'EPYGI'){                                    
            }
        }else{
            log("buttonController:RetrieveCall: pbxType " + pbxType.value);
            if(pbxType.value == 'INNOVAPHONE'){
                
                return await innovaphoneRetrieveCall(null, user, device, call)
            }
            if(pbxType.valuel == 'EPYGI'){                                    
            }
        }
    }catch(e){
        log("danilo-req HeldCall: error " + e)
        return e
    }  
}
export const retrieveIncomingCall = async (guid, device, num, call) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        //const callid = random.generateRandomBigInt(19);
        const user = await db.user.findOne({
            where: {
                guid: guid
            }
        })
        log("buttonController:retrieveIncomingCall: pbxType " + pbxType.value);
        if(pbxType.value == 'INNOVAPHONE'){
            
            return await innovaphoneRetrieveIncomingCall(user, device, num, call)
        }
        if(pbxType.valuel == 'EPYGI'){                                    
        }
    }catch(e){
        log("danilo-req HeldCall: error " + e)
        return e
    }  
}
export const redirectCall = async (guid, btn_id, destination, device, call) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        const user = await db.user.findOne({
            where: {
                guid: guid
            }
        })
        if(btn_id){
            //const callid = random.generateRandomBigInt(19);
            const btn = await db.button.findOne({
                where: {
                    id: btn_id
                }
            })
            

            let call = await db.call.findOne({
                where: {
                guid: guid,
                number: btn.button_prt,
                status: 1
                },
                order: [
                ['id', 'DESC']
                ]
            });

            log("buttonController:redirectCall: call.id " + call.id);
            log("buttonController:redirectCall: pbxType " + pbxType.value);
            if(pbxType.value == 'INNOVAPHONE'){
                
                return await innovaphoneRedirectCall(btn, user, destination)
            }
            if(pbxType.valuel == 'EPYGI'){                                    
            }
        }else{
            log("buttonController:redirectCall: pbxType " + pbxType.value);
            if(pbxType.value == 'INNOVAPHONE'){
                
                return await innovaphoneRedirectCall(null, user, destination, device, call)
            }
            if(pbxType.valuel == 'EPYGI'){                                    
            }
        }
    }catch(e){
        log("danilo-req redirectCall: error " + e)
        return e
    }  
}
export const redirectIncomingCall = async (guid, device, call, destination) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        const user = await db.user.findOne({
            where: {
                guid: guid
            }
        })
        log("buttonController:redirectIncomingCall: pbxType " + pbxType.value);
        if(pbxType.value == 'INNOVAPHONE'){
            
            return await innovaphoneRedirectIncomingCall(user, device, call, destination)
        }
        if(pbxType.valuel == 'EPYGI'){                                    
        }
    }catch(e){
        log("danilo-req redirectIncomingCall: error " + e)
        return e
    }  
}
export const dtmfCall = async (guid, btn_id, digit, device, call) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        const user = await db.user.findOne({
            where: {
                guid: guid
            }
        })
        if(btn_id){
            //const callid = random.generateRandomBigInt(19);
            const btn = await db.button.findOne({
                where: {
                    id: btn_id
                }
            })
            

            let call = await db.call.findOne({
                where: {
                guid: guid,
                number: btn.button_prt,
                status: 1
                },
                order: [
                ['id', 'DESC']
                ]
            });

            log("buttonController:dtmfCall: call.id " + call.id);
            log("buttonController:dtmfCall: pbxType " + pbxType.value);
            if(pbxType.value == 'INNOVAPHONE'){
                
                return await innovaphoneDtmfCall(btn, user, digit)
            }
            if(pbxType.valuel == 'EPYGI'){                                    
            }
        }else{
            log("buttonController:dtmfCall: pbxType " + pbxType.value);
            if(pbxType.value == 'INNOVAPHONE'){
                
                return await innovaphoneDtmfCall(btn, user, digit, device, call)
            }
            if(pbxType.valuel == 'EPYGI'){                                    
            }

        }
        
    }catch(e){
        log("danilo-req dtmfCall: error " + e)
        return e
    }  
}
export const dtmfIncomingCall = async (guid, device, call, digit) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        const user = await db.user.findOne({
            where: {
                guid: guid
            }
        })
        log("buttonController:dtmfCall: pbxType " + pbxType.value);
        if(pbxType.value == 'INNOVAPHONE'){
            
            return await innovaphoneDtmfIncomingCall(user, device, call, digit)
        }
        if(pbxType.valuel == 'EPYGI'){                                    
        }
    }catch(e){
        log("danilo-req dtmfCall: error " + e)
        return e
    }  
}
export const clearCall = async (guid, btn_id, device, call) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        const user = await db.user.findOne({
            where: {
                guid: guid
            }
        })
        if(btn_id){
            const btn = await db.button.findOne({
                where: {
                    id: btn_id
                }
            })
            
    
            let callInCurse = await db.call.findOne({
                where: {
                  guid: guid,
                  btn_id: btn.id,
                  status: 1
                },
                order: [
                  ['id', 'DESC']
                ]
              });
    
            const callToUpdateResult = await db.call.update(
                { call_ended: getDateNow(),
                    status: 3
                 }, // Valores a serem atualizados
                { where: { id: parseInt(callInCurse.id) } } // Condição para atualização
              );
              log("buttonController:ClearCall::callToUpdateResult "+callToUpdateResult)
            if(pbxType.value === 'INNOVAPHONE'){
                return await innovaphoneClearCall(btn, user);
    
            }
            if(pbxType.value === 'EPYGI'){                                    
                // if(pbxConfig.customHeaders){
                //     httpClient.setCustomHeaders(pbxConfig.customHeaders)
                // }
                // sendHttpPostRequest(pbxType.vl, {
                //     restPeerIP: pbxType.restPeerIP,
                //     cmd: "EndCall",
                //     username: pbxType.usernameEpygi, //Ramal virtual para controle das chamadas com 3PCC habilitado.
                //     password: pbxType.passwordEpygi, //Senha do ramal virtual
                //     restCallID: call.id, //"7325840796693965112"
                //     ownerID: "REST Req2Call",
                //     },pbxType.vl)
                //     .then(async function(res){
                        
                //         log("danilo-req ClearCall: httpService.sendHttpPostRequest success"+res);
                //         return res
                       
                //     })
                //     .catch (function (error, errorText, dbErrorCode) {
                //         log("danilo-req CleaCall: httpService.sendHttpPostRequest error " + errorText);
                //         return errorText
                //     });
                
            }

        }else{
            let callInCurse = await db.call.findOne({
                where: {
                  guid: guid,
                  call_innovaphone: call,
                  device: device,
                  status: 1,
                },
                order: [
                  ['id', 'DESC']
                ]
              });
              
            if(callInCurse){
                const callToUpdateResult = await db.call.update(
                    { call_ended: getDateNow(),
                        status: 3
                     }, // Valores a serem atualizados
                    { where: { id: parseInt(callInCurse.id) } } // Condição para atualização
                );
                log("buttonController:clearCall:callToUpdateResult "+callToUpdateResult)
            }
            if(pbxType.value === 'INNOVAPHONE'){
                return await innovaphoneClearCall(null, user, device, call);
    
            }
            if(pbxType.value === 'EPYGI'){
                
            }

        }
        
        
    }catch(e){
        log("buttonController:ClearCall: error " + e)
        return e
    }
}
export const comboManager = async (combo, guid, mt) => {
    try{
        let result = 0;
        const buttons = await db.button.findAll({
            where: {
                button_user: guid
            }
        });
        const comboButton = buttons.find(button => button.id == combo);
        log("result combo_button=" + JSON.stringify(comboButton));


        if(comboButton.button_type_1.length>0){
            const btn_1 = buttons.find(button => button.id == comboButton.button_type_1)
            log("result combo_button=type1 " + btn_1.button_name);
            if(send(guid, { api: "user", mt: "ComboStartButton", btn_id: btn_1.id, type: btn_1.button_type })){
                result += 1;
            }
        }
        if(comboButton.button_type_2.length>0){
            const btn_2 = buttons.find(button => button.id == comboButton.button_type_2)
            log("result combo_button=type2 " + btn_2.button_name);
            if(send(guid, { api: "user", mt: "ComboStartButton", btn_id: btn_2.id, type: btn_2.button_type })){
                result += 1;
            }
        }
        if(comboButton.button_type_3.length>0){
            const btn_3 = buttons.find(button => button.id == comboButton.button_type_3)
            log("result combo_button=type3 " + btn_3.button_name);
            if(send(guid, { api: "user", mt: "ComboStartButton", btn_id: btn_3.id, type: btn_3.button_type })){
                result += 1;
            }
        }
        if(comboButton.button_type_4.length>0){
            const btn_4 = buttons.find(button => button.id == comboButton.button_type_4)
            log("result combo_button=type4 " + btn_4.button_name);
            if(send(guid, { api: "user", mt: "ComboStartButton", btn_id: btn_4.id, type: btn_4.button_type })){
                result += 1;
            }
        }
        return({ api: "user", mt: "ComboSuccessTrigged", src: combo, result: result });

    }catch(e){
        return({ api: "user", mt: "MessageError", result: String(e) })
    }

}
export const triggerAlarm = async (guid, btn) => {
    let triggerAlarmResult = 0;

    try{
        var actionResult = await triggerActionByStartType(guid, btn.button_prt, 'alarm')
        log("buttonController:triggerAlarm: triggerActionByStartType alarm result " + actionResult);

        const btns = await db.button.findAll({
            where: {
                button_prt: btn.button_prt,
                button_type: 'alarm',
                id: { [Op.ne]: parseInt(btn.id) } // Adiciona a condição de button_id diferente de id from
            }
        })
        log('buttonController:triggerAlarm: btns to notify '+ JSON.stringify(btns.length))
        btns.forEach(async (b)=>{
            log('buttonController:triggerAlarm: processing btn id '+ JSON.stringify(b))

            const sendResult = await send(b.button_user, { api: "user", mt: "AlarmReceived", btn_id: b.id})
            if(sendResult){triggerAlarmResult +=1}

            //intert into DB the event
            var msg = { 
                guid: b.button_user, 
                from: guid, 
                name: "alarm", 
                date: getDateNow(), 
                status: "inc", 
                details: b.id, 
                prt: b.button_prt, 
                min_threshold: b.sensor_min_threshold, 
                max_threshold: b.sensor_max_threshold, 
            }
            //log("buttonController:triggerAlarm: will insert it on DB : " + JSON.stringify(msg));
            let resultInsert = await db.activity.create(msg)
            resultInsert.details = b
            send(b.button_user, { api: "user", mt: "getHistoryResult", result: [resultInsert]});
            //Create Alarmed Buton
            let obj = {from:guid, prt: b.button_prt, date: getDateNow(), btn_id:b.id}
            const insertedAlarm = await db.activeAlarms.create(obj)
            log('buttonController:triggerAlarm: activeAlarm create result id ' + insertedAlarm.id)
        })

        //intert into DB the event
        var msg = { 
            guid: btn.button_user, 
            from: guid, 
            name: "alarm", 
            date: getDateNow(), 
            status: "start", 
            details: btn.id, 
            prt: btn.button_prt, 
            min_threshold: btn.sensor_min_threshold, 
            max_threshold: btn.sensor_max_threshold 
        }
        let resultActivityMyself = await db.activity.create(msg)
        resultActivityMyself.details = btn

        log("webSocketController:: will insert it on DB : " + JSON.stringify(resultActivityMyself.id));
        send(btn.button_user, { api: "user", mt: "getHistoryResult", result: [resultActivityMyself]});
       
        const sendResult = await send(btn.button_user, { api: "user", mt: "AlarmReceived", btn_id: btn.id})
        if(sendResult){triggerAlarmResult +=1}

        //Create Alarmed Buton
        let obj = {from:guid, prt: btn.button_prt, date: getDateNow(), btn_id: btn.id}
        const result = await db.activeAlarms.create(obj)
        log('buttonController:triggerAlarm: activeAlarm create result id ' + result.id)
        
        return triggerAlarmResult
    }catch(e){
        log('buttonController:triggerAlarm: error '+ e)
        return false
    }

}
export const triggerStopAlarm = async (guid, btn) => {
    let triggerStopAlarmResult = 0;

    try{

        //Alarmes
        const btns = await db.button.findAll({
            where: {
                button_prt: btn.button_prt,
                button_type: {
                    [Op.or]: ['alarm', 'flic']
                }
            }
        })
        log('buttonController:TriggerStopAlarm: alarm btns '+ JSON.stringify(btns.length))
        btns.forEach(async (b)=>{
            log('buttonController:TriggerStopAlarm: alarm btn '+ JSON.stringify(b.id))

            const sendResult = await send(b.button_user, { api: "user", mt: "AlarmStopReceived", alarm: b.button_prt, btn_id: b.id })
            if(sendResult){triggerStopAlarmResult +=1}

            //intert into DB the event
            var msg = { 
                guid: b.button_user, 
                from: guid, 
                name: b.button_type == 'alarm' ? b.button_type : 'button', 
                date: getDateNow(), 
                status: "stop", 
                details: b.id, 
                prt: b.button_prt, 
                min_threshold: b.sensor_min_threshold, 
                max_threshold: b.sensor_max_threshold
            }
            //log("buttonController:: will insert it on DB : " + JSON.stringify(msg));
            let resultInsert = await db.activity.create(msg)
            resultInsert.details = b
            send(b.button_user, { api: "user", mt: "getHistoryResult", result: [resultInsert]});
            //Destroy Active alarms
            let result = await db.activeAlarms.destroy({
                where: {
                btn_id: parseInt(b.id),
                },
            });
            log('buttonController:TriggerStopAlarm: activeAlarm destroy result '+ result)
        })
        //Sensores
        const phisicalButtons = await db.button.findAll({
            where: {
                button_prt: btn.button_prt,
                sensor_type: btn.sensor_type,
                button_device: btn.button_device,
                button_type: 'sensor'
            }
        })
        log('buttonController:TriggerStopAlarm: phisicalButtons '+ JSON.stringify(phisicalButtons.length))
        phisicalButtons.forEach(async (b)=>{
            log('buttonController:TriggerStopAlarm: phisicalButton '+ JSON.stringify(b.id))

            const sendResult = await send(b.button_user, { api: "user", mt: "AlarmStopReceived", alarm: b.sensor_type, btn_id: b.id })
            if(sendResult){triggerStopAlarmResult +=1}

            //intert into DB the event
            var msg = { 
                guid: b.button_user, 
                from: guid, 
                name: "button", 
                date: getDateNow(), 
                status: "stop", 
                details: b.id, 
                prt: b.sensor_type+'_'+b.button_device, 
                min_threshold: b.sensor_min_threshold, 
                max_threshold: b.sensor_max_threshold
            }
            //log("webSocketController:: will insert it on DB : " + JSON.stringify(msg));
            let resultInsert = await db.activity.create(msg)
            resultInsert.details = b
            send(b.button_user, { api: "user", mt: "getHistoryResult", result: [resultInsert]});
            //Destroy Active alarms
            let result = await db.activeAlarms.destroy({
                where: {
                btn_id: parseInt(b.id),
                },
            });
            log('buttonController:TriggerStopAlarm: activeAlarm destroy result '+ result)
        })
        return triggerStopAlarmResult
    }catch(e){
        log('buttonController:TriggerStopAlarm: error '+ e)
        return false
    }

}
export const selectButtons = async (guid, api) => {
    let result
    if(api=="user"){
        log("buttonController::SelectButtons: " + guid)
        result = await db.button.findAll({
            where: {
              button_user: guid // Filtra os botões pelo valor do campo button_user igual ao valor de guid
            }
          });
        log("buttonController::SelectButtons: result= " + result.length + " buttons for user "+guid);
    }else{
        log("buttonController::SelectButtons: all")
        result = await db.button.findAll();
        log("buttonController::SelectButtons: result= " + result.length + " buttons for all user");
    }
    const buttons = await Promise.all(result.map(async (b) => b.toJSON()));

    // Executa a função `updateButtonNameGoogleCalendar` para cada botão
    const updatedButtons = await Promise.all(
        buttons.map(async (button) => await updateButtonNameGoogleCalendar(button))
    );


    send(guid,{ api: api, mt: "SelectButtonsSuccess", result: updatedButtons});
    
    //Aproveitamos para enviar a lista de alarmes ativos que estejam entre os botões desse usuário
    getActiveAlarmHistory(guid)

    //Aproveitamos para enviar a lista de status dos controllers que estejam entre os botões desse usuário
    getControllerStatusByGuid(guid, result)
}
export const updateButtonPrtGoogleCalendar = async (bJSON, sip) => {
    try{
        const innoUsers = await pbxTableUsers();

        const userInno = innoUsers.find((u) => u.sip == sip)
        log('buttonController:updateButtonPrtGoogleCalendar: userInno '+ JSON.stringify(userInno));
        if(userInno){ 
            bJSON.button_prt = userInno.guid;
            const objToUpdateResult = await db.button.update(bJSON,
                {
                where: {
                    id: parseInt(bJSON.id),
                },
            });
        }
        return bJSON;
    }catch(e){
        return bJSON;
    }
    
}
export const updateButtonNameGoogleCalendar = async (button) => {
    try {
      // Verifica se o botão é do tipo "google_calendar"
      if (button.button_type === "google_calendar") {
        const calendars = await listCalendars(); // Lista os calendários uma vez
        const calendar = calendars.find((c) => c.id === button.calendar_id);
        if (calendar) {
          button.button_name = calendar.summary; // Atualiza o nome do botão
          const guests = await getOngoingEventGuests(calendar.id);
          if(guests.length > 0){
            log(`butonController:updateButtonNameGoogleCalendar: ${guests.length} guests for button google_calendar ${button.button_name}`);
            const sip = guests[0].email.split('@')[0];
            button = await updateButtonPrtGoogleCalendar(button, sip);
          }else{
            log(`butonController:updateButtonNameGoogleCalendar: no guests for button google_calendar ${button.button_name}`);
          }
        }
      }
      return button; // Retorna o botão atualizado
    } catch (e) {
      log(
        "buttonController:updateButtonNameGoogleCalendar: Erro ao atualizar o botão: " +
          e
      );
      return button; // Retorna o botão original em caso de erro
    }
  };
  
  
export const getActiveAlarmHistory = async (guid) => {
    let activeAlarms = await db.activeAlarms.findAll();
    log("alarmController::getActiveAlarmHistory result activeAlarms= " + activeAlarms.length+ " for user guid "+guid);
    let query = `
        SELECT 
          list_buttons.*, 
          MAX(list_active_alarms.date) AS date,
          MAX(list_active_alarms.from) as from
        FROM 
          list_buttons
        INNER JOIN 
          list_active_alarms
        ON 
          list_buttons.id = list_active_alarms.btn_id
          AND
          list_buttons.button_user = '${guid}'
          GROUP BY
          list_buttons.id
        `;
    let result = await db.sequelize.query(query, {
        type: QueryTypes.SELECT
    });

    log("alarmController::getActiveAlarmHistory result= " + result.length + " buttons with alarm active for user "+guid);
    result.forEach(async function(b){
        send(guid, { api: "user", mt: "AlarmReceived", btn_id: b.id})
    })
}
export const getControllerStatusByGuid = async (guid, buttons) => {
    const commandButtons = buttons.filter(button => button.button_type === 'command');
    commandButtons.forEach(async function(b){
        const value = await db.iotDevicesHistory.findOne({
            attributes: [b.button_prt],
            where:{
                deveui: b.button_device
            },
            order: [['id', 'desc']],
            limit: 1,
        })

        // Garante que value existe antes de acessar a propriedade
        const propertyValue = value ? value[b.button_prt] : null;
        send(guid, {api:"user", mt:"ControllerReceived", btn_id:b.id, prt:b.button_prt, value: propertyValue})
    })
    log("buttonController::getControllerStatusByGuid result= " + commandButtons.length + " controller buttons for user " + guid);

}
export const thresholdManager = async (obj) => {
    try{
        const sensorsButtons = await db.button.findAll({
            where: {
                button_prt: obj.deveui
            }
        });
        // Verificar se os valores recebidos estão fora dos limites definidos nos botões
        const alarmed_buttons = verificarThresholds(obj, sensorsButtons);
        log("buttonsController:thresholdManager: alarmed buttons " + alarmed_buttons.length);

        // Buscar todos os alarmes ativos de uma vez
        const activeAlarms = await db.activeAlarms.findAll({
        where: {
            btn_id: sensorsButtons.map(b => b.id)  // Busca por todos os botões
        }
        });

        // Converter a lista de alarmes ativos em um Set para fácil acesso
        const activeAlarmSet = new Set(activeAlarms.map(alarm => alarm.btn_id));

        // Lógica para botões que estão com o threshold atingido (ativar alarme)
        alarmed_buttons.forEach(async (b) => {
            if (!activeAlarmSet.has(b.id)) {
                // Este foi o primeiro evento que atingiu o threshold para esse botão
                const objAlarm = { from: obj.deveui, prt: b.sensor_type, date: getDateNow(), btn_id: b.id };
                await db.activeAlarms.create(objAlarm);

                const objActivity = {
                    guid: b.button_user, 
                    from: obj.deveui, 
                    name: 'threshold', 
                    date: getDateNow(), 
                    status: 'start', 
                    prt: obj[b.sensor_type], 
                    details: b.id, 
                    min_threshold: b.sensor_min_threshold, 
                    max_threshold: b.sensor_max_threshold 
                };
                let resultInsert = await db.activity.create(objActivity);
                // Notificar o usuário do novo alarme
                send(b.button_user, { api: 'user', mt: 'AlarmReceived', notification: [resultInsert], btn_id: b.id });
                
                resultInsert.details = b
                send(b.button_user, { api: "user", mt: "getHistoryResult", result: [resultInsert]});
           
                // Adicionar o botão ao conjunto de alarmes ativos
                activeAlarmSet.add(b.id);
                log("buttonsController:thresholdManager: Notificado o usuário do novo alarme e Adicionado o botão ao conjunto de alarmes ativos");
            }
        });

        // Lógica para botões que voltaram ao estado normal (desativar alarme)
        sensorsButtons.forEach(async (b) => {
            if (!alarmed_buttons.some(alarm => alarm.id === b.id) && activeAlarmSet.has(b.id)) {
                // O botão estava ativo em alarmes mas agora está dentro dos thresholds
                await db.activeAlarms.destroy({
                where: {
                    btn_id: b.id
                }
                });
                const objActivity = {
                    guid: b.button_user, 
                    from: obj.deveui, 
                    name: 'threshold', 
                    date: getDateNow(), 
                    status: 'stop', 
                    prt: obj[b.sensor_type], 
                    details: b.id, //list_buttons.id para obter o botão que estourou o threshold
                    min_threshold: b.sensor_min_threshold, 
                    max_threshold: b.sensor_max_threshold 
                };
                let resultInsert = await db.activity.create(objActivity);
                
                // Notificar o usuário sobre o alarme removido
                send(b.button_user, { api: 'user', mt: 'AlarmStopReceived', notification: [resultInsert], alarm:b.button_prt, btn_id: b.id });
                
                resultInsert.details = b
                send(b.button_user, { api: "user", mt: "getHistoryResult", result: [resultInsert]});
           
                // Remover o botão do conjunto de alarmes ativos
                activeAlarmSet.delete(b.id);
                log("buttonsController:thresholdManager: Notificado o usuário do alarme removido e Removido o botão ao conjunto de alarmes ativos");
            }
        });
    }catch(e){
        log(`buttonController:thresholdManager: Error ${e}`)
    }
}
export const makeConference = async (guid, btn_id, calls) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        const user = await db.user.findOne({
            where: {
                guid: guid
            }
        })
        if(btn_id){
            const btn = await db.button.findOne({
                where: {
                    id: btn_id
                }
            })

            let localCalls = await db.call.findAll({
                where:{
                    guid: guid,
                    status: 1,
                    call_innovaphone: calls.map(c => c)  // Busca por todos os botões
                }
            });
            localCalls.forEach(async call => {
                log("buttonController:makeConference:redirectCall: call.id " + call.id);

                if(pbxType.value == 'INNOVAPHONE'){
                
                    await innovaphoneRedirectCall(null, user, btn.button_prt, call.device, call.call_innovaphone)
                }
                if(pbxType.valuel == 'EPYGI'){                                    
                }
            })
            

            let inConferenceCall = await db.call.findOne({
                where:{
                    guid: guid,
                    btn_id: btn_id,
                    status: 1,
                    call_ended: null
                }
            });
            if(inConferenceCall){
                // Já estou na chamada, apenas transferir a chamada para a conferencia
                log("buttonController:makeConference: finished redirects, I'm already at the conference " + btn.button_prt);
                    
            }else{
                //Ainda não estou nessa chamada, transferir e ligar
                log("buttonController:makeConference: finished redirects, now I will dial to the conference " + btn.button_prt);
                const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                await delay(1000); // Atraso de 1 segundos
                return await makeCall(guid, btn_id, btn.button_device, btn.button_prt)
                
            }
            
            
        }
    }catch(e){
        log("buttonController:makeConference: error " + e)
        return e
    }  
}
export const monitorGoogleCalendarCall = async (btn, guests, usersInn) => {
    try {
        log("buttonController:monitorGoogleCalendarCall: Iniciando monitoramento de chamadas...");
        
        // Função auxiliar para calcular o tempo decorrido em segundos
        const getElapsedTime = (startTime) => {
            const now = new Date();
            return Math.floor((now - new Date(startTime)) / 1000);
        };

        // Loop que verifica a cada 5 segundos
        const intervalId = setInterval(async () => {
            log("buttonController:monitorGoogleCalendarCall: Verificando chamadas...");

            // Buscar a chamada em andamento
            const callInCourse = await db.call.findOne({
                where: {
                    btn_id: btn.id,
                    status: 1, // Status 1 indica chamada em andamento
                },
            });

            // Verificar se existe uma chamada em andamento
            if (callInCourse) {
                log("buttonController:monitorGoogleCalendarCall: Chamada encontrada:"+ callInCourse.id);

                if (callInCourse.call_connected === null) {
                    const elapsedTime = getElapsedTime(callInCourse.call_started);

                    if (elapsedTime >= 30) {
                        log(
                            `buttonController:monitorGoogleCalendarCall: Chamada não conectada após ${elapsedTime} segundos. Processando...`
                        );
                        const userInn = usersInn.filter(u => u.e164 == callInCourse.number)[0]
                        if (userInn) {
                            log(`buttonController:monitorGoogleCalendarCall: Usuário correspondente encontrado: ${userInn.sip}`);

                            // Procurar o índice correspondente no array guests
                            const guestIndex = guests.findIndex(
                                (guest) => guest.email.split('@')[0] == userInn.sip
                            );

                            if (guestIndex !== -1) {
                                log(`buttonController:monitorGoogleCalendarCall: Índice correspondente no array guests: ${guestIndex}`);
                                if(guests.length-1 > guestIndex){
                                    const resultClear = await clearCall(btn.button_user, btn.id, btn.button_device, callInCourse.call_innovaphone);
                                    log("buttonController:monitorGoogleCalendarCall: clear old call result : " + JSON.stringify(resultClear));
                                    const newIndex = guestIndex+1;
                                    const newUserInn = usersInn.filter(u => u.sip == guests[newIndex].email.split('@')[0])[0]
                                    const resultMake = await makeCall(btn.button_user, btn.id, btn.button_device, newUserInn.e164);
                                    log("buttonController:monitorGoogleCalendarCall: start new call result : " + JSON.stringify(resultMake));
                                }else{
                                    log(`buttonController:monitorGoogleCalendarCall: Estamos Ligando para o último usuário da lista de Guests do Evento. Encerrando Loop`);
                                    clearInterval(intervalId); // Encerra o loop
                                }
                            } else {
                                log(`buttonController:monitorGoogleCalendarCall: Nenhum índice correspondente encontrado no array guests. Encerrando loop`);
                                clearInterval(intervalId); // Encerra o loop
                            }
                        } else {
                            log(`buttonController:monitorGoogleCalendarCall: Nenhum usuário correspondente encontrado em usersInn. Encerrando loop`);
                            clearInterval(intervalId);
                        }

                    } else {
                        log(
                            `buttonController:monitorGoogleCalendarCall: Chamada não conectada. Tempo decorrido: ${elapsedTime} segundos. Aguardando...`
                        );
                    }
                } else {
                    log("buttonController:monitorGoogleCalendarCall: Chamada conectada! Encerrando loop...");
                    clearInterval(intervalId); // Encerra o loop
                }
            } else {
                log("buttonController:monitorGoogleCalendarCall: Nenhuma chamada em andamento encontrada. Encerrando loop...");
                clearInterval(intervalId); // Encerra o loop
            }
        }, 5000); // Repetir a cada 5 segundos
    } catch (e) {
        log("buttonController:monitorGoogleCalendarCall: Erro no monitoramento de chamadas:"+ e);
    }
};


function verificarThresholds(data, buttons) {
    var ativos = [];
    //log("actionController:verificarAcoes:parameters data" + JSON.stringify(data))
    buttons.forEach(function (entry) {
        //log("actionController:verificarAcoes:entry" + JSON.stringify(entry))
        // Verifica se o nome do sensor corresponde
        if (entry.button_prt === data.deveui) {
            // Verifica se o tipo de sensor corresponde
            if (data.hasOwnProperty(entry.sensor_type)) {
                if(entry.sensor_type == 'wind_direction'){
                    var valuesMin = getDegreeRange(entry.sensor_min_threshold)
                    entry.sensor_min_threshold = valuesMin.min;
                    var valuesMax = getDegreeRange(entry.sensor_max_threshold)
                    entry.sensor_max_threshold = valuesMax.max;
                }
                var value = data[entry.sensor_type];
                // Verifica se o tipo de ação é max ou min
                if (entry.sensor_max_threshold != "" && value >= parseInt(entry.sensor_max_threshold)) {
                    entry.value = value;

                    ativos.push(entry);
                } else if (entry.sensor_min_threshold != "" && value <= parseInt(entry.sensor_min_threshold)) {

                    entry.value = value;
                    ativos.push(entry);
                }
            }
        }
    });
    log("milesightController:verificarThresholds:return "+ ativos.length +" buttons out of threshold!")
    return ativos;
}
function getDegreeRange(direction) {
    switch (direction) {
      case "N":
        return { min: 0, max: 22.5 };
      case "NE":
        return { min: 22.5, max: 67.5 };
      case "E":
        return { min: 67.5, max: 112.5 };
      case "SE":
        return { min: 112.5, max: 157.5 };
      case "S":
        return { min: 157.5, max: 202.5 };
      case "SW":
        return { min: 202.5, max: 247.5 };
      case "W":
        return { min: 247.5, max: 292.5 };
      case "NW":
        return { min: 292.5, max: 337.5 };
      default:
        return { min: 0, max: 0 };
    }
}

