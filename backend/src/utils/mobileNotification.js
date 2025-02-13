import fetch from 'node-fetch';
import {log} from './log.js';
import db from '../managers/databaseSequelize.js'

export async function sendPushNotification(guid, title, body, data) {
    try{
        const user = await db.user.findOne({
            where:{
            guid: guid
        }})
        log('mobileNotification:sendPushNotification: mobileToken '+ JSON.stringify(user.mobileToken))
        if(user?.mobileToken && typeof user.mobileToken === 'string' && user.mobileToken != 'undefined' && user.mobileToken.length > 0){
            log('mobileNotification:sendPushNotification: Sending Push Notification to '+ user.name)
            const message = {
                to: user.mobileToken,
                sound: 'default',
                title: title,
                body: body,
                data: { extraData: data },
            };
            
            const result = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
            });
            log('mobileNotification:sendPushNotification: Push Notification to '+ user.name+' Result '+ JSON.stringify(result))

        }else{
            log('mobileNotification:sendPushNotification: User '+user.name+' dont have mobileToken')
        }
    }catch(e){
        log('mobileNotification:sendPushNotification: Error '+ e)
    }
    
  }