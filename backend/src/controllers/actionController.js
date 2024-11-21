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
import { getDevices, TriggerCommand, findGatewayIdByDevEUI } from './milesightController.js';
import {innovaphoneMakeCall} from './innovaphoneController.js'
import { sendEmail } from '../managers/smtpManager.js'

import OpenAIApi from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';

const openaiParamters = [
    'openaiKey',
    'openaiOrg',
    'openaiProj'
];

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
export const triggerActionByImagem = async (obj) => {
    try {
        let result = false;
        //Get Actions from DB
        const actions = await db.action.findAll({
            where: {
                action_start_type:  'camera',
                action_start_device: obj.devMac

            },
            raw: true
        })
        if (actions.length > 0) {
            log(`actionController:triggerActionByImagem: Match Actions: ${actions.length}`);

            const imageUri = await saveBase64Image(obj.image, obj.file || 'tempImg.jpg')
            
            for (const a of actions) {
                const analiseResult = await imagemAnaliser(imageUri, a.action_start_prt)
                
                switch(analiseResult.status){
                    case 0:
                        log(`actionController:triggerActionByImagem:imagemAnaliser: result OK?? ${analiseResult.msg}`)
                        break;
                    case 1:
                        log(`actionController:triggerActionByImagem:imagemAnaliser: result NOK?? ${analiseResult.msg}`)
                        //Atualiza a ação para envio de notificação coerente com a causa da ação analisada
                        a.action_start_device_parameter = analiseResult.msg;

                        const resultAction = await resolveAction(obj.devMac, [a])
                        if(resultAction){ result = resultAction}
                        break;
                    case 2:
                        log(`actionController:triggerActionByImagem:imagemAnaliser: result unknown?? ${analiseResult.msg}`)
                        break;
                    default:
                        log(`actionController:triggerActionByImagem:imagemAnaliser: result WTF?? ${analiseResult.status} MSG: ${analiseResult.msg}`)
                        break;
                }
            }
            log(`actionController:triggerActionByImagem:imagemAnaliser: after analise delete image result ${deleteImage(obj.file || 'tempImg.jpg')}`)
            return result;
            
        }
        else {
            //log("actionController:triggerActionByStartType:actions is null " + JSON.stringify(actions));
            return false;
        }
    }
    catch (e) {
        log("actionController:triggerActionByImagem: Try Body decode Erro " + e);
        return false;
    }
}
//
// Função para salvar a imagem base64 em um arquivo
//
function saveBase64Image(base64Image, fileName) {
    try{
        // Define o diretório onde os arquivos estáticos serão servidos
        const staticDir = path.join(__dirname, '../httpfiles/images');
        // Remover o prefixo data:image/jpeg;base64, ou outro tipo de dados, se presente
        const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
        if (!matches) {
            throw new Error("Formato de base64 inválido.");
        }

        const imageBuffer = Buffer.from(matches[2], 'base64');

        // Certifique-se de que o diretório existe
        if (!fs.existsSync(staticDir)) {
            fs.mkdirSync(staticDir, { recursive: true });
        }

        // Defina o caminho completo do arquivo
        const filePath = path.join(staticDir, fileName);

        // Salvar o arquivo
        fs.writeFileSync(filePath, imageBuffer);

        // Retorna o caminho relativo
        return `https://${process.env.BACKEND_URL}/api/images/${fileName}`;

    }catch(e){

        return
    }
}
//
// Função para excluir a imagem após análise
//
function deleteImage(fileName) {
    try {
        // Define o diretório onde os arquivos estão armazenados
        const staticDir = path.join(__dirname, '../httpfiles/images');
        
        // Define o caminho completo do arquivo
        const filePath = path.join(staticDir, fileName);

        // Verifica se o arquivo existe
        if (fs.existsSync(filePath)) {
            // Exclui o arquivo
            fs.unlinkSync(filePath);
            return true;
        } else {
            return false;
        }
    } catch (error) {
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
                // atualiza para o valor recebido no evento
                entry.action_start_device_parameter = value;
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
//
// Função para confecção da chamada a ser executada com base na ação executada
//
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
//
// Função para envio de emails e notificações para os usuários quando uma ação é executada
//
async function notifyUsersAboutActionExecution(from, action){
    try{

        const users = await db.user.findAll();

        if(users.length > 0){

            const create_user = users.find(u => u.guid === action.create_user);
            let exec_prt_translated = action.action_exec_prt
            if(action.action_exec_type == 'button'){
                const button = await db.button.findOne({where:{
                    id : parseInt(action.action_exec_prt)
                }})
                exec_prt_translated = button.button_name;
            }

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
                            <p>Gatilho</p>
                            <p>Tipo: ${action.action_start_type}</p>
                            <p>Parametro: ${action.action_start_device_parameter}</p>
                            <p>Valor: ${action.action_start_prt}</p>
                            <br/><br/>
                            <p>Execução</p>
                            <p>Ação: ${action.action_exec_type}</p>
                            <p>Parametro: ${exec_prt_translated}</p>
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
                    var msg = { 
                        guid: action.action_exec_user, 
                        from: from, 
                        name: 'action', 
                        date: getDateNow(), 
                        status: "start", 
                        prt: action.action_start_device_parameter, 
                        details: action.id, //details.id para obter o id da ação executada e outros parâmetros
                        min_threshold: action.action_start_prt, 
                        max_threshold: action.action_start_prt, 
                    }
                    let insertActivityResult = await db.activity.create(msg)
                    insertActivityResult.details = action
                    send(action.action_exec_user, { api: "user", mt: "getHistoryResult", result: [insertActivityResult] })

                    // Send the reset email with the token
                    await sendEmail([u.email], 'CORE - Ação executada!', body);
                }
                if(action.action_exec_user == ''){
                    //Notificação no Histórico da console
                    var msg = { 
                        guid: u.guid, 
                        from: from, 
                        name: 'action', 
                        date: getDateNow(), 
                        status: "start", 
                        prt: action.action_start_device_parameter,
                        details: action.id, 
                        min_threshold: action.action_start_prt, 
                        max_threshold: action.action_start_prt, 
                    }
                    let insertActivityResult = await db.activity.create(msg)
                    insertActivityResult.details = action
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
//
// Função para Verificar no ChatGPT se a imagem está de acordo com as definições necessárias
//
async function imagemAnaliser(image, customPrompt) {
    
    // Faz uma consulta ao banco de dados para pegar todas as entradas correspondentes
    const configs = await db.config.findAll({
        where: {
        entry: openaiParamters
        }
    });
    // Transforma o resultado em um objeto chave-valor
    const openaiConfigObj = {};
    configs.forEach(config => {
    openaiConfigObj[config.entry] = config.value;
    });
    log(`actionController:openaiConfigObj ${JSON.stringify(openaiConfigObj)}`)

    const openai = new OpenAIApi({
        apiKey: openaiConfigObj.openaiKey,
        organization: openaiConfigObj.openaiOrg,
        project: openaiConfigObj.openaiProj,
    });

    let systemPrompt;
    if(customPrompt){
        systemPrompt = `Você é um engenheiro de segurança do trabalho e deve analisar as imagens de trabalhadores em seu dia a dia de trabalho, retornando como resposta:
        0 = Com EPIs adequados, 1 = sem EPI adequado ou 2 = não identificado.
        
        Pergunta: "${customPrompt}"
    
        As respostas devem ser exclusivamente:
        {"status":0, "msg": "ok"}, {"status":1, "msg": "<motivo da reprovação>"} ou {"status":2, "msg": "<motivo da incerteza>"}.
      `;

    }else{
        systemPrompt = `Você é um engenheiro de segurança do trabalho e deve analisar as imagens de trabalhadores em seu dia a dia de trabalho, retornando como resposta:
        0 = Com EPIs adequados, 1 = sem EPI adequado ou 2 = não identificado.
        
        Pergunta: "O funcionário da empresa que está desempanhando o trabalho está usando os EPIs básicos para a execução daquela atividade em questão?"
    
        As respostas devem ser exclusivamente:
        {"status":0, "msg": "ok"}, {"status":1, "msg": <motivo da reprovação>} ou {"status":2, "msg": <motivo da incerteza>}.
      `;
    }
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: systemPrompt },
                  {
                    type: "image_url",
                    image_url: {
                      "url": image,
                    },
                  },
                ],
              },
            ],
          });
        
        const result = await response.choices[0].message.content;
        log('actionController:imagemAnaliser: Resultado da análise:'+ result);
        return JSON.parse(result);
    } catch (error) {
      log('actionController:imagemAnaliser: Erro na análise da imagem:' + error);
      return {status:2, msg: error}
    }
}