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
import {innovaphoneMakeCall, innovaphoneClearCall} from '../controllers/innovaphoneController.js';
dotenvConfig();

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { combineTableNames } from 'sequelize/lib/utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = configFile[env];



export const MakeCall = async (guid, btn_id) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        //const callid = random.generateRandomBigInt(19);
        const btn = await db.button.findOne({
            where: {
                id: btn_id
            }
        })
        const user = await db.user.findOne({
            where: {
                guid: guid
            }
        })

        let result = await db.call.create({
            guid: guid,
            number: btn.button_prt,
            call_started: getDateNow(),
            status: 1,
            direction: "out"
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
    }catch(e){
        log("danilo-req MakeCall: error " + e)
        return e
    }  
}

export const ClearCall = async (guid, btn_id) => {
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        const btn = await db.button.findOne({
            where: {
                id: btn_id
            }
        })
        const user = await db.user.findOne({
            where: {
                guid: guid
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

        const callToUpdateResult = await db.call.update(
            { call_ended: getDateNow(),
                status: 3
             }, // Valores a serem atualizados
            { where: { id: parseInt(call.id) } } // Condição para atualização
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
        
    }catch(e){
        log("danilo-req ClearCall: error " + e)
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
    function comboDispatcher(button, guid, mt) {
        try{
            log("danilo-req comboDispatcher:button " + JSON.stringify(button));
            let result;
            switch (button.button_type) {
                case "alarm":
                    result = triggerActionByStartType(guid, button.button_prt, button.button_type)
                    sendMessage(guid, { api: "user", mt: "ComboAlarmStarted", alarm: button.button_prt, btn_id: button.id })
                    log("danilo-req comboDispatcher:alarm guid " + String(guid));

                    break;
                case "number":
                    result = MakeCall(guid,button.button_device, button.button_prt)
    
                    sendMessage(guid, { api: "user", mt: "ComboCallStart", src: guid, num: button.button_prt, btn_id: button.id } )
                    log("danilo-req comboDispatcher:number guid " + String(guid));
                    
                    break;
                case "dest":
                    result = MakeCall(guid,button.button_device, button.button_prt)
    
                    sendMessage(guid, { api: "user", mt: "ComboCallStart", src: guid, num: button.button_prt, btn_id: button.id } )
                    log("danilo-req comboDispatcher:dest guid " + String(guid));
    
                    // var foundConnectionUser = connectionsUser.filter(function (conn) { return conn.guid === button.button_user });
                    // log("danilo-req:comboDispatcher:found ConnectionUser for user Name " + foundConnectionUser[0].dn);
                    // var foundCall = calls.filter(function (call) { return call.guid === button.button_user && call.num === button.button_prt });
                    // log("danilo-req:comboDispatcher:found call " + JSON.stringify(foundCall));
                    // if (foundCall.length == 0) {
                    //     //log("danilo-req:comboDispatcher:found call for user " + foundCall[0].sip);
                    //     //RCC.forEach(function (rcc) {
                    //     //    var temp = rcc[String(foundConnectionUser[0].sip)];
                    //     //    if (temp != null) {
                    //     //        user = temp;
                    //     //        log("danilo-req:comboDispatcher:will call callRCC for user " + user + " Nome " + foundConnectionUser[0].dn);
                    //     //        callRCC(rcc, user, "UserCall", button.button_prt_user, foundConnectionUser[0].sip + "," + rcc.pbx);
                    //     //    }
                    //     //})
                    //     var info = JSON.parse(foundConnectionUser[0].info);
                    //     RCC.forEach(function (rcc) {
                    //         if (rcc.pbx == info.pbx) {
                    //             log("danilo req:comboDispatcher:guid " + foundConnectionUser[0].guid);
                    //             var msg = { api: "RCC", mt: "UserInitialize", cn: foundConnectionUser[0].dn, hw: button.button_device, src: foundConnectionUser[0].guid + "," + rcc.pbx + "," + button.button_device + "," + button.button_prt + "," + button.id };
                    //             log("danilo req:comboDispatcher: UserInitialize sent rcc msg " + JSON.stringify(msg));
                    //             rcc.sendMessage(JSON.stringify(msg));
                    //         }
                    //     })
                    //     connectionsUser.forEach(function (conn) {
                    //         log("danilo-req comboDispatcher:ComboCallStart conn.guid " + String(conn.guid));
                    //         log("danilo-req comboDispatcher:ComboCallStart button.button_user " + String(button.button_user));
                    //         if (String(conn.guid) == String(button.button_user)) {
                    //             conn.sendMessage(JSON.stringify({ api: "user", mt: "ComboCallStart", src: conn.guid, num: button.button_prt, btn_id: button.id }));
                    //         }
                    //     });
                    // }
                    break;
                case "user":
                    result = MakeCall(guid,button.button_device, button.button_prt)
    
                    sendMessage(guid, { api: "user", mt: "ComboCallStart", src: guid, num: button.button_prt, btn_id: button.id } )
                    log("danilo-req comboDispatcher:user guid " + String(guid));
                    // var foundConnectionUser = connectionsUser.filter(function (conn) { return conn.guid === guid });
                    // log("danilo-req:TypeUser comboDispatcher:found ConnectionUser for user Name " + foundConnectionUser[0].dn);
                    // var foundCall = calls.filter(function (call) { return call.guid == guid && call.num == button.button_prt });
                    // log("danilo-req:comboDispatcher:found call " + JSON.stringify(foundCall));
                    // if (foundCall.length == 0) {
                    //     var filterGuid = pbxTableUsers.filter(function(u){
                    //         return u.columns.guid == button.button_prt
                    //     })[0]
                    //     //log("danilo-req:comboDispatcher:found call for user " + foundCall[0].sip);
                    //     //RCC.forEach(function (rcc) {
                    //     //    var temp = rcc[String(foundConnectionUser[0].sip)];
                    //     //    if (temp != null) {
                    //     //        user = temp;
                    //     //        log("danilo-req:comboDispatcher:will call callRCC for user " + user + " Nome " + foundConnectionUser[0].dn);
                    //     //        callRCC(rcc, user, "UserCall", button.button_prt, foundConnectionUser[0].sip + "," + rcc.pbx);
                    //     //    }
                    //     //})
                    //     var info = JSON.parse(foundConnectionUser[0].info);
                    //     log("danilo req:comboDispatcher:info.pbx " + info.pbx);
                    //     RCC.forEach(function (rcc) {
                    //         if (rcc.pbx == info.pbx) {
                    //             log("danilo req:comboDispatcher:match pbx for guid user " + foundConnectionUser[0].guid);
                    //             var msg = { api: "RCC", mt: "UserInitialize", cn: foundConnectionUser[0].dn, hw: button.button_device, src: foundConnectionUser[0].guid + "," + rcc.pbx + "," + button.button_device + "," + filterGuid.columns.e164 + "," + button.id };
                    //             log("danilo req:comboDispatcher: UserInitialize sent rcc msg " + JSON.stringify(msg));
                    //             rcc.sendMessage(JSON.stringify(msg));
                    //         }
                    //     })
    
                    //     connectionsUser.forEach(function (conn) {
                    //         log("danilo-req type User comboDispatcher:ComboCallStart conn.sip " + String(conn.guid));
                    //         log("danilo-req comboDispatcher:ComboCallStart sip " + String(guid));
                    //         log("FilterGuid " + JSON.stringify(filterGuid))
                    //         if (String(conn.guid) == String(guid)) {
                    //             log("FilterGuid e164 " + filterGuid.columns.e164)
                    //             conn.sendMessage(JSON.stringify({ api: "user", mt: "ComboCallStart", src: conn.guid, num: filterGuid.columns.e164, btn_id: button.id }));
                    //         }
                    //     });
                    // }
                    break;
                default:
                    log("danilo-req comboDispatcher:page guid " + String(guid));
                    result = sendMessage(guid, { api: "user", mt: "PageRequest", name: button.button_name, alarm: button.button_prt, btn_id: button.id, type: button.button_type })
                    // connectionsUser.forEach(function (conn) {
                    //     if (String(conn.guid) == String(guid)) {
                    //         log("danilo-req comboDispatcher:page found conn.guid " + String(conn.guid));
                    //         conn.sendMessage(JSON.stringify({ api: "user", mt: "PageRequest", name: button.button_name, alarm: button.button_prt, btn_id: button.id, type: button.button_type }));
                    //     }
                    // });
                    break;
            }
            return result
        }catch(e){
            return e
        }
        
    }

}
export const TriggerAlarm = async (guid, prt, btn_id) => {
    let triggerAlarmResult = 0;

    try{
        let result;
        result = await triggerActionByStartType(guid, prt, 'alarm')
        const btns = await db.button.findAll({
            where: {
                button_prt: prt,
                button_type: 'alarm'
            }
        })
        log('TriggerAlarm: btns '+ JSON.stringify(btns))
        btns.forEach(async (b)=>{
            log('TriggerAlarm: btn '+ JSON.stringify(b))
            // connectionsUser.forEach(conn => {
            //     if (conn.guid === guid) {
            //         conn.send(JSON.stringify({ api: "user", mt: "AlarmReceived", alarm: b.button_prt, btn_id: b.id, src: guid }));
            //         triggerAlarmResult +=1
            //     }
            // });

            const sendResult = await send(b.button_user, { api: "user", mt: "AlarmReceived", alarm: b.button_prt, btn_id: b.id, src: guid, date: getDateNow() })
            if(sendResult){triggerAlarmResult +=1}
        })
        let obj = {from:guid, prt: prt, date: getDateNow(), btn_id:btn_id}
        result = await db.activeAlarms.create(obj)
        log('TriggerAlarm: activeAlarm create result ' + result)
        return triggerAlarmResult
    }catch(e){
        log('TriggerAlarm: error '+ e)
    }

}
export const TriggerStopAlarm = async (guid, prt) => {
    let triggerStopAlarmResult = 0;

    try{
        const btns = await db.button.findAll({
            where: {
                button_prt: prt,
                button_type: 'alarm'
            }
        })
        log('buttonController:TriggerStopAlarm: btns '+ JSON.stringify(btns))
        btns.forEach(async (b)=>{
            log('buttonController:TriggerStopAlarm: btn '+ JSON.stringify(b))
            // connectionsUser.forEach(conn => {
            //     if (conn.guid === guid) {
            //         conn.send(JSON.stringify({ api: "user", mt: "AlarmReceived", alarm: b.button_prt, btn_id: b.id, src: guid }));
            //         triggerAlarmResult +=1
            //     }
            // });

            const sendResult = await send(b.button_user, { api: "user", mt: "AlarmStopReceived", alarm: b.button_prt, btn_id: b.id, src: guid, date: getDateNow() })
            if(sendResult){triggerStopAlarmResult +=1}
        })

        let result = await db.activeAlarms.destroy({
            where: {
              prt: prt,
            },
          });
        log('buttonController:TriggerStopAlarm: activeAlarm destroy result '+ result)
        return triggerStopAlarmResult
    }catch(e){
        log('uttonController:TriggerStopAlarm: error '+ e)
    }

}


export const selectButtons = async (guid) => {
    log("buttonController::SelectButtons " + guid)
    let result = await db.button.findAll({
        where: {
          button_user: guid // Filtra os botões pelo valor do campo button_user igual ao valor de guid
        }
      });
    log("buttonController::SelectButtons result= " + result.length + " buttons for user "+guid);
    send(guid,{ api: "user", mt: "SelectButtonsSuccess", result: result});
    
    //Aproveitamos para enviar a lista de alarmes ativos que estejam entre os botões desse usuário
    getActiveAlarmHistory(guid)

    //Aproveitamos para enviar a lista de status dos controllers que estejam entre os botões desse usuário
    getControllerStatusByGuid(guid, result)
}

export const getActiveAlarmHistory = async (guid) => {
    let activeAlarms = await db.activeAlarms.findAll();
    log("buttonController::getActiveAlarmHistory result activeAlarms= " + JSON.stringify(activeAlarms, null, 4));
    let query = `
        SELECT 
          list_buttons.*, 
          list_active_alarms.date,
          list_active_alarms.from
        FROM 
          list_buttons
        INNER JOIN 
          list_active_alarms
        ON 
          list_buttons.button_prt = list_active_alarms.prt 
          AND 
          list_buttons.button_user = '${guid}'
        `;
    let result = await db.sequelize.query(query, {
        type: QueryTypes.SELECT
    });

    log("buttonController::getActiveAlarmHistory result= " + result.length + " buttons with alarm active for user "+guid);
    result.forEach(async function(b){
        send(guid, { api: "user", mt: "AlarmReceived", alarm: b.button_prt, btn_id: b.id, src: b.from, date: b.date })
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
        send(guid, {api:"user", mt:"ControllerReceived", btn_id:b.id, prt:b.button_prt, value:value[b.button_prt]})
    })
    log("buttonController::getControllerStatusByGuid result= " + commandButtons.length + " controller buttons for user " + guid);

}
