import { send } from '../managers/webSocketManager.js';
import { getDateNow } from '../utils/getDateNow.js';
import { triggerActionByStartType } from './actionController.js';
import db from '../managers/databaseSequelize.js';
import { QueryTypes, Op, fn, col } from 'sequelize';
import { log } from '../utils/log.js';



export const receiveAlarmFromFlic = async (obj) => {
    try {
        let triggerAlarmResult = 0;
        obj.date = getDateNow();
        
        //
        // Atualizar botões dos usuários sobre info recebida do sensor
        //
        const pressType = Object.keys(obj).find(key => key.startsWith("press_")); // Encontrar chave dinâmica
        log('flicController:receiveAlarmFromFlic: presType ' + pressType)

        const phisicalButtons = await db.button.findAll({
            where: {
                button_name: obj.button_name,
                button_prt: pressType,
            },
        });
        log(`flicController:receiveAlarmFromFlic: ${phisicalButtons.length} Buttons in Cosoles to this flic deveui`)
        if (phisicalButtons.length > 0) {
            phisicalButtons.forEach(async (b) => {

                const isAlarmed = await db.activeAlarms.findOne({
                    where: {
                        btn_id: b.id
                    }
                })
                if(!isAlarmed){
                    // log("danilo-req sensorReceived: sensors.forEach " + JSON.stringify(bs));
                    const sendResult = await send(b.button_user, { api: "user", mt: "AlarmReceived", alarm: pressType, btn_id: b.id, src: obj.button_name, date: getDateNow() })
                    if(sendResult){triggerAlarmResult +=1}
                    //intert into DB the event
                    var msg = { 
                        guid: b.button_user, 
                        from: obj.button_name, 
                        name: "button", 
                        date: getDateNow(), 
                        status: "start", 
                        details: b.id, //details.id para obter o id que antes era direto no details
                        prt: pressType, 
                        min_threshold: b.sensor_min_threshold, 
                        max_threshold: b.sensor_max_threshold
                    }
                    //log("flicController:receiveAlarm: will insert it on DB : " + JSON.stringify(msg));
                    let resultInsert = await db.activity.create(msg)
                    resultInsert.details = b
                    send(b.button_user, { api: "user", mt: "getHistoryResult", result: [resultInsert]});

                    // insert active Alarmed Button for user
                    const objAlarm = { from: obj.button_name, prt: pressType, date: getDateNow(), btn_id: b.id }
                    const result = await db.activeAlarms.create(objAlarm)
                    log(`flicController:receiveAlarmFromFlic: ActiveAlarm created for Button ${b.id} result alarm id ${result.id}`)
                }else{
                    log(`flicController:receiveAlarmFromFlic: Button ${b.id} is already alarmed`);
                }
            });
        }

        //
        // Verificar ações cadastradas para esse sensor
        //
        try {
            const resultAction = await triggerActionByStartType(obj.button_name, pressType, 'alarm');
            log("flicController:receiveAlarmFromFlic:triggerActionByStartType result "+resultAction);
        } catch (e) {
            log("flicController:receiveAlarmFromFlic:triggerActionByStartType error "+ e);
        }

        const resultInsert = await db.iotDevicesHistory.create(obj);
        log("flicController:receiveAlarmFromFlic: event inserted into DB with id " + resultInsert.id);
        return { msg: resultInsert, alarmResult: triggerAlarmResult };

    } catch (e) {
        return { msg: 'Error', e: e };
    }
};