import { getDateNow } from '../utils/getDateNow.js';
import db from '../managers/databaseSequelize.js';
import { log } from '../utils/log.js';
import crypto from 'crypto';
import { readUInt16LE } from '../utils/typeHelpers.js';
import { where } from 'sequelize';
import {getConnections} from '../managers/webSocketManager.js'


export const loadOrInstallLicenseKey = async () =>{
    try{
        const licenseKey = await db.config.findOne({
            where:{ 
                entry: 'licenseKey'
            }
        });
        if(!licenseKey.value){
            log('licenseController:loadOrInstallLicenseKey: key not Installed, first start in execution')
            const key = generateRandomKey();
            const objToUpdate ={
                value: key, 
                createAt: getDateNow()

            }
            const insertResult = await db.config.update(objToUpdate,
                {
                  where: {
                    entry: 'licenseKey'
                  },
                });
            log('licenseController:loadOrInstallLicenseKey: insertResult '+JSON.stringify(insertResult))

        }else{
            log('licenseController:loadOrInstallLicenseKey: licenseKey '+licenseKey.value)
        }
    }catch(e){
        log('licenseController:loadOrInstallLicenseKey: error '+e)
        return;
    }
}
export const updateLicenseFile = async (fileHash) => {
    try{
        const licenseKey = await db.config.findOne({
            where:{ 
                entry: 'licenseKey'
            }
        });

        const licObj = decryptText(fileHash,licenseKey)
        if(licObj){
            const objToUpdate ={
                value: fileHash, 
                updatedAt: getDateNow()
    
            }
            const insertResult = await db.config.update(objToUpdate,
                {
                  where: {
                    entry: 'licenseFile'
                  },
                });
            log('licenseController:updateLicenseFile: insertResult '+JSON.stringify(insertResult))
            return insertResult;
        }else{
            return 'unknoun';
        }
        

    }catch(e){
        log('licenseController:updateLicenseFile: error '+e)
        return e;
    }
}
export const licenseFileWithUsage = async() =>{
    const lic = await decryptedLicenseFile();


    if (lic['user'] !== undefined) {
        const usersCreated = await db.user.findAll({
            where:{
                type: 'user'
        }})
        lic['user'] = { total: lic['user'], used: usersCreated.length || 0 };
    }
    if (lic['admin'] !== undefined) {
        const adminsCreated = await db.user.findAll({
            where:{
                type: 'admin'
        }})
        lic['admin'] = { total: lic['admin'], used: adminsCreated.length || 0 };
    }
    if (lic['gateway'] !== undefined) {
        const gatewaysCreated = await db.gateway.findAll()
        lic['gateway'] = { total: lic['gateway'], used: gatewaysCreated.length || 0 };
    }
    if (lic['online'] !== undefined) {
        const usersOnline = await getConnections()
        lic['online'] = { total: lic['online'], used: usersOnline.length || 0 };
    }
    if (lic['pbx'] !== undefined) {
        const pbxCreated = await db.config.findAll({
            where:{
                entry: "urlPbxTableUsers"
            }
        })
        lic['pbx'] = { total: lic['pbx'], used: pbxCreated.length >=1 ? true : false };
    }
    if (lic['record'] !== undefined) {
        lic['record'] = { total: lic['record'], used: lic['record'] };
    }
    return lic;
    
}
export const decryptedLicenseFile = async() => {
    try{
        const licenseKeyEntry = await db.config.findOne({ where: { entry: 'licenseKey' } });
        const licenseFileEntry = await db.config.findOne({ where: { entry: 'licenseFile' } });
    
        if (!licenseKeyEntry || !licenseFileEntry) {
            log('licenseController:decryptLicenseFile: License key or license file not found.');
            return null;
        }
    
        const licenseKey = licenseKeyEntry.value;
        const encryptedLicenseFile = licenseFileEntry.value;
        if(licenseKey != null && encryptedLicenseFile != null){
            const decryptedLicenseFile = decryptText(encryptedLicenseFile, licenseKey);
            // Substituindo aspas simples por aspas duplas
            const formattedString = decryptedLicenseFile.replace(/'/g, '"');
            return JSON.parse(formattedString);
        }else{
            return null;
        }
        
    }catch(e){
        return e;
    }
    
}
export const returnLicenseKey = async () =>{
    try{
        const licenseKey = await db.config.findOne({
            where:{ 
                entry: 'licenseKey'
            }
        });
        return licenseKey;
    }catch(e){
        return;
    }
}
export const returnLicenseFile = async () =>{
    try{
        const licenseFile = await db.config.findOne({
            where:{ 
                entry: 'licenseFile'
            }
        });
        return licenseFile;
    }catch(e){
        return;
    }
}

export const encryptLicenseFile = async (text, key)=>{
    try{
        return encryptText(text, key) 

    }catch(e){
        return e;
    }
}


function generateRandomKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

function encryptText(text, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decryptText(encryptedText, key) {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encrypted = textParts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

