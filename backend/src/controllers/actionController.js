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
import { sendEmail } from '../managers/smtpManager.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';



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
            return false;
        }


    }
    catch (e) {
        log("actionController:triggerActionByStartType: Try Body decode Erro " + e);
        return false;
    }
}
export const triggerActionBySensor = async (obj) => {
    try{
        const actionsBySensor = await db.action.findAll({
            where: {
                action_start_type: {
                    [Op.or]: ['maxValue', 'minValue', 'equalValue']
                }
            },
            raw: true
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
            return false;
        }

    }catch(e){
        log("actionController:triggerActionBySensor: Try Body decode Erro " + e);
        return false;
    }
    
}
//
// Função para tratar as ações com base no JSON recebido
//
async function resolveAction(from, actions){
    try{
        actions.forEach(async function (ac) {
            log("actionController:resolveAction:ac " + JSON.stringify(ac.action_name));
            log(`actionController:resolveAction: action type ${ac.action_exec_type}`);
            switch (ac.action_exec_type) {
                case "alarm":
                    notifyUsersAboutActionExecution(from, ac)
                    break;
                case "number":
                    await makeCall(ac)
                    notifyUsersAboutActionExecution(from, ac)
                    break;
                case "button":
                    const buttonsByAlarm = await db.button.findAll({
                        where: {
                            id: ac.action_exec_prt
                        },
                        raw:true
                    })
                    if(buttonsByAlarm.length >0){
                        buttonsByAlarm.forEach(async (b, index, array) => {
                            send(ac.action_exec_user, { api: "user", mt: "ButtonRequest", name: b.button_name, alarm: b.button_prt, btn_id: b.id, type: b.button_type })
                        })
                        notifyUsersAboutActionExecution(from, ac)
                    }
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
                        notifyUsersAboutActionExecution(from, ac)
                        
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
    actions.forEach(async (entry) => {
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
                }else if (entry.action_start_type == "equalValue" && value == parseInt(entry.action_start_prt)) {
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
                guid: action.action_exec_user
            }
        })

        let result = await db.call.create({
            guid: action.action_exec_user,
            number: action.action_exec_prt,
            call_started: getDateNow(),
            status: 1,
            direction:"out",
            device: action.action_exec_device
        })
        log("actionController:MakeCall: db.create.call success " + result.id);
        log("actionController:MakeCall: pbxType " + pbxType.value);
        if(pbxType.value == 'INNOVAPHONE'){
            //const btn_temp = {button_type: action.action_exec_type, button_prt: action.action_exec_prt, id: action.id, button_device: action.action_exec_device}
            return await innovaphoneMakeCall(null, user, action.action_exec_device, action.action_exec_prt)
        }
        if(pbxType.valuel == 'EPYGI'){                                    
            
        }
    }catch(e){
        log("actionController:MakeCall: error " + e)
        return e
    }  
}

async function notifyUsersAboutActionExecution(from, action){
    try{

        const users = await db.user.findAll();

        if(users.length > 0){

            const create_user = users.find(u => u.guid === action.create_user);

            users.forEach(async u => {
                //Notificação no e-mail
                const body = `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>CORE - Ação executada!</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background-color: #f4f4f4;
                            margin: 0;
                            padding: 0;
                            color: white;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            background-color: hsl(222.2, 84%, 4.9%);
                            padding: 20px;
                            border-radius: 8px;
                            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                            color: white;
                        }
                        .header {
                            background-color: hsl(222.2, 84%, 4.9%);
                            padding: 20px;
                            border-radius: 8px 8px 0 0;
                            text-align: center;
                            color: white;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 24px;
                            color: white;
                        }
                        .content {
                            padding: 20px;
                            text-align: center;
                            color: white;
                        }
                        .content p {
                            font-size: 16px;
                            line-height: 1.5;
                            margin-bottom: 20px;
                        }
                        .button {
                            background-color: #2594d4;
                            color: white;
                            padding: 15px 20px;
                            text-decoration: none;
                            border-radius: 5px;
                            font-size: 16px;
                        }
                        .button:hover {
                            background-color: #2594d4e6;
                        }
                        .footer {
                            text-align: center;
                            font-size: 12px;
                            color: #888;
                            margin-top: 20px;
                            padding: 10px 0;
                        }
                        .link{
                            text-decoration: none;
                            color: white
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <img src="">
                            <h1>Control Operation Responsive Enviroment</h1>
                        </div>
                        <div class="content">
                            <p>Olá ${u.name},abaixo você tem informações sobre a ação executada:</p>
                            <p class="link" >Nome da ação: ${action.action_name}</p>
                            <br/>
                            <p>Gatilho:</p>
                            <p>Tipo: ${action.action_start_type}</p>
                            <p>Parametro: ${action.action_start_device_parameter}</p>
                            <p>Valor: ${action.action_start_prt}</p>
                            <br/><br/>
                            <p>Execução:</p>
                            <p>Ação: ${action.action_exec_type}</p>
                            <p>Parametro: ${action.action_exec_prt}</p>
                            <br/>
                            <p>Criado por: ${create_user.name}</p>
                        </div>
                        <div class="footer">
                            <p>CORE | Av Carlos Gomes, 466 -CJ 401, Porto Alegre - RS</p>
                        </div>
                    </div>
                </body>
                </html>`

                if(action.action_exec_user != '' && action.action_exec_user == u.guid){

                    //Notificação no Histórico da console
                    var msg = { guid: action.action_exec_user, from: from, name: action.action_exec_type, date: getDateNow(), status: "start", prt: action.action_exec_prt, details: action.id }
                    var insertActivityResult = await db.activity.create(msg)
                    send(action.action_exec_user, { api: "user", mt: "getHistoryResult", result: [insertActivityResult] })

                    // Send the reset email with the token
                    await sendEmail([u.email], 'CORE - Ação executada!', body);
                }
                if(action.action_exec_user == ''){
                    //Notificação no Histórico da console
                    var msg = { guid: u.guid, from: from, name: action.action_exec_type, date: getDateNow(), status: "start", prt: action.action_exec_prt, details: action.id }
                    var insertActivityResult = await db.activity.create(msg)
                    send(u.guid, { api: "user", mt: "getHistoryResult", result: [insertActivityResult] })

                    // Send the reset email with the token
                    await sendEmail([u.email], 'CORE - Ação executada!', body);
                }
            })
        }
    }catch(e){
        log("actionController:notifyUsersAboutActionExecution: erro " + e);
    }
}