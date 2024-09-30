// controllers/webServerController.js
import { send } from '../managers/webSocketManager.js';
import { getDateNow } from '../utils/getDateNow.js';
import { triggerActionByAlarm, triggerActionBySensor } from './actionController.js';
import db from '../managers/databaseSequelize.js';
import { QueryTypes, Op } from 'sequelize';
import { log } from '../utils/log.js';

export const receiveSensor = async (obj) => {
    try {
        let resultAction = {};
        //
        // Verificar ações cadastradas para esse sensor
        //
        obj.date = getDateNow();
        //log("danilo-req sensorReceived:value " + JSON.stringify(obj));
        
        try {
            resultAction = await triggerActionBySensor(obj);
            log("danilo-req triggerActionByAlarm:resolveAction success? ", resultAction);
        } catch (e) {
            log("danilo-req triggerActionByAlarm:resolveAction success? ", e);
        }

        //
        // Atualizar botões dos usuários sobre info recebida do sensor
        //
        let count = 0;

        const sensorsButtons = await db.button.findAll({
            where: {
                button_prt: obj.sensor_name,
            },
        });

        if (sensorsButtons.length > 0) {
            sensorsButtons.forEach((bs) => {
                // log("danilo-req sensorReceived: sensors.forEach " + JSON.stringify(bs));
                send(bs.button_user, { api: "user", mt: "SensorReceived", value: obj });
                count++;
            });
        }

        // Insere na tabela de histórico dos sensores
        obj['date'] = getDateNow();

        const result = await db.sensorHistory.create(obj);
        return { msg: result, usersNotified: count };
    } catch (e) {
        log("danilo-req sensorReceived: Body not present! Erro " + e);
        throw new Error(e);
    }
};

export const receiveImage = async (obj) => {
    try {
        log("############################################## danilo-req receiveImage: " + JSON.stringify(obj));
        let values = obj.values;
        values.date = getDateNow();

        //
        // Atualizar botões dos usuários sobre info recebida do sensor
        //
        let count = 0;

        const sensorsButtons = await db.button.findAll({
            where: {
                button_prt: values.devName,
            },
        });

        if (sensorsButtons.length > 0) {
            sensorsButtons.forEach((bs) => {
                // log("danilo-req sensorReceived: sensors.forEach " + JSON.stringify(bs));
                send(bs.button_user, { api: "user", mt: "ImageReceived", value: values });
                count++;
            });
        }

        // Insere na tabela de histórico dos sensores
        let objToInsert = { sensor_name: values.devName, battery: values.battery, image: values.image, date: values.date}

        const result = await db.sensorHistory.create(objToInsert);
        return { msg: result, usersNotified: count };
    } catch (e) {
        log("danilo-req sensorReceived: Body not present! Erro " + e);
        throw new Error(e);
    }
};
//
// Verificar ações cadastradas para o alarme recebido
//
export const receiveAlarm = async (obj) => {
    try {
        log(obj);

        const handleActionResult = async (result) => {
            log("danilo-req triggerActionByAlarm:resolveAction success? ", result);
            return { msg: 'Alarm received', actionResult: result };
        };

        const handleActionError = async (result) => {
            log("danilo-req triggerActionByAlarm:resolveAction success? ", result);
            return { msg: 'Alarm received', actionResult: result };
        };

        if (obj.ServerName == "Milesight") {
            log("danilo-req alarmReceived:ServerType Milesight");
            // Variáveis presentes no BODY
            // ServerName
            // DeviceName
            // AlarmID
            // Detail
            // VERIFY IF ACTION EXISTS FOR THIS ALARM ID
            try {
                const result = await triggerActionByAlarm(obj.DeviceName, obj.AlarmID, "alarm");
                await handleActionResult(result);
            } catch (result) {
                await handleActionError(result);
            }
        } else {
            log("danilo-req alarmReceived:NO ServerType present, it is a button!");
            // VERIFY IF ACTION EXISTS FOR THIS ALARM ID
            try {
                const result = await triggerActionByAlarm(obj.From, obj.AlarmID, "alarm");
                await handleActionResult(result);
            } catch (result) {
                await handleActionError(result);
            }
        }
    } catch (e) {
        log("danilo-req alarmReceived: Body not present! Erro " + e);
        throw new Error(e);
    }
};
export const getActiveAlarmHistory = async (guid) => {
    let activeAlarms = await db.activeAlarms.findAll();
    log("alarmController::getActiveAlarmHistory result activeAlarms= " + JSON.stringify(activeAlarms, null, 4));
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

    log("alarmController::getActiveAlarmHistory result= " + result.length + " buttons with alarm active for user "+guid);
    result.forEach(async function(b){
        send(guid, { api: "user", mt: "AlarmReceived", btn_id: b.id})
    })
}

export const receiveController = async (obj) =>{
    try{
        log("danilo-req alarmController:receiveController received "+ JSON.stringify(obj));
        obj.date = getDateNow();
        //
        // Atualizar botões dos usuários sobre info recebida do sensor
        //
        let count = 0;

        const sensorsButtons = await db.button.findAll({
            where: {
                button_device: obj.devEUI,
            },
        });

        if (sensorsButtons.length > 0) {
            sensorsButtons.forEach((bs) => {
                // log("danilo-req sensorReceived: sensors.forEach " + JSON.stringify(bs));
                let value = obj[bs.button_prt]
                send(bs.button_user, { api: "user", mt: "ControllerReceived", btn_id: bs.id, prt: bs.button_prt, value: value });
                count++;
            });
        }


        const result = await db.sensorHistory.create(obj);
        return { msg: result, usersNotified: count };

    }catch(e){
        log('danilo-req: error '+e)

    }
    

}
