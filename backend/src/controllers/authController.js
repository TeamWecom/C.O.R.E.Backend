// controllers/authController.js
import db from '../managers/databaseSequelize.js';
import bcrypt from 'bcryptjs';
import {log} from '../utils/log.js';
import jwt from 'jsonwebtoken';
import { generateRandomBigInt } from '../utils/randomValue.js';
import { getDateNow } from '../utils/getDateNow.js';
import { crateToken, validateToken, generateResetToken, validateResetToken } from '../utils/validadeToken.js';
import { generateGUID } from '../utils/generateGuid.js';
import { getConnections } from '../managers/webSocketManager.js';
import { licenseFileWithUsage } from './licenseController.js';
import url from 'url';

import {sendEmail} from '../managers/smtpManager.js';



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

export const signInUser = async ({ email, password }) => {
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

    if(user.email != 'admin@wecom.com.br'){
        const license = await licenseFileWithUsage();
        if(!license){
            log("authController:signInUser: Erro na licença instalada: " + JSON.stringify(license));
            throw new Error('noLicenses');
        }
        if (license.online.used >= license.online.total){
            log("authController:signInUser: Limite de usuáros atingido, contratar nova licença: " + user.type);
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

export const resetPasswordByAdmin = async (token, { id, newPassword }) => {
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
// Request password reset link
export const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const host = req.headers.host;
        // Find the user by their guid
        const user = await db.user.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate a unique password reset token and save it with an expiration time
        const token = await generateResetToken(user.guid);
        const resetLink = `https://${host}/reset-password?token=${token}`;
        const body = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redefinição de Senha</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            background-color: #020817;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 20px;
            text-align: center;
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Redefinição de Senha</h1>
        </div>
        <div class="content">
            <p>Se você solicitou a redefinição da sua senha. Clique no botão abaixo para redefinir sua senha, caso contrário, exclua este e-mail:</p>
            <a href="${resetLink}" class="button">Redefinir Senha</a>
            <p>Ou copie e cole este link no seu navegador:</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
        </div>
        <div class="footer">
            <p>CORE | Av Carlos Gomes, 466 -CJ 401, Porto Alegre - RS</p>
        </div>
    </div>
</body>
</html>`
        // Send the reset email with the token
        await sendEmail([user.email], 'ResetPassword', body);

        res.status(200).json({ message: 'Password reset email sent successfully' });
    } catch (error) {
        log('Error requesting password reset:'+ error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Handle password reset
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        // Validate the token
        const userGuid = await validateResetToken(token);

        if (!userGuid) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        // Update the user's password
        const hashedPassword = await bcrypt.hash(newPassword, 15);
        //crypto.createHash('sha256').update(newPassword).digest('hex');
        await db.user.update({ password: hashedPassword }, { where: { guid: userGuid } });

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        log('Error resetting password:'+ error);
        res.status(500).json({ error: 'Internal server error' });
    }
};