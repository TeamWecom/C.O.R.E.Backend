import { broadcast, send } from '../managers/webSocketManager.js';
import { getDateNow } from '../utils/getDateNow.js';
import {sendHttpPostRequest} from '../managers/httpClient.js';
//const ConfigModel = require('../models/configModel')
import db from '../managers/databaseSequelize.js';
import { log } from '../utils/log.js';
import { Op, where } from 'sequelize';
import fs from 'fs';
import path from 'path';
import process from 'process';
import configFile from '../config/config.js';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getDevices, TriggerCommand } from './milesightController.js';
import {innovaphoneMakeCall} from './innovaphoneController.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = configFile[env];


// Instanciação do modelo
//const configModel = new ConfigModel();

// Uso dos dados de configuração
const pbxConfig = config.pbxConfig;
//log(pbxConfig);

//const httpService = new HttpService();

export const triggerActionByStartType = async (from, prt, type) => {
    try {
        //Get Actions from DB
        const actions = await db.action.findAll({
            where: {
                action_start_type: type,
                action_start_prt: prt
            },
        })
        if (actions.length > 0) {
            log(`actionController:triggerActionByStartType: Match Actions: ${actions.length}`);
            
            const result = await resolveAction(from, actions)
            
            
            return result;
            
        }
        else {
            //log("actionController:triggerActionByStartType:actions is null " + JSON.stringify(actions));
            return actions.length;
        }


    }
    catch (e) {
        log("actionController:triggerActionByStartType: Try Body decode Erro " + e);
        return e;
    }
}
export const triggerActionBySensor = async (obj) => {
    try{
        const actionsBySensor = await db.action.findAll({
            where: {
                action_start_type: {
                    [Op.or]: ['maxValue', 'minValue']
                }
            }
        })
        // Chamada da função para verificar ações
        const acoesAplicaveis = verificarAcoes(obj, actionsBySensor);

        // Exibindo as ações aplicáveis
        if (acoesAplicaveis.length > 0) {
            log(`actionController:triggerActionBySensor: Match Actions: ${acoesAplicaveis.length}`);
            
            const result = await resolveAction(obj.sensor_name, acoesAplicaveis)
            return result;

            
        } else {
            //log("danilo-req triggerActionBySensor: Nenhuma ação aplicável encontrada.");
            return acoesAplicaveis.length;
        }

    }catch(e){
        return e;
    }
    
}
//
// Função para tratar as ações com base no JSON recebido
//
async function resolveAction(from, actions){
    try{
        actions.forEach(async function (ac) {
            log("actionController:resolveAction:ac " + JSON.stringify(ac.action_name));
            let insertActivityResult;
            
            switch (ac.action_exec_type) {
                case "alarm":
                    log("actionController:resolveAction: action type alarm");
                    // Ação tratada... Então insere o log no DB para Histórico
                    if(ac.action_user ==""){
                        const users = await db.user.findAll();
                        users.forEach(async u => {
                            var msg = { guid: u.guid, from: from, name: ac.action_exec_type, date: getDateNow(), status: "start", prt: ac.action_exec_prt, details: ac.id }
                            //log("actionController:resolveAction: will insert it on DB : " + JSON.stringify(msg));
                            insertActivityResult = db.activity.create(msg)
                            log("actionController:resolveAction: insertActivityResult: id " + JSON.stringify(insertActivityResult.id));
                            send(u.guid, { api: "user", mt: "getHistoryResult", result: [insertActivityResult] });
                        })

                    }else{
                        var msg = { guid: ac.action_user, from: from, name: ac.action_exec_type, date: getDateNow(), status: "start", prt: ac.action_exec_prt, details: ac.id }
                        //log("actionController:resolveAction: will insert it on DB : " + JSON.stringify(msg));
                        insertActivityResult = db.activity.create(msg)
                        log("actionController:resolveAction: insertActivityResult: id " + JSON.stringify(insertActivityResult.id));
                        send(ac.action_user, { api: "user", mt: "getHistoryResult", result: [insertActivityResult] });
                    }
                    break;
                case "number":
                    log("actionController:resolveAction:number");
                    log(await makeCall(ac))
                    var msg = { guid: ac.action_user, from: from, name: ac.action_exec_type, date: getDateNow(), status: "start", prt: ac.action_exec_prt, details: ac.id }
                    //log("actionController:resolveAction: will insert it on DB : " + JSON.stringify(msg));
                    insertActivityResult = db.activity.create(msg)
                    log("actionController:resolveAction: insertActivityResult: id " + JSON.stringify(insertActivityResult.id));
                    send(ac.action_user, { api: "user", mt: "getHistoryResult", result: [insertActivityResult] });
                
                    break;
                case "button":
                    log("actionController:resolveAction:button");
                    const buttonsByAlarm = db.button.findAll({
                        where: {
                            id: ac.action_exec_prt
                        },
                    })
                    buttonsByAlarm.forEach((b, index, array) => {
                        send(ac.action_user, { api: "user", mt: "ButtonRequest", name: b.button_name, alarm: b.button_prt, btn_id: b.id, type: b.button_type })
                    })
                    var msg = { guid: ac.action_user, from: from, name: ac.action_exec_type, date: getDateNow(), status: "start", prt: ac.action_exec_prt, details: ac.id }
                    //log("actionController:resolveAction: will insert it on DB : " + JSON.stringify(msg));
                    insertActivityResult = db.activity.create(msg)
                    log("actionController:resolveAction: insertActivityResult: id " + JSON.stringify(insertActivityResult.id));
                    send(ac.action_user, { api: "user", mt: "getHistoryResult", result: [insertActivityResult] });
                
                    break;
                case 'command':

                    //verificar se a interface já não está no estado esperado

                    const lastState = await db.iotDevicesHistory.findOne({
                        where:{
                            deveui:ac.action_exec_device
                        },
                        order: [['id', 'desc']]
                    })
                    if(lastState && lastState[ac.action_exec_prt] != ac.action_exec_type_command_mode){

                        log("actionController:resolveAction:command must be executed to change the state of "+ac.action_exec_prt+" on device "+ac.action_exec_device+" from "+ lastState[ac.action_exec_prt]+ ' to a new state '+ac.action_exec_type_command_mode);
                        const devices = await getDevices();
                        const gateway_id = findGatewayIdByDevEUI(devices, ac.action_exec_device)
                        //log("actionController:resolveAction:command to gateway_id "+gateway_id);
                        const commnadResult = await TriggerCommand(gateway_id, ac.action_exec_device, ac.action_exec_prt+'-'+ac.action_exec_type_command_mode)
                        log("actionController:resolveAction:command to gateway_id result "+commnadResult);
                        
                        var msg = { guid: ac.action_exec_device, from: from, name: ac.action_exec_type, date: getDateNow(), status: "start", prt: ac.action_exec_prt, details: ac.id }
                        //log("actionController:resolveAction: will insert it on DB : " + JSON.stringify(msg));
                        insertActivityResult = db.activity.create(msg)
                        log("actionController:resolveAction: insertActivityResult: id " + JSON.stringify(insertActivityResult.id));
                        broadcast({ api: "user", mt: "getHistoryResult", result: [insertActivityResult] });
                    
                    }else{
                        log("actionController:resolveAction:command ignored because state of "+ac.action_exec_prt+" on device "+ac.action_exec_device+" it's already "+ac.action_exec_type_command_mode );
                    }
                    
                    break;
                default:
                    log("actionController:resolveAction:unknown "+ ac.action_exec_type);
                    break;
            }
            
                    

        })
        return true
    }catch(e){
        log("actionController:resolveAction: erro " + e);
        return false
    }
    
}

function findGatewayIdByDevEUI(gateways, targetDevEUI) {
    for (const gateway of gateways) {
      for (const [gatewayId, data] of Object.entries(gateway)) {
        if (data.devices) {
          for (const device of data.devices) {
            if (device.devEUI === targetDevEUI) {
              return gatewayId;
            }
          }
        }
      }
    }
    return null; // Retorna null se o device com o devEUI não for encontrado
  }
//

// Função para verificar as ações com base no sensor recebido
//
function verificarAcoes(data, actions) {
    var acoes = [];
    //log("actionController:verificarAcoes:parameters data" + JSON.stringify(data))
    actions.forEach(function (entry) {
        //log("actionController:verificarAcoes:entry" + JSON.stringify(entry))
        // Verifica se o nome do sensor corresponde
        if (entry.action_start_device === data.deveui) {
            // Verifica se o tipo de sensor corresponde
            if (data.hasOwnProperty(entry.action_start_device_parameter)) {
                var value = data[entry.action_start_device_parameter];
                // Verifica se o tipo de ação é max ou min
                if (entry.action_start_type == "maxValue" && value >= parseInt(entry.action_start_prt)) {
                    acoes.push(entry);
                } else if (entry.action_start_type == "minValue" && value <= parseInt(entry.action_start_prt)) {
                    acoes.push(entry);
                }
            }
        }
    });
    log("actionController:verificarAcoes:return "+ acoes.length +" actions!")
    return acoes;
}

async function makeCall(action){
    try{
        let pbxType = await db.config.findOne({
            where:{
                entry: 'pbxType'
            }
            
        })
        const user = await db.user.findOne({
            where: {
                guid: ac.action_user
            }
        })

        let result = await db.call.create({
            guid: ac.action_user,
            number: action.action_exec_prt,
            call_started: getDateNow(),
            status: 1,
            direction:"out",
            device: action.action_exec_device,
            btn_id: action.id
        })
        log("actionController:MakeCall: db.create.call success " + result.id);
        log("actionController:MakeCall: pbxType " + pbxType.value);
        if(pbxType.value == 'INNOVAPHONE'){
            const btn_temp = {button_type: ac.action_exec_type, button_prt: action.action_exec_prt, id: action.id, button_device: action.action_exec_device}
            return await innovaphoneMakeCall(btn_temp, user)
        }
        if(pbxType.valuel == 'EPYGI'){                                    
            
        }
    }catch(e){
        log("actionController:MakeCall: error " + e)
        return e
    }  
}