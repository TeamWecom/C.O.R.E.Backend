// controllers/webSocketController.js
import { parse } from 'url';
import { validateToken } from '../utils/validadeToken.js';
import { getDateNow } from '../utils/getDateNow.js';
import db from '../managers/databaseSequelize.js';
import { QueryTypes, Op } from 'sequelize';
import { log } from '../utils/log.js';
import {addGateway, getDevices, TriggerCommand} from '../controllers/milesightController.js'
import { makeCall, 
    heldCall, 
    retrieveCall, 
    clearCall, 
    comboManager, 
    TriggerAlarm, 
    TriggerStopAlarm, 
    selectButtons, 
    redirectCall, 
    dtmfCall, 
    rccMonitor, 
    rccMonitorEnd,
    connectCall,
    clearIncomingCall,
    heldIncomingCall,
    retrieveIncomingCall,
    redirectIncomingCall,
    dtmfIncomingCall 
} from './buttonController.js';
import { send, 
    broadcast, 
    addConnection, 
    removeConnection, 
    getConnections 
} from '../managers/webSocketManager.js';
import { generateGUID } from '../utils/generateGuid.js';
import {sendHttpPostRequest, sendHttpGetRequest} from '../managers/httpClient.js';
import {pbxStatus, pbxTableUsers, requestPresences, returnRecordLink} from '../controllers/innovaphoneController.js'
import { licenseFileWithUsage, 
    returnLicenseFile, 
    returnLicenseKey, 
    encryptLicenseFile
} from './licenseController.js';
import { restartService } from '../utils/serviceManager.js'
let license = { Users: 10 }; // Licença temporária

export const handleConnection = async (conn, req) => {
    const today = getDateNow();
    const query = parse(req.url, true).query;

    validateToken(query.token)
        .then(async function (decoded) {
            const user = await db.user.findOne({ where: { id: decoded.id } });
            if (!user) {
                log("Token JWT usuario inválido: ");
                conn.close();
                return;
            }

            log('webSocketController:handleConnection Token JWT válido:', user.name);
            if(user.email != 'admin@wecom.com.br'){
                const license = await licenseFileWithUsage();
                if (license.online.used >= license.online.total){
                    log("webSocketController:handleConnection: Limite de usuáros online atingido, contratar nova licença");
                    conn.close(1010);
                    return;
                }
            }
            //const session = generateGUID();
            conn.guid = user.guid;
            conn.dn = user.name;
            conn.sip = user.sip;
            conn.type = user.type;

            if (getConnections().length > 0) {
                const foundConn = getConnections().filter(c => c === conn);
                if (foundConn.length === 0) {
                    log("webSocketController:handleConnection connectionsUser: not found conn");
                    //conn.session = session;
                    addConnection(conn);
                    
                }
            } else {
                log("webSocketController:handleConnection connectionsUser: connectionsUser.length == 0");
                //conn.session = session;
                addConnection(conn);
            }
        })
        .catch(function (result) {
            log("webSocketController: Token JWT inválido: ", result);
            conn.close();
        });

    conn.on('message', async message => {
        try {
            const today = getDateNow();
            const obj = JSON.parse(message);
            log(`################################# Mensagem recebida do cliente ${conn.dn} : ${JSON.stringify(obj)}`);
            if (obj.mt == "Ping") {
                conn.send(JSON.stringify({mt: "Pong"}))
                return;
            }
            switch(obj.api){
                case "user":
                    //#region MESSAGENS
                    if (obj.mt == "Message") {
                        log("webSocketController::Message msg:" + obj.msg +" ::::::from =>"+conn.guid+ " ::::::to =>"+obj.to);

                        
                        const resultInsertMessage = await db.message.create({
                            chat_id: 'emergencys',
                            from_guid: conn.guid,
                            to_guid: obj.to,
                            date: String(getDateNow()),
                            msg:obj.msg
                        })
                        if(resultInsertMessage){
                            const resultSend = await send(obj.to, { api: "user", mt: "Message", src: conn.guid, msg: obj.msg, id: resultInsertMessage.id, result: [resultInsertMessage] })
                            conn.send(JSON.stringify({api: "user", mt: "MessageResult", delivered: resultSend, msg_id: resultInsertMessage.id, result: [resultInsertMessage]}))
                        }   
                    }
                    if (obj.mt == "ChatDelivered") {

                        await db.message.update({
                            delivered: String(getDateNow())
                        },{
                            where: {
                                id: obj.msg_id
                            }
                        })
                        conn.send(JSON.stringify({ api: "user", mt: "UpdateChatSuccess" }));

                        const data = await db.message.findAll({
                            where: {
                                id: obj.msg_id
                                }
                        })

                        log("ChatDelivered: Mensagem " + JSON.stringify(data))
                        if(data.length>0){
                            log("ChatDelivered: Mensagem[0].from_guid " + JSON.stringify(data[0].from_guid))
                            send(data[0].from_guid, { api: "user", mt:"ChatDelivered", id: obj.msg_id, result: data})    
                        }
                    }
                    if (obj.mt == "ChatRead") {
                        await db.message.update({
                            read: String(getDateNow())
                        },{
                            where: {
                                id: obj.msg_id
                            }
                        })
                        conn.send(JSON.stringify({ api: "user", mt: "UpdateChatSuccess" }));

                        const data = await db.message.findAll({
                            where: {
                                id: obj.msg_id
                                }
                        })

                        log("ChatRead: Mensagem " + JSON.stringify(data))
                        if(data.length>0){
                            log("ChatRead: Mensagem[0].from_guid " + JSON.stringify(data[0].from_guid))
                            send(data[0].from_guid, { api: "user", mt: "ChatRead", id: obj.msg_id, result: data })    
                        }

                    }
                    if (obj.mt == "SelectMessageHistorySrc") {

                        const data = await db.message.findAll({
                            where: {
                            [Op.or]: [
                                {
                                from_guid: obj.to,
                                to_guid: conn.guid
                                },
                                {
                                from_guid: conn.guid,
                                to_guid: obj.to
                                }
                            ]
                            },
                            order: [['id', 'desc']],
                            limit: 50,
                            raw: true
                        })
                        // Manually sort the data in ascending order
                        data.sort((a, b) => a.id - b.id);
                        
                        conn.send(JSON.stringify({ api: "user", mt: "SelectMessageHistoryResultSrc", result: data, src: obj.src }))

                    }
                    if(obj.mt == "SelectAllMessagesSrc"){ //Quando loga para retornar útimo valor de cada sensor na tabela
                        const query = `WITH ranked_records AS (
                                            SELECT
                                                *,
                                                ROW_NUMBER() OVER (PARTITION BY from_guid, to_guid ORDER BY date DESC) AS rn
                                            FROM
                                                tbl_messages
                                            WHERE
                                                from_guid = '${conn.guid}' OR to_guid = '${conn.guid}'
                                        )
                                        SELECT
                                            *
                                        FROM
                                            ranked_records
                                        WHERE
                                            rn = 1;`;

                        // Execute a consulta usando sequelize.query()
                        const result = await db.sequelize.query(query, {
                            type: QueryTypes.SELECT
                        });
                        //const filteredResult = filterNonNullColumns(result);
                            
                        conn.send(JSON.stringify({ api: "user", mt: "SelectAllMessagesSrcResult", result: JSON.stringify(result), src: obj.src }))
                    }
                    //#endregion
                    //#region INICIALIZAÇÃO
                    if (obj.mt == "TableUsers") {
                        log("webSocketController: TableUsers: reducing the pbxTableUser object to send to user");
                        var list_users = await db.user.findAll({
                            attributes:['id', 'name', 'guid', 'email', 'sip']
                        });
                        conn.send(JSON.stringify({ api: "user", mt: "TableUsersResult", src: obj.src, result: list_users }));
                        
                        const pbxUsers = await pbxTableUsers();
                        conn.send(JSON.stringify({ api: "user", mt: "PbxTableUsersResult", src: obj.src, result: pbxUsers }));
                        requestPresences(conn.guid)
                        const msgs = await db.message.findAll({
                            where: {
                                to_guid: conn.guid,
                                read: null
                                }
                        })
                        msgs.forEach((msg)=>{
                            conn.send(JSON.stringify({ api: "user", mt: "Message", src: msg.from_guid, msg: msg.msg, id: msg.id, result: [msg] }))
                        })

                        const configResult = await db.config.findAll();
                        conn.send(JSON.stringify({ api: "user", mt: "ConfigResult", result: configResult }));

                        const connectionsUser = await getConnections()
                        connectionsUser.forEach(c =>{
                            conn.send(JSON.stringify({api: "user", mt: "CoreUserOnline", guid: c.guid }));
                        })

                        const calls = await db.call.findAll({
                            where:{
                                guid: conn.guid,
                                status: 1,
                                call_ended: null
                            }
                        });

                        const usersInn = await pbxTableUsers()
                        const userInn = usersInn.filter(u => u.guid == conn.sip )[0]
                        
                        if(calls.length>0){
                            await Promise.all(calls.map(async c => {
                                const deviceInn = userInn.devices.find(d => d.hw === c.device);
                                if (deviceInn) {
                                    c.setDataValue('deviceText', deviceInn.text);
                                }
                            }));
                        }
                        conn.send(JSON.stringify({ api: "user", mt: "CallsInCurse", result: calls }));

                        log(await rccMonitor(conn.guid))
                    }
                    //#endregion
                    //#region BOTÕES
                    if (obj.mt == "UpdateButton") {
                        const objToUpdate = {
                            muted: Boolean(obj.muted)

                        } 
                        
                        const objToUpdateResult = await db.button.update(objToUpdate,{
                            where: {
                                id: parseInt(obj.btn_id),
                            },
                            });
                            
                            const objToResult = await db.button.findOne({
                            where: {
                                id: parseInt(obj.btn_id),
                            },
                            });
                            
                        conn.send(JSON.stringify({ api: "user", mt: "UpdateButtonSuccess", result: objToResult }))
                    }
                    if (obj.mt == "TriggerCall") {
                        
                        let result = await makeCall(conn.guid, obj.btn_id)
                        
                        log("webSocketController:TriggerCall: result : " + JSON.stringify(result));

                        conn.send(JSON.stringify({ api: "user", mt: "TriggerCallResult", result: result }));

                        return;
                        
                    }
                    if (obj.mt == "ConnectCall") {
                        
                        let result = await connectCall(conn.guid, obj.device, obj.call)
                        
                        log("webSocketController:ConnectCall: result : " + JSON.stringify(result));

                        conn.send(JSON.stringify({ api: "user", mt: "ConnectCallResult", result: result }));

                        return;
                        
                    }
                    if (obj.mt == "HeldCall") {
                        
                        let result = await heldCall(conn.guid, obj.btn_id)
                        
                        log("webSocketController:HeldCall: result : " + JSON.stringify(result));

                        conn.send(JSON.stringify({ api: "user", mt: "HeldCallResult", result: result }));

                        return;
                        
                    }
                    if (obj.mt == "HeldIncomingCall") {
                        
                        let result = await heldIncomingCall(conn.guid, obj.device, obj.num, obj.call)
                        
                        log("webSocketController:HeldIncomingCall: result : " + JSON.stringify(result));

                        conn.send(JSON.stringify({ api: "user", mt: "HeldIncomingCallResult", result: result }));

                        return;
                        
                    }
                    if (obj.mt == "RetrieveCall") {
                        
                        let result = await retrieveCall(conn.guid, obj.btn_id)
                        
                        log("webSocketController:RetrieveCall: result : " + JSON.stringify(result));

                        conn.send(JSON.stringify({ api: "user", mt: "RetrieveCallResult", result: result }));

                        return;
                        
                    }
                    if (obj.mt == "RetrieveIncomingCall") {
                        
                        let result = await retrieveIncomingCall(conn.guid, obj.device, obj.num, obj.call)
                        
                        log("webSocketController:RetrieveIncomingCall: result : " + JSON.stringify(result));

                        conn.send(JSON.stringify({ api: "user", mt: "RetrieveIncomingCallResult", result: result }));

                        return;
                        
                    }
                    if (obj.mt == "RedirectCall") {
                        
                        let result = await redirectCall(conn.guid, obj.btn_id, obj.destination)
                        
                        log("webSocketController:RedirectCall: result : " + JSON.stringify(result));

                        conn.send(JSON.stringify({ api: "user", mt: "RedirectCallResult", result: result }));

                        return;
                        
                    }
                    if (obj.mt == "RedirectIncomingCall") {
                        
                        let result = await redirectIncomingCall(conn.guid, obj.device, obj.call, obj.destination)
                        
                        log("webSocketController:RedirectIncomingCall: result : " + JSON.stringify(result));

                        conn.send(JSON.stringify({ api: "user", mt: "RedirectIncomingCallResult", result: result }));

                        return;
                        
                    }
                    if (obj.mt == "SendDtfmDigits") {
                        
                        let result = await dtmfCall(conn.guid, obj.btn_id, obj.digit)
                        
                        log("webSocketController:SendDtfmDigits: result : " + JSON.stringify(result));

                        conn.send(JSON.stringify({ api: "user", mt: "SendDtfmDigitsResult", result: result }));

                        return;
                        
                    }
                    if (obj.mt == "SendDtfmDigitsIncomingCall") {
                        
                        let result = await dtmfIncomingCall(conn.guid, obj.device, obj.call, obj.digit)
                        
                        log("webSocketController:SendDtfmDigitsIncomingCall: result : " + JSON.stringify(result));

                        conn.send(JSON.stringify({ api: "user", mt: "SendDtfmDigitsIncomingCallResult", result: result }));

                        return;
                        
                    }
                    if (obj.mt == "EndCall") {

                        let result = await clearCall(conn.guid, obj.btn_id)

                        conn.send(JSON.stringify({ api: "user", mt: "EndCallResult", result: result }));
                        return;
                    }
                    if (obj.mt == "EndIncomingCall") {

                        let result = await clearIncomingCall(conn.guid, obj.device, obj.num)

                        conn.send(JSON.stringify({ api: "user", mt: "EndIncomingCallResult", result: result }));
                        return;
                    }
                    if (obj.mt == "TriggerStartOpt") { //Chamado quando usuário ativa uma Opt
                        //intert into DB the event
                        var msg = { guid: conn.guid, name: "opt", date: getDateNow(), status: "open", details: obj.btn_id }
                        log("webSocketController:TriggerStartOpt: will insert it on DB : " + JSON.stringify(msg));
                        var result = await db.activity.create(msg)
                        conn.send(JSON.stringify({ api: "user", mt: "TriggerStartOptResult", src: result }));
                    }
                    if (obj.mt == "TriggerCombo") {
                        //trigger the combo function
                        var result = await comboManager(parseInt(obj.btn_id), conn.guid, obj.mt);
                        //intert into DB the event
                        log("webSocketController:: insert into DB = user " + conn.guid);
    
                        var msg = { guid: conn.guid, name: "combo", date: today, status: "start", details: obj.prt }
                        var resultInsert = await db.activity.create(msg)
                        conn.send(JSON.stringify(result));
                        log("webSocketController:: will insert it on DB : " + JSON.stringify(msg));
                        //insertTblActivities(msg);
                    }
                    if (obj.mt == "StopCombo") {
                        //trigger the combo function
                        //var result = comboManager(parseInt(obj.btn_id), conn.guid, obj.mt);
                        //intert into DB the event
                        log("webSocketController:: insert into DB = user " + conn.guid);
    
                        var msg = { guid: conn.guid, name: "combo", date: today, status: "stop", details: obj.prt }
                        log("webSocketController:: will insert it on DB : " + JSON.stringify(msg));
                        var resultInsert = await db.activity.create(msg)
                        //insertTblActivities(msg);
                        //respond success to the client
                        conn.send(JSON.stringify({ api: "user", mt: "ComboSuccessTrigged", src: obj.prt, btn_id: String(obj.btn_id) }));
                    }
                    if (obj.mt == "SelectButtons") { //Chamado quando o app é aberto e retorna todos os botões do usuário
                        selectButtons(conn.guid)
                        break;
                    }
                    if (obj.mt == "TriggerAlarm") { //Chamado quando o usuário pressiona um Botão de alarme na tela
                        const TriggerAlarmResult = await TriggerAlarm(conn.guid, obj.prt, obj.btn_id)
                        
                        //trigger the HTTP server
                        const urlEnable = await db.config.findOne({where:{
                            entry: 'urlEnable'
                        }})
                        if (urlEnable.value == 'true') {
                            const urlalarmserver = await db.config.findOne({where:{
                                entry: 'urlalarmserver'
                            }})
                            const sendResult = await sendHttpPostRequest(urlalarmserver.value, {From: conn.sip, AlarmID: obj.prt}, '{}')
                            log('TriggerAlarm urlalamrserver result '+ sendResult)
                            //callHTTPSServer(parseInt(obj.prt), conn.guid);
                        }

                        const btn = await db.button.findOne({where:{
                            id: obj.btn_id
                        }})
                        
                        //intert into DB the event
                        var msg = { guid: conn.guid, from: conn.guid, name: "alarm", date: getDateNow(), status: "out", details: btn.button_name, prt: obj.prt }
                        log("webSocketController:: will insert it on DB : " + JSON.stringify(msg));
                        const resultInsert = await db.activity.create(msg)
                        conn.send(JSON.stringify({ api: "user", mt: "TriggerAlarmResult", result: TriggerAlarmResult, src: resultInsert }));
                    }
                    if (obj.mt == "TriggerStopAlarm") { //Chamado quando o usuário pressiona um Botão de alarme na tela
                        const TriggerStopAlarmResult = await TriggerStopAlarm(conn.guid, obj.prt)
                        
                        //trigger the HTTP server
                        const urlEnable = await db.config.findOne({where:{
                            entry: 'urlEnable'
                        }})
                        if (urlEnable.value == 'true') {
                            const urlalarmserver = await db.config.findOne({where:{
                                entry: 'urlalarmserver'
                            }})
                            const sendResult = await sendHttpPostRequest(urlalarmserver.value, {From: conn.sip, AlarmID: obj.prt}, '{}')
                            log('TriggerStopAlarm urlalamrserver result '+ sendResult)
                            //callHTTPSServer(parseInt(obj.prt), conn.guid);
                        }

                        const btn = await db.button.findOne({where:{
                            id: obj.btn_id
                        }})

                        //intert into DB the event
                        var msg = { guid: conn.guid, from: conn.guid, name: "alarm", date: getDateNow(), status: "stop", details: btn.button_name, prt: obj.prt }
                        log("webSocketController:: will insert it on DB : " + JSON.stringify(msg));
                        const resultInsert = await db.activity.create(msg)
                        conn.send(JSON.stringify({ api: "user", mt: "TriggerStopAlarmResult", result: TriggerStopAlarmResult, btn_id: obj.btn_id, src: resultInsert }));
                    }
                    //#endregion
                    //#region SENSORS
                    if(obj.mt == "SelectSensors"){ //Envia todos os devices e seus parametros a partir dos gateways cadastrados
                        const devices = await getDevices();
                        conn.send(JSON.stringify({ api: "user", mt: "SelectSensorsResult", result: devices }));
                                    
                    }
                    if (obj.mt == "SelectDeviceHistory") { //Chamado quando o usuário seleciona um Sensor nas Opções
                        // const query = `SELECT *
                        //                 FROM (
                        //                     SELECT *, ROW_NUMBER() OVER (PARTITION BY sensor_name ORDER BY id DESC) as row_num
                        //                     FROM iot_devices_history
                        //                 ) AS subquery
                        //                 WHERE row_num <= 10 AND sensor_name 
                        //             `;
                        // Execute a consulta usando sequelize.query()
                        //var result = await db.sequelize.query(query, {
                        //    type: QueryTypes.SELECT
                        //});


                        var result = await db.iotDevicesHistory.findAll({
                            where: {
                                deveui : obj.id
                            },
                            order: [
                                ['id', 'DESC']
                            ],
                            limit: 10,
                            raw:true
                        });

                        const filteredResult = filterNonNullColumns(result);

                        conn.send(JSON.stringify({ api: "user", mt: "SelectDeviceHistoryResult", result: JSON.stringify(filteredResult) }))
                    }
                    if(obj.mt == "SelectAllSensorInfoSrc"){ //Quando loga para retornar útimo valor de cada sensor na tabela
                        const query = `SELECT *
                                        FROM (
                                            SELECT *, ROW_NUMBER() OVER (PARTITION BY sensor_name ORDER BY id DESC) as row_num
                                            FROM iot_devices_history
                                        ) AS subquery
                                        WHERE row_num <= 1
                                    `;

                        // Execute a consulta usando sequelize.query()
                        const result = await db.sequelize.query(query, {
                            type: QueryTypes.SELECT
                        });
                        const filteredResult = filterNonNullColumns(result);
                            
                        conn.send(JSON.stringify({ api: "user", mt: "SelectAllSensorInfoResultSrc", result: JSON.stringify(filteredResult), src: obj.src }))
                    }
                    //#endregion
                    //#region IOT Controller
                    if (obj.mt == "TriggerCommand") { //Chamado quando o usuário pressiona um Botão de comando na tela
                        const btn = await db.button.findOne({where:{
                            id: obj.btn_id
                        }})

                        const triggerResult = await TriggerCommand(btn.gateway_id, btn.button_device, btn.button_prt)
                        
                        conn.send(JSON.stringify({ api: "user", mt: "TriggerCommandResult", result: triggerResult }))
                        //trigger the HTTP server
                        const urlEnable = await db.config.findOne({where:{
                            entry: 'urlEnable'
                        }})
                        if (urlEnable.value == 'true') {
                            const urlalarmserver = await db.config.findOne({where:{
                                entry: 'urlalarmserver'
                            }})
                            const sendResult = await sendHttpPostRequest(urlalarmserver.value, {From: conn.guid, AlarmID: btn.button_prt}, '{}')
                            log('webSocketController:TriggerCommand urlalamrserver result '+ sendResult)
                            //callHTTPSServer(parseInt(obj.prt), conn.guid);
                        }

                        //intert into DB the event
                        log("webSocketController:TriggerCommand insert into DB = user " + conn.dn);

                        var msg = { guid: conn.guid, from: conn.guid, name: "command", date: getDateNow(), status: "out", details: btn.button_name, prt: btn.button_prt }
                        log("webSocketController:TriggerCommand will insert it on DB : " + JSON.stringify(msg));
                        const resultInsert = await db.activity.create(msg)
                        log("webSocketController:TriggerCommand inserted it on DB result id: " + JSON.stringify(resultInsert.id));

                    }
                    //#endregion
                    break;
                case "admin":
                    //#region INICIALIZAÇÃO
                    if (obj.mt == "TableUsers") {
                        log("webSocketController: TableUsers: reducing the pbxTableUser object to send to user");
                        var list_users = await db.user.findAll({
                            attributes:['id','name', 'guid', 'email', 'sip', 'password', 'createdAt', 'updatedAt', 'type']
                        });
                        conn.send(JSON.stringify({ api: "admin", mt: "TableUsersResult", src: obj.src, result: list_users }));
                        const pbxUsers = await pbxTableUsers();
                        conn.send(JSON.stringify({ api: "admin", mt: "PbxTableUsersResult", src: obj.src, result: pbxUsers }));
                        

                        // const conns = getConnections()
                        // conns.forEach((c)=>{
                        //     conn.send(JSON.stringify({ mt: "UserOnline", session: c.session, guid: c.guid }));
                        // })
                        requestPresences(conn.guid)

                        const configResult = await db.config.findAll();
                        conn.send(JSON.stringify({ api: "admin", mt: "ConfigResult", result: configResult }));

                        const connectionsUser = await getConnections()
                        connectionsUser.forEach(c =>{
                            conn.send(JSON.stringify({api: "admin", mt: "CoreUserOnline", guid: c.guid }));
                        })
                    }
                    if(obj.mt == "RestartService"){
                        restartService('core-service');
                    }
                    //#endregion
                    //#region CONFIG
                    if (obj.mt == "UpdateConfig") {
                        const objToUpdate ={
                            value: String(obj.vl), 
                            updatedAt: getDateNow()

                        }
                        const updateConfigResult = await db.config.update(objToUpdate,
                            {
                                where: {
                                entry: obj.entry,
                                },
                            });
                        conn.send(JSON.stringify({ api: "admin", mt: "UpdateConfigSuccess", result: updateConfigResult }));
                    }
                    if (obj.mt == "AddConfig") {
                        const objToInsert = {
                            entry: String(obj.entry),
                            value: String(obj.vl),
                            createdAt: getDateNow(),
                        }
                        const insertConfigResult = await db.config.create(objToInsert)
                        conn.send(JSON.stringify({ api: "admin", mt: "AddConfigSuccess", result: insertConfigResult }));
                    }
                    if(obj.mt == "PbxStatus"){
                        const status = await pbxStatus()
                        conn.send(JSON.stringify({ api: "admin", mt: "PbxStatusResult", result: status }));
                    }
                    if(obj.mt == "DelConnUser"){
                        if (getConnections().length > 0) {
                            const foundConn = getConnections().filter(c => c.guid === obj.guid)[0];
                            if (foundConn.length != 0) {
                                log(`webSocketController:DelConnUser: connectionUser to remove ${foundConn.dn}`);
                                foundConn.send(JSON.stringify({ api: "user", mt: "ConnRemovedByAdmin", from: conn.dn }))
                                foundConn.close(1011);
                                await removeConnection(foundConn);
                                conn.send(JSON.stringify({ api: "admin", mt: "DelConnUserResult", result: true }));
                                
                            }
                        } else {
                            log("webSocketController:DelConnUser: connectionsUser not found");
                            conn.send(JSON.stringify({ api: "admin", mt: "DelConnUserResult", result: false }));
                        }
                        
                    }
                    //#endregion
                    //#region LICENSE
                    if (obj.mt == "ConfigLicense") {
                        const lic = await licenseFileWithUsage()
                        const licenseKey = await returnLicenseKey();
                        const licenseFile = await returnLicenseFile();


                        conn.send(JSON.stringify({
                            api: "admin",
                            mt: "ConfigLicenseResult",
                            license: lic,
                            licenseKey: licenseKey.value,
                            licenseFile: licenseFile.value,
                            licenseActive: JSON.stringify(lic),
                            licenseInstallDate: licenseFile.updatedAt
                        }));
                    }
                    if (obj.mt == "DebugConnections") {
                        const conns = await getConnections()
                        


                        conn.send(JSON.stringify({
                            api: "admin",
                            mt: "DebugConnectionsResult",
                            conns: conns
                        }));
                    }
                    if (obj.mt == "DevCreateLicense") {
                        
                        const hash = await encryptLicenseFile(JSON.stringify(obj.value), obj.key);
                        conn.send(JSON.stringify({
                            api: "admin",
                            mt: "DevCreateLicenseResult",
                            licenseHash: hash
                        }));
                    }
                    //#endregion
                    //#region BUTTONS
                    if (obj.mt == "InsertButton") {
                        const objToInsert = {
                            button_name: String(obj.name), 
                            button_prt : String(obj.value), 
                            button_user : String(obj.guid),
                            button_type : String(obj.type),
                            button_device : String(obj.device),
                            img : String(obj.img),
                            gateway_id : obj.gateway_id,
                            create_user : String(conn.guid),
                            page : String(obj.page),
                            position_x : String(obj.x),
                            position_y: String(obj.y),
                            createdAt: getDateNow(),

                        } 
                        const insertButtonResult = await db.button.create(objToInsert)
                        conn.send(JSON.stringify({ api: "admin", mt: "InsertButtonSuccess", result: insertButtonResult }));
                        send(obj.guid,{ api: "user", mt: "IncreaseButtons", result: insertButtonResult })
                    }
                    if (obj.mt == "UpdateButton") {
                        const objToUpdate = {
                            button_name: String(obj.name), 
                            button_prt : String(obj.value), 
                            button_user : String(obj.guid),
                            button_type : String(obj.type),
                            button_device : String(obj.device),
                            img: String(obj.img),
                            gateway_id : obj.gateway_id,
                            page : String(obj.page),
                            position_x : String(obj.x),
                            position_y: String(obj.y),
                            updatedAt: getDateNow(),

                        } 
                        const objToUpdateResult = await db.button.update(objToUpdate,{
                            where: {
                                id: obj.id,
                            },
                            });

                            const objToResult = await db.button.findOne({
                            where: {
                                id: obj.id,
                            },
                            });

                        conn.send(JSON.stringify({ api: "admin", mt: "UpdateButtonSuccess", result: objToResult }));

                        send(obj.guid,{ api: "user", mt: "UpdateButtonSuccess", result: objToResult })
                    }
                    if (obj.mt == "UpdateSensorButton") {
                        const objToUpdate = {
                            button_name: String(obj.name), 
                            button_prt : String(obj.value), 
                            button_user : String(obj.guid),
                            button_type : String(obj.type),
                            sensor_min_threshold : String(obj.min),
                            sensor_max_threshold : String(obj.max),
                            sensor_type: String(obj.sensorType),
                            img: String(obj.img),
                            page : String(obj.page),
                            position_x : String(obj.x),
                            position_y: String(obj.y),
                            updatedAt: getDateNow(),

                        } 
                        const objToUpdateResult = await db.button.update(objToUpdate,{
                            where: {
                                id: obj.id,
                            },
                            });
                            const objToResult = await db.button.findOne({
                            where: {
                                id: obj.id,
                            },
                            });
                        conn.send(JSON.stringify({ api: "admin", mt: "UpdateButtonSuccess", result: objToResult }));
                        send(obj.guid,{ api: "user", mt: "UpdateButtonSuccess", result: objToResult })
                    }
                    if (obj.mt == "InsertComboButton") {
                        const objComboToInsert = {
                            button_name: String(obj.name), 
                            button_prt : String(obj.value),
                            button_user : String(obj.guid),
                            button_type : String(obj.type),
                            button_type_1 : String(obj.type1),
                            button_type_2 : String(obj.type2),
                            button_type_3 : String(obj.type3),
                            button_type_4 : String(obj.type4),
                            button_device : String(obj.device),
                            create_user : String(conn.guid),
                            page : String(obj.page),
                            position_x : String(obj.x),
                            position_y: String(obj.y),
                            createdAt: getDateNow(),

                        } 
                        const objComboToInsertResult = await db.button.create(objComboToInsert);
                        conn.send(JSON.stringify({ api: "admin", mt: "InsertButtonSuccess", result: objComboToInsertResult }));
                        send(obj.guid,{ api: "user", mt: "IncreaseButtons", result: objComboToInsertResult })
                    }
                    if (obj.mt == "UpdateComboButton") {
                        const objComboToUpdate = {
                            button_name: String(obj.name), 
                            button_prt : String(obj.value),
                            button_user : String(obj.guid),
                            button_type : String(obj.type),
                            button_type_1 : String(obj.type1),
                            button_type_2 : String(obj.type2),
                            button_type_3 : String(obj.type3),
                            button_type_4 : String(obj.type4),
                            button_device : String(obj.device),
                            page : String(obj.page),
                            position_x : String(obj.x),
                            position_y: String(obj.y),
                            updatedAt: getDateNow(),

                        } 
                        const objComboToUpdateResult = await db.button.update(objComboToUpdate,{
                            where: {
                                id: obj.id,
                            },
                            });
                            const objToResult = await db.button.findOne({
                            where: {
                                id: obj.id,
                            },
                            });
                        conn.send(JSON.stringify({ api: "admin", mt: "UpdateButtonSuccess", result: objToResult }));
                        send(obj.guid,{ api: "user", mt: "UpdateButtonSuccess", result: objToResult })
                        
                    }
                    if (obj.mt == "SelectButtons") {
                        const allButtons = await db.button.findAll();
                        conn.send(JSON.stringify({ api: "admin", mt: "SelectButtonsSuccess", result: JSON.stringify(allButtons, null, 4) }));
                    }
                    if (obj.mt == "DeleteButtons") {
                        const btnDeleted = await db.button.findOne({
                            where: {
                                id: obj.id,
                            },
                            });

                        var result = await db.button.destroy({
                            where: {
                                id: obj.id,
                            },
                            });
                        //const allButtons = await db.button.findAll();
                        conn.send(JSON.stringify({ api: "admin", mt: "DeleteButtonsSuccess", id_deleted: obj.id, result: result}));
                        send(btnDeleted.button_user,{ api: "user", mt: "DeleteButtonsSuccess", id_deleted: obj.id })
                    }
                    if (obj.mt == "InsertSensorButton") {
                        const objSensorToInsert = {
                            button_name: String(obj.name), 
                            button_prt : String(obj.value), 
                            button_user : String(obj.guid),
                            button_type : String(obj.type),
                            sensor_min_threshold : String(obj.min),
                            sensor_max_threshold : String(obj.max),
                            img: String(obj.img),
                            sensor_type : String(obj.sensorType),
                            create_user : String(conn.guid),
                            page : String(obj.page),
                            position_x : String(obj.x),
                            position_y: String(obj.y),
                            createdAt: getDateNow() //new Date().toISOString().slice(0, 16),

                        } 
                        const insertSensorResult = await db.button.create(objSensorToInsert)
                        conn.send(JSON.stringify({ api: "admin", mt: "InsertButtonSuccess", result: insertSensorResult }));
                        send(obj.guid,{ api: "user", mt: "IncreaseButtons", result: insertSensorResult })
                    }
                    //#endregion
                    //#region ACTIONS
                    if (obj.mt == "InsertAction") {
                        const objToInsert ={
                            action_name: String(obj.name), 
                            action_start_prt:String(obj.startPrt), // '20'
                            action_start_type:String(obj.startType), // 'minValue' || 'maxValue' || 'alarm' || 'number'
                            action_start_device_parameter:String(obj.startDevicePrt), // 'temperature'
                            action_start_device:String(obj.startDevice), // 'Sensor Técnica'
                            action_exec_user:String(obj.guid), // 'guid'
                            create_user : String(conn.guid),
                            action_exec_type:String(obj.execType), // 'command' || 'number' || 'alarm' || 'button'
                            action_exec_type_command_mode:String(obj.commandMode), //'on' || 'off'
                            action_exec_prt:String(obj.execPrt), //'gpoi_out_1'
                            action_exec_device:String(obj.execDevice), // 'Milesight Device EUID' || 'Sofphone SIP Device'

                            createdAt: getDateNow()//new Date().toISOString().slice(0, 16),

                        }
                        var result = await db.action.create(objToInsert);
                        conn.send(JSON.stringify({ api: "admin", mt: "InsertActionMessageSuccess", result: result }));
                    }
                    if (obj.mt == "UpdateAction") {
                        const objToUpdate ={
                            action_name: String(obj.name), //'Demo'
                            action_start_prt:String(obj.startPrt), // '20'
                            action_start_type:String(obj.startType), // 'minValue' || 'maxValue' || 'alarm' || 'number'
                            action_start_device_parameter:String(obj.startDevicePrt), // 'temperature'
                            action_start_device:String(obj.startDevice), // 'Sensor Técnica'
                            action_exec_user:String(obj.guid), // 'guid'
                            create_user : String(conn.guid),
                            action_exec_type:String(obj.execType), // 'command' || 'number' || 'alarm' || 'button'
                            action_exec_type_command_mode:String(obj.commandMode), //'on' || 'off'
                            action_exec_prt:String(obj.execPrt), //'gpoi_out_1'
                            action_exec_device:String(obj.execDevice), // 'Milesight Device EUID' || 'Sofphone SIP Device'

                            updatedAt: getDateNow()//new Date().toISOString().slice(0, 16),

                        }
                        await db.action.update(objToUpdate,
                            {
                                where: {
                                id: obj.id,
                                },
                            });
                        const objToResult = await db.action.findOne({
                            where: {
                                id: obj.id,
                            },
                            });
                        conn.send(JSON.stringify({ api: "admin", mt: "UpdateActionMessageSuccess", result: objToResult }));
                    
                    }
                    if (obj.mt == "SelectActions") {
                        const actions = await db.action.findAll();
                        conn.send(JSON.stringify({ api: "admin", mt: "SelectActionsMessageSuccess", result: JSON.stringify(actions, null, 4) }));
                    }
                    if (obj.mt == "DeleteActions") {
                        var result = await db.action.destroy({
                            where: {
                                id: obj.id,
                            },
                            });
                        //const allActions = await db.action.findAll();
                        conn.send(JSON.stringify({ api: "admin", mt: "DeleteActionsMessageSuccess", id_deleted: obj.id, result: result }));

                    }
                    //#endregion
                    //#region REPORTS
                    if (obj.mt == "SelectFromReports") {
                        switch (obj.src) {
                            case "RptCalls":
                                var query = "SELECT * FROM tbl_calls";
                                var conditions = [];
                                if (obj.guid) conditions.push("guid ='" + obj.guid + "'");
                                if (obj.number) conditions.push("number ='" + obj.number + "'");
                                if (obj.from) conditions.push("call_started >'" + obj.from + "'");
                                if (obj.to) conditions.push("call_started <'" + obj.to + "'");
                                if (conditions.length > 0) {
                                    query += " WHERE " + conditions.join(" AND ");
                                }
                                query += " ORDER BY id"
                                // Execute a consulta usando sequelize.query()
                                var data = await db.sequelize.query(query, {
                                    type: QueryTypes.SELECT
                                });
                                var jsonData = JSON.stringify(data, null, 4);
                                let jsonDataWithLinks = [];
                                returnRecordLink(data).then(result => {
                                        jsonDataWithLinks = result;
                                        const strData = JSON.stringify(jsonDataWithLinks, null, 4);
                                        var maxFragmentSize = 50000; // Defina o tamanho máximo de cada fragmento
                                        var fragments = [];
                                        for (var i = 0; i < strData.length; i += maxFragmentSize) {
                                            fragments.push(strData.substr(i, maxFragmentSize));
                                        }
                                        // Enviar cada fragmento separadamente através do websocket
                                        for (var i = 0; i < fragments.length; i++) {
                                            var isLastFragment = i === fragments.length - 1;
                                            conn.send(JSON.stringify({ api: "admin", mt: "SelectFromReportsSuccess", result: fragments[i], lastFragment: isLastFragment, totalFragments:fragments.length, thisFragment:i+1, src: obj.src }));
                                        }
                                        }).catch(err => {
                                        jsonDataWithLinks = err;
                                        const strData = JSON.stringify(jsonDataWithLinks, null, 4);
                                        var maxFragmentSize = 50000; // Defina o tamanho máximo de cada fragmento
                                        var fragments = [];
                                        for (var i = 0; i < strData.length; i += maxFragmentSize) {
                                            fragments.push(strData.substr(i, maxFragmentSize));
                                        }
                                        // Enviar cada fragmento separadamente através do websocket
                                        for (var i = 0; i < fragments.length; i++) {
                                            var isLastFragment = i === fragments.length - 1;
                                            conn.send(JSON.stringify({ api: "admin", mt: "SelectFromReportsSuccess", result: fragments[i], lastFragment: isLastFragment, totalFragments:fragments.length, thisFragment:i+1, src: obj.src }));
                                        }
                                        });
                                        
                                break;
                            case "RptActivities":
                                var query = "SELECT *  FROM tbl_activities";
                                var conditions = [];
                                if (obj.guid) conditions.push("guid ='" + obj.guid + "'");
                                if (obj.from) conditions.push("date >'" + obj.from + "'");
                                if (obj.to) conditions.push("date <'" + obj.to + "'");
                                if (obj.event) conditions.push("name ='" + obj.event + "'");
                                if (conditions.length > 0) {
                                    query += " WHERE " + conditions.join(" AND ");
                                }
                                // Execute a consulta usando sequelize.query()
                                var data = await db.sequelize.query(query, {
                                    type: QueryTypes.SELECT
                                });
                                query += " ORDER BY id";
                                var jsonData = JSON.stringify(data, null, 4);
                                var maxFragmentSize = 50000; // Defina o tamanho máximo de cada fragmento
                                var fragments = [];
                                for (var i = 0; i < jsonData.length; i += maxFragmentSize) {
                                    fragments.push(jsonData.substr(i, maxFragmentSize));
                                }
                                // Enviar cada fragmento separadamente através do websocket
                                for (var i = 0; i < fragments.length; i++) {
                                    var isLastFragment = i === fragments.length - 1;
                                    conn.send(JSON.stringify({ api: "admin", mt: "SelectFromReportsSuccess", result: fragments[i], lastFragment: isLastFragment, totalFragments:fragments.length, thisFragment:i+1, src: obj.src }));
                                }
                                break;
                            case "RptAvailability":
                                var query = "SELECT * FROM tbl_availability";
                                var conditions = [];
                                if (obj.guid) conditions.push("guid ='" + obj.guid + "'");
                                if (obj.from) conditions.push("date >'" + obj.from + "'");
                                if (obj.to) conditions.push("date <'" + obj.to + "'");
                                if (conditions.length > 0) {
                                    query += " WHERE " + conditions.join(" AND ");
                                }
                                query += " ORDER BY id";
                                // Execute a consulta usando sequelize.query()
                                var data = await db.sequelize.query(query, {
                                    type: QueryTypes.SELECT
                                });
                                var jsonData = JSON.stringify(data, null, 4);
                                var maxFragmentSize = 50000; // Defina o tamanho m�ximo de cada fragmento
                                var fragments = [];
                                for (var i = 0; i < jsonData.length; i += maxFragmentSize) {
                                    fragments.push(jsonData.substr(i, maxFragmentSize));
                                }
                                // Enviar cada fragmento separadamente atrav�s do websocket
                                for (var i = 0; i < fragments.length; i++) {
                                var isLastFragment = i === fragments.length - 1;
                                    conn.send(JSON.stringify({
                                    api: "admin",
                                    mt: "SelectFromReportsSuccess",
                                    result: fragments[i],
                                    lastFragment: isLastFragment,
                                    totalFragments:fragments.length, 
                                    thisFragment:i+1,
                                    src: obj.src
                                    }));
                                }
                                break;
                            case "RptSensors":
                                    var query;
                                    if (obj.parameter) {
                                        query = "SELECT id, sensor_name, " + obj.parameter + ", date FROM iot_devices_history";
                                        var conditions = [];
                                        if (obj.deveui) conditions.push("deveui ='" + obj.deveui + "'");
                                        if (obj.from) conditions.push("date >'" + obj.from + "'");
                                        if (obj.to) conditions.push("date <'" + obj.to + "'");
                                        if (conditions.length > 0) {
                                            query += " AND " + conditions.join(" AND ");
                                        }
                                    } else {
                                        query = "SELECT * FROM iot_devices_history";
                                        var conditions = [];
                                        if (obj.deveui) conditions.push("deveui ='" + obj.deveui + "'");
                                        if (obj.from) conditions.push("date >'" + obj.from + "'");
                                        if (obj.to) conditions.push("date <'" + obj.to + "'");
                                        if (conditions.length > 0) {
                                            query += " WHERE " + conditions.join(" AND ");
                                        }

                                    }
                                    query += " ORDER BY id";
                                    // Execute a consulta usando sequelize.query()
                                    var data = await db.sequelize.query(query, {
                                        type: QueryTypes.SELECT
                                    });
                                    const filteredResult = filterNonNullColumns(data);
                                    //ajuste para enviar as colunas nao nulas do sensor
                                    var jsonData = JSON.stringify(filteredResult, null, 4);
                                    var maxFragmentSize = 50000; // Defina o tamanho máximo de cada fragmento
                                    var fragments = [];
                                    for (var i = 0; i < jsonData.length; i += maxFragmentSize) {
                                        fragments.push(jsonData.substr(i, maxFragmentSize));
                                    }
                                    // Enviar cada fragmento separadamente através do websocket
                                    for (var i = 0; i < fragments.length; i++) {
                                        var isLastFragment = i === fragments.length - 1;
                                        conn.send(JSON.stringify({ api: "admin", mt: "SelectFromReportsSuccess", result: fragments[i], lastFragment: isLastFragment, totalFragments:fragments.length, thisFragment:i+1, src: obj.src }));
                                    }
                                break;
                            case "RptMessages":
                                var query = "SELECT * FROM tbl_messages";
                                var conditions = [];
                                if (obj.guid) conditions.push("from_guid ='" + obj.guid + "'");
                                if (obj.from) conditions.push("date >'" + obj.from + "'");
                                if (obj.to) conditions.push("date <'" + obj.to + "'");
                                if (conditions.length > 0) {
                                    query += " WHERE " + conditions.join(" AND ");
                                }
                                query += " ORDER BY id";
                                // Execute a consulta usando sequelize.query()
                                var data = await db.sequelize.query(query, {
                                    type: QueryTypes.SELECT
                                });
                                var jsonData = JSON.stringify(data, null, 4);
                                var maxFragmentSize = 50000; // Defina o tamanho m�ximo de cada fragmento
                                var fragments = [];
                                for (var i = 0; i < jsonData.length; i += maxFragmentSize) {
                                    fragments.push(jsonData.substr(i, maxFragmentSize));
                                }
                                // Enviar cada fragmento separadamente atrav�s do websocket
                                for (var i = 0; i < fragments.length; i++) {
                                var isLastFragment = i === fragments.length - 1;
                                    conn.send(JSON.stringify({
                                    api: "admin",
                                    mt: "SelectFromReportsSuccess",
                                    result: fragments[i],
                                    lastFragment: isLastFragment,
                                    totalFragments:fragments.length, 
                                    thisFragment:i+1,
                                    src: obj.src
                                    }));
                                }
                            break;
                            case "RptIotHistory":
                                var query;
                                if (obj.parameter) {
                                    query = "SELECT id, sensor_name, " + obj.parameter + ", date FROM iot_devices_history";
                                    var conditions = [];
                                    if (obj.deveui) conditions.push("deveui ='" + obj.deveui + "'");
                                    if (obj.from) conditions.push("date >'" + obj.from + "'");
                                    if (obj.to) conditions.push("date <'" + obj.to + "'");
                                    if (conditions.length > 0) {
                                        query += " AND " + conditions.join(" AND ");
                                    }
                                } else {
                                    query = "SELECT * FROM iot_devices_history";
                                    var conditions = [];
                                    if (obj.deveui) conditions.push("deveui ='" + obj.deveui + "'");
                                    if (obj.from) conditions.push("date >'" + obj.from + "'");
                                    if (obj.to) conditions.push("date <'" + obj.to + "'");
                                    if (conditions.length > 0) {
                                        query += " WHERE " + conditions.join(" AND ");
                                    }

                                }
                                query += " ORDER BY id";
                                // Execute a consulta usando sequelize.query()
                                var data = await db.sequelize.query(query, {
                                    type: QueryTypes.SELECT
                                });
                                const filteredResultImages = filterNonNullColumns(data);
                                var jsonData = JSON.stringify(filteredResultImages, null, 4);
                                var maxFragmentSize = 50000; // Defina o tamanho máximo de cada fragmento
                                var fragments = [];
                                for (var i = 0; i < jsonData.length; i += maxFragmentSize) {
                                    fragments.push(jsonData.substr(i, maxFragmentSize));
                                }
                                // Enviar cada fragmento separadamente através do websocket
                                for (var i = 0; i < fragments.length; i++) {
                                    var isLastFragment = i === fragments.length - 1;
                                    conn.send(JSON.stringify({ api: "admin", mt: "SelectFromReportsSuccess", result: fragments[i], lastFragment: isLastFragment, totalFragments:fragments.length, thisFragment:i+1, src: obj.src }));
                                }
                                break;
                        }        
                    }       
                    if (obj.mt == "DeleteFromReports") {
                        switch (obj.src) {
                            case "RptCalls":
                                var query = "DELETE FROM tbl_calls";
                                var conditions = [];
                                if (obj.to) conditions.push("call_started <'" + obj.to + "'");
                                if (conditions.length > 0) {
                                    query += " WHERE " + conditions.join(" AND ");
                                }
                                // Database.exec(query)
                                //     .oncomplete(function (data) {
                                //         log("result=" + JSON.stringify(data, null, 4));
                                //         conn.send(JSON.stringify({ api: "admin", mt: "DeleteFromReportsSuccess", src: obj.src }));
                                //     })
                                //     .onerror(function (error, errorText, dbErrorCode) {
                                //         conn.send(JSON.stringify({ api: "admin", mt: "Error", result: String(errorText), src: obj.src }));
                                //     });
                                // Execute a consulta usando sequelize.query()
                                var data = await db.sequelize.query(query, {
                                    type: QueryTypes.DELETE
                                });
                                log("result=" + JSON.stringify(data, null, 4));
                                conn.send(JSON.stringify({ api: "admin", mt: "DeleteFromReportsSuccess", src: obj.src }));
                                
                                break;
                            case "RptActivities":
                                var query = "DELETE FROM tbl_activities";
                                var conditions = [];
                                if (obj.to) conditions.push("date <'" + obj.to + "'");
                                if (conditions.length > 0) {
                                    query += " WHERE " + conditions.join(" AND ");
                                }
                                // Database.exec(query)
                                //     .oncomplete(function (data) {
                                //         log("result=" + JSON.stringify(data, null, 4));
                                //         conn.send(JSON.stringify({ api: "admin", mt: "DeleteFromReportsSuccess", src: obj.src }));
                                //     })
                                //     .onerror(function (error, errorText, dbErrorCode) {
                                //         conn.send(JSON.stringify({ api: "admin", mt: "Error", result: String(errorText), src: obj.src }));
                                //     });
                                var data = await db.sequelize.query(query, {
                                    type: QueryTypes.DELETE
                                });
                                log("result=" + JSON.stringify(data, null, 4));
                                conn.send(JSON.stringify({ api: "admin", mt: "DeleteFromReportsSuccess", src: obj.src }));
                                
                                break;
                            case "RptAvailability":
                                var query = "DELETE FROM tbl_availability";
                                var conditions = [];
                                if (obj.to) conditions.push("date <'" + obj.to + "'");
                                if (conditions.length > 0) {
                                    query += " WHERE " + conditions.join(" AND ");
                                }

                                // Database.exec(query)
                                //     .oncomplete(function (data) {
                                //         log("result=" + JSON.stringify(data, null, 4));
                                //         conn.send(JSON.stringify({ api: "admin", mt: "DeleteFromReportsSuccess", src: obj.src }));
                                //     })
                                //     .onerror(function (error, errorText, dbErrorCode) {
                                //         conn.send(JSON.stringify({ api: "admin", mt: "Error", result: String(errorText), src: obj.src }));
                                //     });
                                var data = await db.sequelize.query(query, {
                                    type: QueryTypes.DELETE
                                });
                                log("result=" + JSON.stringify(data, null, 4));
                                conn.send(JSON.stringify({ api: "admin", mt: "DeleteFromReportsSuccess", src: obj.src }));
                                
                                break;
                            case "RptSensors":
                                var query = "DELETE FROM iot_devices_history";
                                var conditions = [];
                                if (obj.to) conditions.push("date <'" + obj.to + "'");
                                if (conditions.length > 0) {
                                    query += " WHERE " + conditions.join(" AND ");
                                }
                                var data = await db.sequelize.query(query, {
                                    type: QueryTypes.DELETE
                                });
                                log("result=" + JSON.stringify(data, null, 4));
                                conn.send(JSON.stringify({ api: "admin", mt: "DeleteFromReportsSuccess", src: obj.src }));
                                
                            break;
                        }
                    }
                    //#endregion
                    //#region SENSORES
                    if (obj.mt == "SelectSensorName") {
                        var result = await db.iotDevicesHistory.findAll({
                            attributes: ['sensor_name'],
                            group: ['sensor_name']
                        });
                        conn.send(JSON.stringify({ api: "admin", mt: "SelectSensorNameResult", result: JSON.stringify(result) }))   
                        
                    }
                    if(obj.mt == "SelectSensors"){
                        const devices = await getDevices();
                        // Envia a resposta via websocket
                        conn.send(JSON.stringify({ api: "admin", mt: "SelectSensorsResult", result: devices }));
                                    
                    }
                    //#endregion
                    //#region GATEWAYS
                    if (obj.mt == "UpdateGateway") {
                        let objToUpdate;
                        if(obj.password != ''){
                            objToUpdate ={
                                host: obj.host,
                                userapi: obj.apiuser,
                                password: obj.password, 
                                nickname: obj.nickname,
                                updatedAt: getDateNow()
    
                            }
                        }else{
                            objToUpdate ={
                                host: obj.host,
                                userapi: obj.apiuser,
                                nickname: obj.nickname,
                                updatedAt: getDateNow()
    
                            }
                        }
                        
                        const updateGatewayResult = await db.gateway.update(objToUpdate,
                            {
                                where: {
                                id: obj.id,
                                },
                            });
                        const gateways = await db.gateway.findOne({
                            where: {
                                id: obj.id,
                            },
                            });
                        conn.send(JSON.stringify({ api: "admin", mt: "UpdateGatewaySuccess", result: updateGatewayResult , gateways: gateways}));
                    }
                    if (obj.mt == "AddGateway") {
                        const objToInsert = {
                            host: obj.host,
                            userapi: obj.apiuser,
                            password: obj.password, 
                            nickname: obj.nickname,
                            createdAt: getDateNow(),
                        }
                        const insertGatewayResult = await addGateway(objToInsert);
                        conn.send(JSON.stringify(insertGatewayResult));
                    }
                    if (obj.mt == "SelectGateways") {
                        const gateways = await db.gateway.findAll();
                        conn.send(JSON.stringify({ api: "admin", mt: "SelectGatewaysSuccess", result: gateways}));
                    }
                    if (obj.mt == "DeleteGateway") {
                        var result = await db.gateway.destroy({
                            where: {
                                id: obj.id,
                            },
                            });
                        const objToResult = await db.gateway.findAll();
                        conn.send(JSON.stringify({ api: "admin", mt: "DeleteGatewaySuccess", id_deleted: obj.id, result: objToResult}));

                    }
                    //#endregion
                    //#region IOT CAMERAS
                    if (obj.mt == "UpdateCamera") {
                        let objToUpdate = {
                            nickname: obj.nickname,
                            mac: obj.mac,
                            create_user: conn.guid,
                            updatedAt: getDateNow()

                        }
                        const updateCameraResult = await db.camera.update(objToUpdate,
                            {
                                where: {
                                id: obj.id,
                                },
                            });
                            const objToResult = await db.camera.findOne({
                                where: {
                                    id: obj.id,
                                },
                                });
                        conn.send(JSON.stringify({ api: "admin", mt: "UpdateCameraSuccess", result: objToResult}));
                    }
                    if (obj.mt == "AddCamera") {
                        const objToInsert = {
                            nickname: obj.nickname,
                            mac: obj.mac,
                            create_user: conn.guid,
                            createdAt: getDateNow(),
                        }
                        const insertCameraResult = await db.camera.create(objToInsert)
                        conn.send(JSON.stringify({ api: "admin", mt: "AddCameraSuccess", result: insertCameraResult}));
                    }
                    if (obj.mt == "SelectCameras") {
                        const cameras = await db.camera.findAll();
                        conn.send(JSON.stringify({ api: "admin", mt: "SelectCamerasSuccess", result: cameras}));
                    }
                    if (obj.mt == "DeleteCamera") {
                        var result = await db.camera.destroy({
                            where: {
                                id: obj.id,
                            },
                            });
                        const objToResult = await db.camera.findOne({
                            where: {
                                id: obj.id,
                            },
                        });
                        conn.send(JSON.stringify({ api: "admin", mt: "DeleteCameraSuccess", id_deleted: obj.id, result: objToResult}));

                    }
                    //#endregion
                    break;
            }
        } catch (error) {
            console.error('Erro ao processar mensagem:', error);
        }
    });

    conn.on('close', async () => {
        //log(await rccMonitorEnd(conn.guid))
        removeConnection(conn);
    });
    conn.on('error', async () => {
        //log(await rccMonitorEnd(conn.guid))
        removeConnection(conn);
    });
};

const filterNonNullColumns = (records) => {
    return records.map(record => {
        let filteredRecord = {};
        try{
            for (const [key, value] of Object.entries(record)) {
                if (value !== null && value !== undefined) {
                    filteredRecord[key] = value;
                }
            }
        }catch(e){

        }
        return filteredRecord;
    });
};
