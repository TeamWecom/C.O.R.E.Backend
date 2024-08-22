// controllers/authController.js
import db from '../managers/databaseSequelize.js';
import bcrypt from 'bcryptjs';
import {log} from '../utils/log.js';
import jwt from 'jsonwebtoken';
import { generateRandomBigInt } from '../utils/randomValue.js';
import { getDateNow } from '../utils/getDateNow.js';
import { validateToken } from '../utils/validadeToken.js';
import { generateGUID } from '../utils/generateGuid.js';
import { getConnections } from '../managers/webSocketManager.js';

export const createUser = async (token, userData) => {
    const decoded = await validateToken(token);
    const user = await db.user.findOne({ where: { id: decoded.id } });

    if (!user) {
        log("ID no Token JWT inválido: ");
        throw new Error('Token de autenticação inválido');
    }

    const { name, email, password, type, sip } = userData;
    const userExists = await db.user.findOne({ where: { email } });

    if (userExists) {
        log("Email duplicado: " + email);
        throw new Error('emailDuplicated');
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
    log("Usuário criado: " + email);
    return { result: 'success' };
};

export const signInUser = async ({ email, password, type }) => {
    log('Tentativa de Login de ' + email);
    const user = await db.user.findOne({ where: { email } });

    if (!user) {
        log('Email não encontrado ' + email);
        throw new Error('emailNotFound');
    }
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
        log('Senha inválida ' + email);
        throw new Error('incorrectPassword');
    }

    if (user.type === 'user' && type === 'admin') {
        log('Tipo de Login inválido ' + email);
        throw new Error('typeNotFound');
    }

    const sockConnections = getConnections();
    const sockConn = sockConnections.filter(conn => conn.guid === user.guid)
    if(sockConn.length != 0){
        log('Login duplicado para este usuário ' + email);
        throw new Error('duplicatedLogin');
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRATION
    });
    log('Sucesso Login de ' + email);
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

export const verifyToken = async (token) => {
    const decoded = await validateToken(token);
    const user = await db.user.findOne({ where: { id: decoded.id } });

    if (!user) {
        log("ID no Token JWT inválido: ");
        throw new Error('Token de autenticação inválido');
    }

    log('Token JWT válido:', decoded);
    return { result: decoded };
};

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
        log("ID no Token JWT inválido: ");
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
        log("ID no Token JWT inválido: ");
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
        log("ID no Token JWT inválido: ");
        throw new Error('Token de autenticação inválido');
    }

    const users = await db.user.findAll();
    return users;
};

export const deleteUser = async (token, { id }) => {
    const decoded = await validateToken(token);
    const user = await db.user.findOne({ where: { id: decoded.id } });

    if (!user) {
        log("ID no Token JWT inválido: ");
        throw new Error('Token de autenticação inválido');
    }

    await db.user.destroy({ where: { id } });
    return { result: 'success' };
};
