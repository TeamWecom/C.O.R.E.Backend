// controllers/authController.js
import db from '../managers/databaseSequelize.js';
import bcrypt from 'bcryptjs';
import {log} from '../utils/log.js';
import jwt from 'jsonwebtoken';
import { generateRandomBigInt } from '../utils/randomValue.js';
import { getDateNow } from '../utils/getDateNow.js';
import { crateToken, validateToken } from '../utils/validadeToken.js';
import { generateGUID } from '../utils/generateGuid.js';
import { getConnections } from '../managers/webSocketManager.js';
import { licenseFileWithUsage } from './licenseController.js';

export const createUser = async (token, userData) => {
    const decoded = await validateToken(token);
    const user = await db.user.findOne({ where: { id: decoded.id } });

    if (!user) {
        log("authController:createUser: ID no Token JWT inválido");
        throw new Error('Token de autenticação inválido');
    }

    const { name, email, password, type, sip } = userData;
    const userExists = await db.user.findOne({ where: { email } });

    if (userExists) {
        log("authController:createUser: Email duplicado: " + email);
        throw new Error('emailDuplicated');
    }

    const license = await licenseFileWithUsage();

    if (license[type] && license[type].used >= license[type].total){
        log("authController:createUser: Limite de usuáros atingido, contratar nova licença: " + type);
        throw new Error('noMoreLicenses');
    }

    const obj = {
        name,
        guid: String(generateRandomBigInt(19)),
        sip,
        email,
        password: await bcrypt.hash(password, 15),
        createdAt: new Date().toISOString().slice(0, 16),
        type
    };

    await db.user.create(obj);
    log("authController:createUser: Usuário criado: " + email);
    return { result: 'success' };
};

export const signInUser = async ({ email, password, type }) => {
    log('authController:signInUser: Tentativa de Login de ' + email);
    const user = await db.user.findOne({ where: { email } });

    if (!user) {
        log('authController:signInUser: Email não encontrado ' + email);
        throw new Error('emailNotFound');
    }
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
        log('authController:signInUser: Senha inválida ' + email);
        throw new Error('incorrectPassword');
    }

    if (user.type === 'user' && type === 'admin') {
        log('authController:signInUser: Tipo de Login inválido ' + email);
        throw new Error('typeNotFound');
    }
    if(user.email != 'admin@wecom.com.br'){
        const license = await licenseFileWithUsage();
        if (license.online.used >= license.online.total){
            log("authController:signInUser: Limite de usuáros atingido, contratar nova licença: " + type);
            throw new Error('noMoreLicenses');
        }
    }

    

    const sockConnections = getConnections();
    const sockConn = sockConnections.filter(conn => conn.guid === user.guid)
    if(sockConn.length != 0){
        log('authController:signInUser: Login duplicado para este usuário ' + email);
        throw new Error('duplicatedLogin');
    }
    const token = await crateToken(user.id)
    log('authController:signInUser: Sucesso Login de ' + email);
    const session = generateGUID();
    return {
        id: user.id,
        guid: user.guid,
        name: user.name,
        email: user.email,
        createdat: user.createdat,
        type: user.type,
        accessToken: token,
        session: session
    };
};

// export const verifyToken = async (token) => {
//     const decoded = await validateToken(token);
//     const user = await db.user.findOne({ where: { id: decoded.id } });

//     if (!user) {
//         log("authController:verifyToken: ID no Token JWT inválido");
//         throw new Error('Token de autenticação inválido');
//     }
//     log("authController:verifyToken: Token JWT válido");
//     return { result: decoded };
// };

export const updatePassword = async ({ email, password, newPassword }) => {
    const user = await db.user.findOne({ where: { email } });

    if (!user) {
        throw new Error('emailNotFound');
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
        throw new Error('incorrectPassword');
    }

    await db.user.update(
        {
            password: await bcrypt.hash(newPassword, 15),
            updatedAt: getDateNow()
        },
        { where: { id: user.id } }
    );
    return { result: 'success' };
};

export const updateUser = async (token, userData) => {
    const decoded = await validateToken(token);
    const user = await db.user.findOne({ where: { id: decoded.id } });

    if (!user) {
        log("authController:updateUser: ID no Token JWT inválido");
        throw new Error('Token de autenticação inválido');
    }

    const { id, name, email, type, sip } = userData;
    await db.user.update(
        {
            name,
            email,
            type,
            sip,
            updatedAt: getDateNow()
        },
        { where: { id } }
    );
    return { result: 'success' };
};

export const resetPassword = async (token, { id, newPassword }) => {
    const decoded = await validateToken(token);
    const user = await db.user.findOne({ where: { id: decoded.id } });

    if (!user) {
        log("authController:resetPassword: ID no Token JWT inválido");
        throw new Error('Token de autenticação inválido');
    }

    await db.user.update(
        {
            password: await bcrypt.hash(newPassword, 15),
            updatedAt: getDateNow()
        },
        { where: { id } }
    );
    return { result: 'success' };
};

export const listUsers = async (token) => {
    const decoded = await validateToken(token);
    const user = await db.user.findOne({ where: { id: decoded.id } });

    if (!user) {
        log("authController:listUsers: ID no Token JWT inválido");
        throw new Error('Token de autenticação inválido');
    }

    const users = await db.user.findAll();
    return users;
};

export const deleteUser = async (token, { id }) => {
    const decoded = await validateToken(token);
    const user = await db.user.findOne({ where: { id: decoded.id } });

    if (!user) {
        log("authController:deleteUser: ID no Token JWT inválido");
        throw new Error('Token de autenticação inválido');
    }

    await db.user.destroy({ where: { id } });
    return { result: 'success' };
};
