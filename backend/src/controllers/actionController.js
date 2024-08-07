import { send } from '../managers/webSocketManager.js';
import { getDateNow } from '../utils/getDateNow.js';
import {sendHttpPostRequest} from '../managers/httpClient.js';
//const ConfigModel = require('../models/configModel')
import db from '../managers/databaseSequelize.js';
import { log } from '../utils/log.js';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import process from 'process';
import configFile from '../config/config.js';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getDevices, TriggerCommand } from './milesightController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = configFile[env];


// Instanciação do modelo
//const configModel = new ConfigModel();

// Uso dos dados de configuração
const pbxConfig = config.pbxConfig;
log(pbxConfig);

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
            log("actionController:triggerActionByStartType: Ações aplicáveis encontradas:");
            
            const result = await resolveAction(from, actions)
            
            
            return result;
            
        }
        else {
            //log("actionController:triggerActionByStartType:actions is null " + JSON.stringify(actions));
            return "Nenhuma ação aplicável encontrada.";;
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
            log("actionController:triggerActionBySensor: Ações aplicáveis encontradas:");
            
            const result = await resolveAction(obj.sensor_name, acoesAplicaveis)
            return result;

            
        } else {
            //log("danilo-req triggerActionBySensor: Nenhuma ação aplicável encontrada.");
            return "Nenhuma ação aplicável encontrada.";
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
            switch (ac.action_exec_type) {
                case "alarm":
                    log("actionController:resolveAction:alarm");
                    send(ac.action_user, { api: "user", mt: "AlarmReceived", alarm: ac.action_exec_prt, src: from })
                    break;
                case "number":
                    log("actionController:resolveAction:number");
                    // const callid = random.generateRandomBigInt(19);
                    db.call.create({
                        guid:ac.action_user,
                        number: ac.action_exec_prt,
                        call_started: getDateNow(),
                        status: 1,
                        direction:"out"
                    }).then(async function(result){
                        log("actionController:resolveAction: MakeCall: create.call success " + result);
                        if(pbxConfig.pbxType === 'INNOVAPHONE'){
                            // if(pbxConfig.customHeaders){
                            //     httpClient.setCustomHeaders(pbxConfig.customHeaders)
                            // }
                            await sendHttpPostRequest(pbxConfig.host, { num: ac.action_exec_prt, mode: 'UserCall', sip: ac.action_exec_device, user: ac.action_user}, pbxConfig.customHeaders)
                            .then(function(res){
                                log("actionController:resolveAction: MakeCall: httpService.sendHttpPostRequest success " +res);
                                return res
                            })
                            .catch (function (error, errorText, dbErrorCode) {
                                log("actionController:resolveAction: MakeCall: httpService.sendHttpPostRequest error " + errorText);
                                return errorText
                            });
                        }
                        if(pbxConfig.pbxType === 'EPYGI'){                                    
                            // if(pbxConfig.customHeaders){
                            //     httpClient.setCustomHeaders(pbxConfig.customHeaders)
                            // }
                            
                            await sendHttpPostRequest(pbxConfig.host, {
                                restPeerIP: pbxConfig.restPeerIP,
                                cmd: "CreateCall",
                                username: pbxConfig.usernameEpygi, //Ramal virtual para controle das chamadas com 3PCC habilitado.
                                password: pbxConfig.passwordEpygi, //Senha do ramal virtual
                                displayName: "REST 3PCC 120",
                                restCallID: result.id, //"7325840796693965112"
                                ownerID: "REST Req2Call",
                                sipUsername: "EmergencyS", //Nome mostrado durante o ring
                                callSource: ac.action_exec_device,
                                callDestination: ac.action_exec_prt
                                },pbxConfig.customHeaders)
                                .then(function(res){
                                     //addObject(user, callid)
                                    log("actionController:resolveAction: MakeCall: httpService.sendHttpPostRequest success "+res);
                                    return res
                                })
                                .catch (function (error, errorText, dbErrorCode) {
                                    log("actionController:resolveAction: MakeCall: httpService.sendHttpPostRequest error " + errorText);
                                    return errorText
                                });
                        }
            
                    }).catch(function (error, errorText, dbErrorCode) {
                        log("actionController:resolveAction: MakeCall: create.call error " + errorText);
                        return errorText
                    })  
                    break;
                case "button":
                    log("actionController:resolveAction:button");
                    const buttonsByAlarm = db.button.findAll({
                        where: {
                            id: ac.action_exec_prt
                        },
                    })
                    send(ac.action_user, JSON.stringify({ api: "user", mt: "AlarmReceived", alarm: ac.action_name, src: from }))
                    buttonsByAlarm.forEach((b, index, array) => {
                        send(ac.action_user, { api: "user", mt: "ButtonRequest", name: b.button_name, alarm: b.button_prt, btn_id: b.id, type: b.button_type })
                    })
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
                    }else{
                        log("actionController:resolveAction:command ignored because state of "+ac.action_exec_prt+" on device "+ac.action_exec_device+" it's already "+ac.action_exec_type_command_mode );
                    }
                    
                    break;
                default:
                    log("actionController:resolveAction:unknown "+ ac.action_exec_type);
                    break;
            }
            // Ação tratada... Então insere o log no DB para Histórico
            var today = getDateNow();
            var msg = { sip:  ac.action_user, from: from, name: ac.action_name, date: today, status: "inc", prt: ac.action_start_prt, details: ac.action_exec_prt }
            //log("actionController:resolveAction: will insert it on DB : " + JSON.stringify(msg));
            //insertTblActivities(msg);
            //const insertActivityResult = db.activity.create(msg)
            //log("actionController:resolveAction: insertActivityResult: " + JSON.stringify(insertActivityResult));
            

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