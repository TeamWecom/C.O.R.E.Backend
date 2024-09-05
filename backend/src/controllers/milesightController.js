// controllers/webServerController.js
import { send } from '../managers/webSocketManager.js';
import { getDateNow } from '../utils/getDateNow.js';
import { triggerActionByStartType, triggerActionBySensor } from './actionController.js';
import db from '../managers/databaseSequelize.js';
import { QueryTypes, Op } from 'sequelize';
import { stringToBase64 } from '../utils/typeHelpers.js';
import { log } from '../utils/log.js';
import {getParametersByDeviceName} from '../utils/milesightParameters.js';
import {sendHttpPostRequest, sendHttpGetRequest } from '../managers/httpClient.js'
import {licenseFileWithUsage} from '../controllers/licenseController.js'

let devices = [];

export const receiveSensor = async (obj) => {
    try {
        let resultAction = {};
        //
        // Verificar ações cadastradas para esse sensor
        //
        obj.date = getDateNow();
        
        try {
            resultAction = await triggerActionBySensor(obj);
            log("milesightController:receiveSensor:triggerActionBySensor result? "+resultAction);
        } catch (e) {
            log("milesightController:receiveSensor:triggerActionBySensor error "+ e);
        }

        //
        // Atualizar botões dos usuários sobre info recebida do sensor
        //
        let count = 0;

        const sensorsButtons = await db.button.findAll({
            where: {
                button_prt: obj.deveui,
            },
        });

        if (sensorsButtons.length > 0) {
            sensorsButtons.forEach((bs) => {
                // log("danilo-req sensorReceived: sensors.forEach " + JSON.stringify(bs));
                const userConnected = send(bs.button_user, { api: "user", mt: "SensorReceived", value: obj });
                if(userConnected){
                    count++;
                }
                
            });
        }

        const result = await db.iotDevicesHistory.create(obj);
        log("milesightController:receiveSensor: event inserted into DB with id " + result.id+" and "+count+" users notified");
        return { msg: result, usersNotified: count };
    } catch (e) {
        log("milesightController:receiveSensor: Body not present! Erro " + e);
        throw new Error(e);
    }
};

export const receiveImage = async (obj) => {
    try {
        //log("milesightController:receiveImage: " + JSON.stringify(obj));
        let values = obj.values;
        let devMac = values.devMac;
        values.devMac = devMac.replace(/:/g, '');;
        values.date = getDateNow();

        //
        // Atualizar botões dos usuários sobre info recebida do sensor
        //
        let count = 0;
        let result;
        const sensorsButtons = await db.button.findAll({
            where: {
                button_prt: values.devMac,
            },
        });

    //Localiza o nome cadastrado para o MAC da camera
        const iotCam = await db.camera.findOne(
            {
                where: {
                mac: values.devMac
            }
        })

        if (sensorsButtons.length > 0) {
            let objToReturn = {sensor_name: iotCam.nickname, deveui: values.devMac, date: values.date, image: values.image}
            sensorsButtons.forEach((bs) => {
                // log("danilo-req sensorReceived: sensors.forEach " + JSON.stringify(bs));
                const userConnected = send(bs.button_user, { api: "user", mt: "ImageReceived", result: [objToReturn] });
                if(userConnected){
                    count++;
                }
                
            });
        }

        // Insere na tabela de histórico dos sensores
        if(iotCam){
            let objToInsert = { deveui: values.devMac, sensor_name: iotCam.nickname, battery: values.battery, image: values.image, date: values.date}

            result = await db.iotDevicesHistory.create(objToInsert);
            log("milesightController:receiveImage: event inserted into DB with id " + result.id+" and "+count+" users notified");
        }else{
            log("milesightController:receiveImage: event skiped Cam not in DB");
        }
        
        return { msg: result, usersNotified: count };
    } catch (e) {
        log("milesightController:receiveImage: Body not present! Erro " + e);
        throw new Error(e);
    }
};
//
// Verificar ações cadastradas para o alarme recebido
//
export const receiveAlarm = async (obj) => {
    try {
        let resultAction = {};
        let triggerAlarmResult = 0;
        //
        // Verificar ações cadastradas para esse sensor
        //
        obj.date = getDateNow();
        //log("danilo-req sensorReceived:value " + JSON.stringify(obj));
        
        try {
            resultAction = await triggerActionByStartType(obj.deveui, obj.press, 'alarm');
            log("milesightController:receiveAlarm:triggerActionBySensor result? "+resultAction);
        } catch (e) {
            log("milesightController:receiveAlarm:triggerActionBySensor error "+ e);
        }
        //
        // Atualizar botões dos usuários sobre info recebida do sensor
        //
        const phisicalButtons = await db.button.findAll({
            where: {
                button_prt: obj.deveui,
                sensor_type: obj.press
            },
        });

        if (phisicalButtons.length > 0) {
            phisicalButtons.forEach(async (b) => {
                // log("danilo-req sensorReceived: sensors.forEach " + JSON.stringify(bs));
                const sendResult = await send(b.button_user, { api: "user", mt: "SmartButtonReceived", alarm: obj.press, btn_id: b.id, src: obj.deveui, date: getDateNow() })
                if(sendResult){triggerAlarmResult +=1}
            });
        }

        const objAlarm = { from: obj.deveui, prt: obj.press, date: getDateNow(), btn_id: '' }
        const result = await db.activeAlarms.create(objAlarm)
        log('milesightController:receiveAlarm: ActiveAlarm create result ' + result)

        

        const resultInsert = await db.iotDevicesHistory.create(obj);
        log("milesightController:receiveAlarm: event inserted into DB with id " + result.id);
        return { msg: result, alarmResult: TriggerAlarmResult };

    } catch (e) {
        return { msg: 'Error', actionResult: e };
    }
};

export const receiveController = async (obj) =>{
    try{
        //log("milesightController:receiveController received "+ JSON.stringify(obj));
        obj.date = getDateNow();
        //
        // Atualizar botões dos usuários sobre info recebida do sensor
        //
        let count = 0;

        const sensorsButtons = await db.button.findAll({
            where: {
                button_device: obj.deveui,
            },
        });

        if (sensorsButtons.length > 0) {
            sensorsButtons.forEach((bs) => {
                // log("danilo-req sensorReceived: sensors.forEach " + JSON.stringify(bs));
                let value = obj[bs.button_prt]
                const userConnected = send(bs.button_user, { api: "user", mt: "ControllerReceived", btn_id: bs.id, prt: bs.button_prt, value: value });
                if(userConnected){
                    count++;
                }
            });
        }

        const result = await db.iotDevicesHistory.create(obj);
        log("milesightController:receiveController: event inserted into DB with id " + result.id+" and "+count+" users notified");
        return { msg: result, usersNotified: count };

    }catch(e){
        log('danilo-req: error '+e)

    }
    

}

export const getDevices = async () =>{
    let gateways = await db.gateway.findAll();
    devices = []
    async function fetchDevices(gateways) {
        for (const gateway of gateways) {
            // Dados de autenticação
            const authData = {"password": gateway.password, "username": gateway.userapi};
    
            try {
                // Solicitação de autenticação
                const authResponse = await sendHttpPostRequest(gateway.host + '/api/internal/login', JSON.stringify(authData), '{}');
                
                if (authResponse && authResponse.data && authResponse.data.jwt) {
                    const token = authResponse.data.jwt;
    
                    // Cabeçalho de autorização
                    const customHeaders = JSON.stringify({
                        'Authorization': `Bearer ${token}`
                    });
    
                    // Solicitação para obter dispositivos
                    const devicesResponse = await sendHttpGetRequest(gateway.host + '/api/devices?limit=100&offset=0', customHeaders);
    
                    if (devicesResponse && devicesResponse.data) {
                        const result = devicesResponse.data;

                        const deviceObjs = result.devices;
                        log('milesightController:getDevices::fetchDevices::: result devices lenght: '+deviceObjs.length)
                        deviceObjs.forEach(async(d)=>{
                            const parameters = getParametersByDeviceName(d.description)
                            d.parameters = parameters
                        })

                        // Cria um novo objeto com a chave dinâmica baseada no gateway.id
                        var device = {};
                        device[gateway.id] = result;

                        // Adiciona o objeto à lista
                        devices.push(device);
                    } else {
                        // Trata caso de falha ao obter dispositivos
                        // conn.send(JSON.stringify({ api: "admin", mt: "SelectSensorNameResult", error: "Failed to fetch devices" }));
                    }
                } else {
                    // Trata caso de falha na autenticação
                    // conn.send(JSON.stringify({ api: "admin", mt: "SelectSensorNameResult", error: "Authentication failed" }));
                }
            } catch (error) {
                log('milesightController:getDevices: error '+error.message);
            }
        }
    }
    
    // Chama a função assíncrona e aguarda a conclusão antes de enviar a resposta via websocket
    await fetchDevices(gateways);
    return devices;
}

export const TriggerCommand = async(gateway_id, device, prt) => {
    try{
        const gateways = await db.gateway.findAll({
            where: {
                id: gateway_id
            }
        })
        async function fetchDevices(gateways) {
            for (const gateway of gateways) {
                // Dados de autenticação
                const authData = {"password": gateway.password, "username": gateway.userapi};
        
                try {
                    // Solicitação de autenticação
                    const authResponse = await sendHttpPostRequest(gateway.host + '/api/internal/login', JSON.stringify(authData), '{}');
                    
                    if (authResponse && authResponse.data && authResponse.data.jwt) {
                        const token = authResponse.data.jwt;
        
                        // Cabeçalho de autorização
                        const customHeaders = JSON.stringify({
                            'Authorization': `Bearer ${token}`
                        });
                        
                        const command = {
                            "confirmed": false,
                            "data": stringToBase64(prt),
                            "devEUI": device,
                            "fPort": 85
                        }
                        // Solicitação para obter dispositivos
                        const commandResponse = await sendHttpPostRequest(gateway.host + '/api/devices/'+device+'/queue', JSON.stringify(command), customHeaders);
                    
                        if (commandResponse && commandResponse.data.length>0) {
                            const result = commandResponse.data;
                            log('milesightController:TriggerCommand result data: '+ JSON.stringify(result))
                            
                        } else {
                        }
                        return commandResponse.statusText;
                    } else {
                        // Trata caso de falha na autenticação
                        return authResponse.statusText;
                    }
                } catch (error) {
                    // Trata qualquer erro que ocorra durante as requisições
                    return error.message;
                }
            }
        }
                            
        // Chama a função assíncrona e aguarda a conclusão antes de enviar a resposta via websocket
        return await fetchDevices(gateways);
    }catch(e){
        log('milesightController:TriggerCommand error '+ e)
        // Trata qualquer erro que ocorra durante as requisições
        return e.message;
    }
}

export const returnModelByEUI = async(devEUI) =>{

    if(devices.length==0){
        await getDevices()
    }
    for (const deviceGroup of devices) {
        for (const group of Object.values(deviceGroup)) {
            const device = group.devices.find(d => d.devEUI === devEUI);
            if (device) {
                return device.description;
            }
        }
    }
    return null;
}

export const addGateway = async (obj) => {
    let objResult = { api: "admin"}
    const license = await licenseFileWithUsage();
    if (license.gateways.used >= license.gateways.total){
        log("milesightController:addGateway: Limite de gateways atingido, contratar nova licença");
        objResult.mt = "AddGatewayError"
        objResult.result = 'noMoreLicenses'
        return objResult;
    }

    const insertResult = await db.gateway.create(obj)
    objResult.mt = "AddGatewaySuccess"
    objResult.result = insertResult;
    
    return objResult;
}