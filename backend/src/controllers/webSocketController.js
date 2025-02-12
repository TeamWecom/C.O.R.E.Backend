// controllers/webSocketController.js
import { parse } from 'url';
import { validateToken } from '../utils/validadeToken.js';
import { getDateNow } from '../utils/getDateNow.js';
import db from '../managers/databaseSequelize.js';
import { QueryTypes, Op } from 'sequelize';
import { log } from '../utils/log.js';
import {addGateway, getDevices, TriggerCommand} from '../controllers/milesightController.js'
import { makeConference,
    makeCall, 
    heldCall, 
    retrieveCall, 
    clearCall, 
    comboManager, 
    triggerAlarm, 
    triggerStopAlarm, 
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
    dtmfIncomingCall, 
    monitorCalendarCall
} from './buttonController.js';
import { send, 
    broadcast, 
    addConnection, 
    removeConnection, 
    getConnections 
} from '../managers/webSocketManager.js';
import { generateGUID } from '../utils/generateGuid.js';
import {sendHttpPostRequest, sendHttpGetRequest} from '../managers/httpClient.js';
import {pbxStatus, pbxTableUsers, requestPresences, returnRecordFileByRecordId, returnRecordLink} from '../controllers/innovaphoneController.js'
import { licenseFileWithUsage, 
    returnLicenseFile, 
    returnLicenseKey, 
    encryptLicenseFile
} from './licenseController.js';
import { restartService } from '../utils/serviceManager.js';
import { getDetailsForActivity } from '../utils/actionsUtils.js';
import { openAIRequestTestCredits, openAIRequestTranscription } from '../utils/openAiUtils.js';
import {listCalendars, startOAuthFlow, deleteOAuthFlow, getOngoingEventGuests, loadGoogleTokens} from '../managers/googleCalendarManager.js';
import { updateButtonNameGoogleCalendar } from '../controllers/buttonController.js';
import { initAwsSNS } from '../managers/awsManager.js';
import { deleteMicrosoftOAuthFlow, getMicrosoftOngoingEventGuests, listMicrosoftCalendars, loadMicrosoftTokens, startMicrosoftOAuthFlow } from '../managers/microsoftCalendarManager.js';
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
                    conn.close(4010);
                    return;
                }
            }
            //const session = generateGUID();
            conn.guid = user.guid;
            conn.dn = user.name;
            conn.sip = user.sip;
            conn.type = user.type;
            conn.token = query.token;
            conn.isMobile = query.isMobile

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
            log("webSocketController: Token JWT inválido: "+ result);
            conn.close(4401);
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
                            chat_id: 'core',
                            from_guid: conn.guid,
                            to_guid: obj.to,
                            date: String(getDateNow()),
                            msg:obj.msg
                        })
                        if(resultInsertMessage){
                            const resultSend = await send(obj.to, { api: "user", mt: "Message", src: conn.guid, msg: obj.msg, id: resultInsertMessage.id, result: [resultInsertMessage] })
                            conn.send(JSON.stringify({api: "user", mt: "MessageResult", delivered: resultSend, msg_id: resultInsertMessage.id, result: [resultInsertMessage]}))
                            //intert into DB the event
                            var msg = { 
                                guid: obj.to, 
                                from: conn.guid, 
                                name: "message", 
                                date: getDateNow(), 
                                status: "inc", 
                                details: resultInsertMessage.id, 
                                prt: obj.msg 
                            }
                            //log("webSocketController:Message: will insert it on DB : " + JSON.stringify(msg));
                            let resultInsert = await db.activity.create(msg)
                            resultInsert.details = resultInsertMessage
                            send(obj.to, { api: "user", mt: "getHistoryResult", result: [resultInsert] });
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
                        conn.send(JSON.stringify({ api: "user", mt: "PbxTableUsersResult", src: obj.src, result: pbxUsers}));
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

                        const preference = await db.preference.findAll({
                            attributes:[
                                'pageName',
                                'pageNumber',
                                'isMobile'
                            ],
                            where: {
                                guid: conn.guid,
                                isMobile: conn.isMobile || false
                            },
                            order: [['pageNumber', 'asc']]
                        })
                        conn.send(JSON.stringify({ api: "user", mt: "SelectUserPreferencesResult", result: preference, guid: conn.guid }))

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
                        if(Array.isArray(usersInn) && usersInn.length>0){
                            const userInn = usersInn.filter(u => u.guid == conn.sip )[0]
                        
                            if(calls.length>0){
                                await Promise.all(calls.map(async c => {
                                    //Adicionar a coluna deviceText
                                    const deviceInn = userInn.devices.find(d => d.hw === c.device);
                                    if (deviceInn) {
                                        c.setDataValue('deviceText', deviceInn.text);
                                    }
                                    //substituir o guid pelo num quando houver btn_id
                                    if(c.btn_id != ''){
                                        const userInnCall = usersInn.filter(u => u.guid == c.number )[0]
                                        if (userInnCall) {
                                            c.setDataValue('number', userInnCall.e164);
                                        }
    
                                    }
                                }));
                            }
                        }
                        
                        conn.send(JSON.stringify({ api: "user", mt: "CallsInCurse", result: calls }));
                        await rccMonitor(conn.guid)
                    }
                    if (obj.mt == "getHistory") {
                        log("webSocketController:getHistory:");
                    
                        // Verificar se 'startId' foi fornecido
                        const startId = obj.startId || null;
                        const whereCondition = {
                            guid: conn.guid
                        };
                    
                        if (startId) {
                            // Se 'startId' for fornecido, busca os registros com id menor que 'startId'
                            whereCondition.id = {
                                [db.Sequelize.Op.lt]: startId
                            };
                        }
                    
                        const history = await db.activity.findAll({
                            where: whereCondition,
                            order: [['id', 'desc']],
                            limit: 50
                        });

                        // Mapeia e processa cada item do histórico para substituir 'details' conforme necessário
                        const processedHistory = await Promise.all(history.map(getDetailsForActivity));
                    
                        conn.send(JSON.stringify({ api: "user", mt: "getHistoryResult", src: obj.src, result: processedHistory }));
                    }
                    //#endregion
                    //#region PÁGINAS
                    if(obj.mt == "SelectUserPreferences"){
                        const data = await db.preference.findAll({
                            attributes:[
                                'pageName',
                                'pageNumber',
                                'isMobile'
                            ],
                            where: {
                                guid: conn.guid,
                                isMobile: conn.isMobile || false
                            },
                            order: [['pageNumber', 'asc']]
                        })
                        conn.send(JSON.stringify({ api: "user", mt: "SelectUserPreferencesResult", result: data, guid: conn.guid }))
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
                        
                        let result = await makeCall(conn.guid, obj.btn_id, obj.device, obj.num)
                        
                        log("webSocketController:TriggerCall: result : " + JSON.stringify(result));

                        conn.send(JSON.stringify({ api: "user", mt: "TriggerCallResult", result: result }));

                        return;
                        
                    }
                    if (obj.mt == "TriggerGoogleCalendarCall") {
                        const btn = await db.button.findOne({where:{id: parseInt(obj.btn_id)}})

                        const guests = await getOngoingEventGuests(btn.calendar_id)
                        if(guests.length>0){
                            const sip = guests[0].email.split('@')[0];
                            const usersInn = await pbxTableUsers()
                            const userInn = usersInn.filter(u => u.sip == sip)[0]
                            if(userInn){
                                let result = await makeCall(conn.guid, obj.btn_id, btn.button_device, userInn.e164)
                                log("webSocketController:TriggerGoogleCalendarCall: result : " + JSON.stringify(result));
                                conn.send(JSON.stringify({ api: "user", mt: "TriggerCallResult", result: result }));
                            }else{
                                log("webSocketController:TriggerGoogleCalendarCall: no userInn to this guest " + JSON.stringify(userInn));
                            }
                            if(guests.length>1){
                                //Start call monitor function to redirect if its not answered
                                monitorCalendarCall(btn, guests, usersInn)
                            }
                        }else{
                            log("webSocketController:TriggerGoogleCalendarCall: no guests at this moment " + JSON.stringify(userInn));
                        }
                        return; 
                    }
                    if (obj.mt == "TriggerMicrosoftCalendarCall") {
                        const btn = await db.button.findOne({where:{id: parseInt(obj.btn_id)}})

                        const guests = await getMicrosoftOngoingEventGuests(btn.calendar_id)
                        if(guests.length>0){
                            const sip = guests[0].email.split('@')[0];
                            const usersInn = await pbxTableUsers()
                            const userInn = usersInn.filter(u => u.sip == sip)[0]
                            if(userInn){
                                let result = await makeCall(conn.guid, obj.btn_id, btn.button_device, userInn.e164)
                                log("webSocketController:TriggerMicrosoftCalendarCall: result : " + JSON.stringify(result));
                                conn.send(JSON.stringify({ api: "user", mt: "TriggerCallResult", result: result }));
                            }else{
                                log("webSocketController:TriggerMicrosoftCalendarCall: no userInn to this guest " + JSON.stringify(userInn));
                            }
                            if(guests.length>1){
                                //Start call monitor function to redirect if its not answered
                                monitorCalendarCall(btn, guests, usersInn)
                            }
                        }else{
                            log("webSocketController:TriggerMicrosoftCalendarCall: no guests at this moment " + JSON.stringify(userInn));
                        }
                        return; 
                    }
                    if (obj.mt == "TriggerConference") {
                        
                        let result = await makeConference(conn.guid, obj.btn_id, obj.calls)
                        
                        log("webSocketController:TriggerConference: result : " + JSON.stringify(result));

                        conn.send(JSON.stringify({ api: "user", mt: "TriggerConferenceResult", result: result }));

                        return;
                        
                    }
                    if (obj.mt == "ConnectCall") {
                        
                        let result = await connectCall(conn.guid, obj.device, obj.call)
                        
                        log("webSocketController:ConnectCall: result : " + JSON.stringify(result));

                        conn.send(JSON.stringify({ api: "user", mt: "ConnectCallResult", result: result }));

                        return;
                        
                    }
                    if (obj.mt == "HeldCall") {
                        
                        let result = await heldCall(conn.guid, obj.btn_id, obj.device, obj.call)
                        
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
                        
                        let result = await retrieveCall(conn.guid, obj.btn_id, obj.device, obj.call)
                        
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
                        
                        let result = await redirectCall(conn.guid, obj.btn_id, obj.destination, obj.device, obj.call)
                        
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
                        
                        let result = await dtmfCall(conn.guid, obj.btn_id, obj.digit, obj.device, obj.call)
                        
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

                        let result = await clearCall(conn.guid, obj.btn_id, obj.device, obj.call)

                        conn.send(JSON.stringify({ api: "user", mt: "EndCallResult", result: result }));
                        return;
                    }
                    if (obj.mt == "EndIncomingCall") {

                        let result = await clearIncomingCall(conn.guid, obj.device, obj.num)

                        conn.send(JSON.stringify({ api: "user", mt: "EndIncomingCallResult", result: result }));
                        return;
                    }
                    if (obj.mt == "TriggerStartOpt") { //Chamado quando usuário ativa uma Opt
                        const btn = await db.button.findOne({where:{
                            id: obj.btn_id
                        }})
                        //intert into DB the event
                        var msg = { 
                            guid: conn.guid, 
                            from:conn.guid, 
                            name: "opt", 
                            date: getDateNow(), 
                            status: "open", 
                            prt: btn.button_prt, 
                            details: btn.id
                        }
                        log("webSocketController:TriggerStartOpt: will insert it on DB : " + JSON.stringify(msg));
                        var result = await db.activity.create(msg)
                        result.details = btn;
                        conn.send(JSON.stringify({ api: "user", mt: "getHistoryResult", result: [result] }));
                    }
                    if (obj.mt == "TriggerCombo") {
                        //trigger the combo function
                        var result = await comboManager(parseInt(obj.btn_id), conn.guid, obj.mt);
                        //intert into DB the event
                        const btn = await db.button.findOne({where:{
                            id: obj.btn_id
                        }})
    
                        var msg = { 
                            guid: conn.guid, 
                            from: conn.guid, 
                            name: "combo", 
                            date: today, 
                            status: "start", 
                            prt: btn.button_prt, 
                            details: btn.id 
                        }
                        var resultInsert = await db.activity.create(msg)
                        conn.send(JSON.stringify(result));
                        log("webSocketController:: will insert it on DB : " + JSON.stringify(msg));
                    }
                    if (obj.mt == "SelectButtons") { //Chamado quando o app é aberto e retorna todos os botões do usuário     
                        await selectButtons(conn.guid, obj.api, conn.isMobile)
                        break;
                    }
                    if (obj.mt == "TriggerAlarm") { //Chamado quando o usuário pressiona um Botão de alarme na tela
                        const btn = await db.button.findOne({where:{
                            id: parseInt(obj.btn_id)
                        }})
                        const TriggerAlarmResult = await triggerAlarm(conn.guid, btn)
                        
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
                        
                        conn.send(JSON.stringify({ api: "user", mt: "TriggerAlarmResult", result: TriggerAlarmResult, src: obj.src }));
                    }
                    if (obj.mt == "TriggerStopAlarm") { //Chamado quando o usuário pressiona um Botão de alarme na tela
                        
                        const btn = await db.button.findOne({where:{
                            id: parseInt(obj.btn_id)
                        }})

                        const TriggerStopAlarmResult = await triggerStopAlarm(conn.guid, btn)
                        
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
           
                        conn.send(JSON.stringify({ api: "user", mt: "TriggerStopAlarmResult", result: TriggerStopAlarmResult, btn_id: obj.btn_id, src: obj.src }));
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
                                            SELECT *, ROW_NUMBER() OVER (PARTITION BY deveui ORDER BY id DESC) as row_num
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

                        var msg = { 
                            guid: conn.guid, 
                            from: conn.guid, 
                            name: "command", 
                            date: getDateNow(), 
                            status: "out", 
                            details: btn.id, 
                            prt: btn.button_prt 
                        }
                        //log("webSocketController:TriggerCommand will insert it on DB : " + JSON.stringify(msg));
                        let resultInsert = await db.activity.create(msg)
                        resultInsert.details = btn
                        //log("webSocketController:TriggerCommand inserted it on DB result id: " + JSON.stringify(resultInsert.id));
                        send(conn.guid, { api: "user", mt: "getHistoryResult", result: [resultInsert] });
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
                    //#region PÁGINAS 
                    if(obj.mt == "SelectUserPreferences"){
                        const data = await db.preference.findAll({
                            attributes:[
                                'pageName',
                                'pageNumber',
                                'isMobile',
                            ],
                            where: {
                                guid: obj.guid
                            },
                            order: [['pageNumber', 'asc']]
                        })
                        conn.send(JSON.stringify({ api: "admin", mt: "SelectUserPreferencesResult", result: data, guid: obj.guid }))
                        send(obj.guid,{ api: "user", mt: "SelectUserPreferencesResult", result: data, guid: obj.guid })
                    }
                    if (obj.mt == "SetPageName") {
                        const [record, created] = await db.preference.upsert(
                            { 
                                pageNumber: parseInt(obj.pageNumber),
                                pageName: String(obj.pageName),
                                guid: obj.guid,
                                isMobile: obj.isMobile || false
                            }
                        );

                        const result = await db.preference.findAll({
                            attributes:[
                                'pageName',
                                'pageNumber',
                                'isMobile'
                            ],
                            where: {
                                guid: obj.guid
                            },
                            order: [['pageNumber', 'asc']]
                        })
                        conn.send(JSON.stringify({ api: "admin", mt: "SelectUserPreferencesResult", result: result, guid: obj.guid }))
                        send(obj.guid,{ api: "user", mt: "SelectUserPreferencesResult", result: result, guid: obj.guid })
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
                        const configResult = await db.config.findAll();
                        conn.send(JSON.stringify({ api: "admin", mt: "ConfigResult", result: configResult }));
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
                    if (obj.mt == "UpdateConfigBackupSchedule") {
                        const backupFields = {
                            "backupUsername": obj.backupUsername,
                            "backupPassword": obj.backupPassword,
                            "backupFrequency": obj.backupFrequency,
                            "backupDay": obj.backupDay,
                            "backupHour": obj.backupHour,
                            "backupHost": obj.backupHost,
                            "backupPath": obj.backupPath,
                            "backupMethod": obj.backupMethod,
                          };
                        
                          try {
                            for (const [entry, value] of Object.entries(backupFields)) {
                              // Atualizar ou criar se não existir
                              await db.config.update({ value }, {
                                where: { entry }
                              });
                            }
                            conn.send(JSON.stringify({ api: "admin", mt: "UpdateConfigSuccess", result: [8] }));
                            log('webSocketController:UpdateConfigBackupSchedule: Backup config atualizado com sucesso!');
                          } catch (error) {
                            log('webSocketController:UpdateConfigBackupSchedule: Erro ao atualizar backup config:'+ error);
                          }

                        const updateConfigResult = await db.config.findAll();
                        conn.send(JSON.stringify({ api: "admin", mt: "ConfigResult", result: updateConfigResult }));
                    }
                    if (obj.mt == "UpdateConfigSmtp") {
                        const backupFields = {
                            "smtpUsername": obj.smtpUsername,
                            "smtpPassword": obj.smtpPassword,
                            "smtpHost": obj.smtpHost,
                            "smtpPort": obj.smtpPort,
                            "smtpSecure": obj.smtpSecure,
                        };
                        
                        try {
                            for (const [entry, value] of Object.entries(backupFields)) {
                                // Atualizar ou criar se não existir
                                await db.config.update({ value }, {
                                where: { entry }
                                });
                            }
                            log('webSocketController:UpdateConfigSmtp: config atualizado com sucesso!');
                            conn.send(JSON.stringify({ api: "admin", mt: "UpdateConfigSuccess", result: [5] }));
                        } catch (error) {
                            log('webSocketController:UpdateConfigSmtp: Erro ao atualizar config:'+ error);
                        }
                        
                        const updateConfigResult = await db.config.findAll();
                        conn.send(JSON.stringify({ api: "admin", mt: "ConfigResult", result: updateConfigResult }));
                    }
                    if (obj.mt == "UpdateConfigOpenAI") {
                        const backupFields = {
                            "openaiKey": obj.openaiKey,
                            "openaiOrg": obj.openaiOrg,
                            "openaiProj": obj.openaiProj,
                        };
                        
                        try {
                            for (const [entry, value] of Object.entries(backupFields)) {
                                // Atualizar ou criar se não existir
                                await db.config.update({ value }, {
                                where: { entry }
                                });
                            }
                            log('webSocketController:UpdateConfigOpenAI: Config atualizado com sucesso!');
                            conn.send(JSON.stringify({ api: "admin", mt: "UpdateConfigSuccess", result: [3] }));
                        } catch (error) {
                            log('webSocketController:UpdateConfigOpenAI: Erro ao atualizar config:'+ error);
                        }
                        
                        const updateConfigResult = await db.config.findAll();
                        conn.send(JSON.stringify({ api: "admin", mt: "ConfigResult", result: updateConfigResult }));
                    }
                    if (obj.mt == "UpdateConfigGoogleCalendar") {
                        const backupFields = {
                            "googleClientId": obj.googleClientId,
                            "googleClientSecret": obj.googleClientSecret,
                          };
                        
                        try {
                            for (const [entry, value] of Object.entries(backupFields)) {
                                // Atualizar ou criar se não existir
                                await db.config.update({ value }, {
                                where: { entry }
                                });
                            }
                            log('webSocketController:UpdateConfigGoogleCalendar: Config atualizado com sucesso!');
                            conn.send(JSON.stringify({ api: "admin", mt: "UpdateConfigSuccess", result: [2] }));
                        } catch (error) {
                            log('webSocketController:UpdateConfigGoogleCalendar: Erro ao atualizar config:'+ error);
                        }
                        
                        const updateConfigResult = await db.config.findAll();
                        conn.send(JSON.stringify({ api: "admin", mt: "ConfigResult", result: updateConfigResult }));
                    }
                    if (obj.mt == "UpdateConfigSms") {
                        const fields = {
                            "awsSnsKey": obj.awsSnsKey,
                            "awsSnsSecret": obj.awsSnsSecret,
                            "awsSnsRegion": obj.awsSnsRegion
                          };
                        
                        try {
                            for (const [entry, value] of Object.entries(fields)) {
                                // Atualizar ou criar se não existir
                                await db.config.update({ value }, {
                                where: { entry }
                                });
                            }
                            log('webSocketController:UpdateConfigSms: Config atualizado com sucesso!');
                            conn.send(JSON.stringify({ api: "admin", mt: "UpdateConfigSuccess", result: [2] }));
                        } catch (error) {
                            log('webSocketController:UpdateConfigSms: Erro ao atualizar config:'+ error);
                        }

                        await initAwsSNS();
                        
                        const updateConfigResult = await db.config.findAll();
                        conn.send(JSON.stringify({ api: "admin", mt: "ConfigResult", result: updateConfigResult }));
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
                    if (obj.mt == "GetOpenAiStatus") {
                        const result = await openAIRequestTestCredits();

                        conn.send(JSON.stringify({
                            api: "admin",
                            mt: "GetOpenAiStatusResult",
                            result: result
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
                            calendar_id : obj.calendar_id,
                            create_user : String(conn.guid),
                            page : String(obj.page),
                            position_x : String(obj.x),
                            position_y: String(obj.y),
                            createdAt: getDateNow(),
                            is_mobile: Boolean(obj.isMobile),

                        } 
                        const insertButtonResult = await db.button.create(objToInsert)
                        const insertButtonResultJSON = insertButtonResult.toJSON();
                        if(insertButtonResultJSON.button_type =='google_calendar'){
                            const calendars = await listCalendars();
                            const calendar = calendars.filter((c)=>{c.id == insertButtonResultJSON.button_name})[0]
                            if(calendar){
                                insertButtonResultJSON.button_name = calendar.summary;
                            }
                        }

                        conn.send(JSON.stringify({ api: "admin", mt: "InsertButtonSuccess", result: insertButtonResultJSON }));
                        send(obj.guid,{ api: "user", mt: "IncreaseButtons", result: insertButtonResultJSON })
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
                            calendar_id : obj.calendar_id,
                            page : String(obj.page),
                            position_x : String(obj.x),
                            position_y: String(obj.y),
                            updatedAt: getDateNow(),
                            is_mobile: Boolean(obj.isMobile),

                        } 
                        const objToUpdateResult = await db.button.update(objToUpdate,{
                            where: {
                                id: obj.id,
                            },
                        });
                        conn.send(JSON.stringify({ api: "admin", mt: "UpdateConfigSuccess", result: objToUpdateResult }));

                        const objToResult = await db.button.findOne({
                        where: {
                            id: obj.id,
                        },
                        });
                        const objToResultJSON = objToResult.toJSON();
                        const updatedButton = await updateButtonNameGoogleCalendar(objToResultJSON);
                        

                        conn.send(JSON.stringify({ api: "admin", mt: "UpdateButtonSuccess", result: updatedButton }));

                        send(obj.guid,{ api: "user", mt: "UpdateButtonSuccess", result: updatedButton })
                    }
                    if (obj.mt == "UpdateSensorButton") {
                        const objToUpdate = {
                            button_name: String(obj.name), 
                            button_prt : String(obj.value), 
                            button_user : String(obj.guid),
                            button_type : String(obj.type),
                            button_device: String(obj.device),
                            sensor_min_threshold : String(obj.min),
                            sensor_max_threshold : String(obj.max),
                            sensor_type: String(obj.sensorType),
                            img: String(obj.img),
                            page : String(obj.page),
                            position_x : String(obj.x),
                            position_y: String(obj.y),
                            updatedAt: getDateNow(),
                            is_mobile: Boolean(obj.isMobile),

                        } 
                        const objToUpdateResult = await db.button.update(objToUpdate,{
                            where: {
                                id: obj.id,
                            },
                        });
                        conn.send(JSON.stringify({ api: "admin", mt: "UpdateConfigSuccess", result: objToUpdateResult }));
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
                            is_mobile: Boolean(obj.isMobile),

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
                            is_mobile: Boolean(obj.isMobile),

                        } 
                        const objComboToUpdateResult = await db.button.update(objComboToUpdate,{
                            where: {
                                id: obj.id,
                            },
                        });
                        conn.send(JSON.stringify({ api: "admin", mt: "UpdateConfigSuccess", result: objComboToUpdateResult }));
                        const objToResult = await db.button.findOne({
                            where: {
                                id: obj.id,
                            },
                        });
                        conn.send(JSON.stringify({ api: "admin", mt: "UpdateButtonSuccess", result: objToResult }));
                        send(obj.guid,{ api: "user", mt: "UpdateButtonSuccess", result: objToResult })
                        
                    }
                    if (obj.mt == "SelectButtons") {
                        await selectButtons(conn.guid, obj.api);
                        break;
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
                            button_device: String(obj.device),
                            sensor_min_threshold : String(obj.min),
                            sensor_max_threshold : String(obj.max),
                            img: String(obj.img),
                            sensor_type : String(obj.sensorType),
                            create_user : String(conn.guid),
                            page : String(obj.page),
                            position_x : String(obj.x),
                            position_y: String(obj.y),
                            createdAt: getDateNow(), //new Date().toISOString().slice(0, 16),
                            is_mobile: Boolean(obj.isMobile),
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
                        try {
                            // 1. Buscar todas as ações
                            const actions = await db.action.findAll();
                        
                            // 2. Iterar pelas ações e buscar notificações relacionadas
                            const actionsWithNotifies = await Promise.all(actions.map(async (action) => {
                                const notifications = await db.actionNotifies.findAll({
                                    where: { action_id: action.id },
                                    attributes: ['id', 'email_phone', 'parameter']
                                });
                        
                                return {
                                    ...action.toJSON(), // Convertendo a ação em JSON
                                    notifications // Inclui notificações relacionadas
                                };
                            }));
                        
                            // 3. Enviar a lista combinada para o front-end
                            conn.send(JSON.stringify({
                                api: "admin",
                                mt: "SelectActionsMessageSuccess",
                                result: JSON.stringify(actionsWithNotifies, null, 4)
                            }));
                        } catch (error) {
                            console.error("Error fetching actions with notifications:", error);
                            conn.send(JSON.stringify({
                                api: "admin",
                                mt: "SelectActionsMessageError",
                                error: error.message
                            }));
                        }
                        
                        // const actions = await db.action.findAll();
                        // conn.send(JSON.stringify({ api: "admin", mt: "SelectActionsMessageSuccess", result: JSON.stringify(actions, null, 4) }));
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
                    if (obj.mt == "UpdateActionUserNotification") {
                        const actionId = String(obj.id);
                        const emails = obj.emails || [];
                        const smsPhones = obj.smsPhones || [];
                    
                        try {
                            // 1. Buscar os registros existentes no banco de dados
                            const existingNotifications = await db.actionNotifies.findAll({
                                where: { action_id: actionId },
                                attributes: ['id', 'email_phone', 'parameter']
                            });
                    
                            // 2. Criar listas dos novos registros recebidos
                            const newNotifications = [
                                ...emails.map(email => ({
                                    action_id: actionId,
                                    email_phone: 'email',
                                    parameter: email
                                })),
                                ...smsPhones.map(phone => ({
                                    action_id: actionId,
                                    email_phone: 'sms',
                                    parameter: phone
                                }))
                            ];
                    
                            // 3. Identificar registros para inclusão e exclusão
                            const notificationsToInsert = [];
                            const notificationsToKeep = new Set();
                    
                            newNotifications.forEach(newItem => {
                                const found = existingNotifications.find(existingItem =>
                                    existingItem.email_phone === newItem.email_phone &&
                                    existingItem.parameter === newItem.parameter
                                );
                    
                                if (!found) {
                                    notificationsToInsert.push(newItem); // Itens novos para inserção
                                } else {
                                    notificationsToKeep.add(found.id); // Itens existentes que devem ser mantidos
                                }
                            });
                    
                            // Excluir registros que não estão mais na nova lista
                            const idsToDelete = existingNotifications
                                .filter(existingItem => !notificationsToKeep.has(existingItem.id))
                                .map(item => item.id);
                    
                            if (idsToDelete.length > 0) {
                                await db.actionNotifies.destroy({
                                    where: { id: idsToDelete }
                                });
                            }
                    
                            // 4. Inserir os novos registros que não existiam
                            if (notificationsToInsert.length > 0) {
                                await db.actionNotifies.bulkCreate(notificationsToInsert);
                            }
                    
                            // 5. Buscar os registros atualizados para retorno
                            const updatedNotifications = await db.actionNotifies.findAll({
                                where: { action_id: actionId },
                                attributes: ['email_phone', 'parameter', 'updatedAt']
                            });
                    
                            // 6. Formatar os resultados para envio
                            const objToResult = {
                                action_id: actionId,
                                emails: updatedNotifications
                                    .filter(item => item.email_phone === 'email')
                                    .map(item => item.parameter),
                                smsPhones: updatedNotifications
                                    .filter(item => item.email_phone === 'sms')
                                    .map(item => item.parameter),
                                lastUpdate: updatedNotifications.length > 0
                                    ? updatedNotifications[0].updatedAt
                                    : null
                            };
                    
                            // 7. Enviar os dados de sucesso de volta
                            conn.send(JSON.stringify({
                                api: "admin",
                                mt: "UpdateActionUserNotificationSuccess",
                                result: objToResult
                            }));
                        } catch (error) {
                            log("Erro ao atualizar notificações:"+ error);
                            conn.send(JSON.stringify({
                                api: "admin",
                                mt: "UpdateActionUserNotificationError",
                                message: "Erro ao atualizar as notificações.",
                                error: error.message
                            }));
                        }
                    }
                    if (obj.mt == "SelectActionUserNotification") {
                        // Busca as notificações com base no action_id
                        const notifications = await db.actionNotifies.findAll({
                            where: { action_id: obj.id },
                            attributes: ['email_phone', 'parameter', 'updatedAt']
                        });

                        // Formata os dados para retorno
                        const objToResult = {
                            action_id: obj.id,
                            emails: notifications
                                .filter(item => item.email_phone === 'email')
                                .map(item => item.parameter),
                            smsPhones: notifications
                                .filter(item => item.email_phone === 'sms')
                                .map(item => item.parameter),
                            lastUpdate: notifications.length > 0
                                ? notifications[0].updatedAt
                                : null
                        };

                        // Envia os dados formatados de volta
                        conn.send(JSON.stringify({
                            api: "admin",
                            mt: "SelectActionUserNotificationSuccess",
                            result: objToResult
                        }));

                    }
                    //#endregion
                    //#region REPORTS
                    if (obj.mt == "SelectFromReports") {
                        switch (obj.src) {
                            case "RptCalls":
                                var query = `
                                    SELECT 
                                        c.*, 
                                        t.text 
                                    FROM 
                                        tbl_calls c
                                    LEFT JOIN 
                                        tbl_calls_transcription t 
                                    ON 
                                        c.id = t.call_id
                                `;

                                var conditions = [];
                                var replacements = {};

                                if (obj.guid) {
                                    conditions.push("c.guid = :guid");
                                    replacements.guid = obj.guid;
                                }
                                if (obj.number) {
                                    conditions.push("c.number = :number");
                                    replacements.number = obj.number;
                                }
                                if (obj.from) {
                                    conditions.push("c.call_started > :from");
                                    replacements.from = obj.from;
                                }
                                if (obj.to) {
                                    conditions.push("c.call_started < :to");
                                    replacements.to = obj.to;
                                }

                                if (conditions.length > 0) {
                                    query += " WHERE " + conditions.join(" AND ");
                                }

                                query += " ORDER BY c.id";

                                var data = await db.sequelize.query(query, {
                                    type: QueryTypes.SELECT,
                                    replacements
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
                    if(obj.mt == "GetTranscription") {
                        try{
                            const call_transcription = await db.callTranscription.findOne({where: {
                                call_id: obj.call
                            }})

                            if(!call_transcription){
                                //transcrever
                                const call = await db.call.findOne({where: {
                                    id: parseInt(obj.call)
                                }})
                                const audio = await returnRecordFileByRecordId(call.record_id)
                                if(audio){
                                    var result = await openAIRequestTranscription(audio);
                                    result.id = obj.call
                                    conn.send(JSON.stringify({ api: "admin", mt: "GetTranscriptionResult", call: obj.call, result: result }))    
                                    if(result.status == "OK"){
                                        let objToInsert = {
                                            call_id: obj.call,
                                            text: result.text,
                                            create_user: conn.guid,
                                            createdAt: getDateNow()
                
                                        }
                                        await db.callTranscription.create(objToInsert)
                                    }else {

                                        let objToInsert = {
                                            call_id: obj.call,
                                            text: 'noTranscription',
                                            create_user: conn.guid,
                                            createdAt: getDateNow()

                                        }
                                        await db.callTranscription.create(objToInsert)
                                    }
                                    return
                                }else{
                                    conn.send(JSON.stringify({ api: "admin", mt: "GetTranscriptionResult", call: obj.call, result: {id: obj.call, status: "NOK", text: "File not found"} }))    
                                    return
                                }
                            }else{
                                //já transcrevido
                                conn.send(JSON.stringify({ api: "admin", mt: "GetTranscriptionResult", call: obj.call, result: {id: obj.call, status: "OK", text: call_transcription.text} }))    
                                return
                            }
                        }catch(e){
                            conn.send(JSON.stringify({ api: "admin", mt: "GetTranscriptionResult", call: obj.call, result: {id: obj.call, status: "NOK", text: e} }))
                            return
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
                    // #region Google OAuth
                    if(obj.mt =="RequestGoogleOAuthStatus"){
                        // Início do fluxo
                        const status = await loadGoogleTokens();
                        send(conn.guid, { api: "admin", mt: "RequestGoogleOAuthStatusResult", result: status });
                        
                    }
                    if(obj.mt =="RequestGoogleOAuth"){
                        // Início do fluxo
                        startOAuthFlow(conn.guid)
                        .then(async () => {
                        
                            log('webSocketController:RequestGoogleCalendars: Ok');
                        })
                        .catch((err) => log(`webSocketController:RequestGoogleCalendars: Erro:${err}`));
                    }
                    if (obj.mt === "RequestGoogleOAuthRemove") {
                        deleteOAuthFlow(conn.guid)
                          .then(() => log("webSocketController:RequestGoogleOAuthRemove: Ok"))
                          .catch((err) => log(`webSocketController:RequestGoogleOAuthRemove: Erro: ${err}`));
                      }
                      
                    if(obj.mt =="RequestGoogleCalendars"){
                        const calendars = await listCalendars();
                        log(`webSocketController:RequestGoogleCalendars: lenght:${calendars.length}`);
                        send(conn.guid, { api: "admin", mt: "RequestGoogleCalendarsResult", result: calendars });
                    }
                    if(obj.mt =="RequestOngoingEventGuests"){
                        const guests = await getOngoingEventGuests(obj.id);
                        log(`webSocketController:RequestOngoingEventGuests: lenght:${guests.length}`);
                        send(conn.guid, { api: "admin", mt: "RequestOngoingEventGuestsResult", result: guests });
                    }
                    
                    // #endregion
                    // #region Microsoft OAuth
                    if(obj.mt =="RequestMicrosoftOAuthStatus"){
                        // Início do fluxo
                        const status = await loadMicrosoftTokens();
                        send(conn.guid, { api: "admin", mt: "RequestMicrosoftOAuthStatusResult", result: status });
                        
                    }
                    if(obj.mt =="RequestMicrosoftOAuth"){
                        // Início do fluxo
                        startMicrosoftOAuthFlow(conn.guid)
                        .then(async () => {
                        
                            log('webSocketController:RequestMicrosoftCalendars: Ok');
                        })
                        .catch((err) => log(`webSocketController:RequestMicrosoftCalendars: Erro:${err}`));
                    }
                    if (obj.mt === "RequestMicrosoftOAuthRemove") {
                        deleteMicrosoftOAuthFlow(conn.guid)
                          .then(() => log("webSocketController:RequestMicrosoftOAuthRemove: Ok"))
                          .catch((err) => log(`webSocketController:RequestMicrosoftOAuthRemove: Erro: ${err}`));
                      }
                      
                    if(obj.mt =="RequestMicrosoftCalendars"){
                        const calendars = await listMicrosoftCalendars();
                        log(`webSocketController:RequestMicrosoftCalendars: lenght:${calendars.length}`);
                        send(conn.guid, { api: "admin", mt: "RequestMicrosoftCalendarsResult", result: calendars });
                    }
                    if(obj.mt =="RequestMicrosoftOngoingEventGuests"){
                        const guests = await getMicrosoftOngoingEventGuests(obj.id);
                        log(`webSocketController:RequestOngoingEventGuests: lenght:${guests.length}`);
                        send(conn.guid, { api: "admin", mt: "RequestOngoingEventGuestsResult", result: guests });
                    }
                    
                    // #endregion
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
