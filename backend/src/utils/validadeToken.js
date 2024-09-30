import jwt from 'jsonwebtoken';
import db from '../managers/databaseSequelize.js';
import { QueryTypes, Op } from 'sequelize';
import crypto from 'crypto';

let passwordResetRequests = [];

// Função para criar o token JWT
export function crateToken(id) {
    return new Promise((resolve, reject) => {
        try{
            const token = jwt.sign({ id: id }, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_REFRESH_EXPIRATION
            });
            resolve(token)
        }catch(err){
            reject(err)
        }
    });
}
// Função para validar o token JWT
export function validateToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });
}
// Função para renovar o token JWT
export function renewToken(oldToken) {
    return new Promise(async (resolve, reject) => {
        const decoded = await validateToken(oldToken)
        if(decoded.id){
            const token = await crateToken(decoded.id)
            resolve(token);
        }else{
            reject(decoded)
        }
        
    });
}

// Generate a reset token, store it in the database with an expiration time
export const generateResetToken = async (guid) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expirationTime = new Date(Date.now() + 60 * 60 * 1000); // token valid for 1 hour

    // Store token and expiration in the database
    // await db.passwordReset.create({
    //     guid,
    //     token,
    //     expiresAt: expirationTime.toDateString()
    // });
    passwordResetRequests.push({
        guid,
        token,
        expiresAt: expirationTime
    });

    return token;
};

// Validate the reset token
export const validateResetToken = async (token) => {
    // const resetRequest = await db.passwordReset.findOne({
    //     where: {
    //         token,
    //         expiresAt: {
    //             [Op.gt]: new Date()  // Check if the token is still valid (expiration time > current time)
    //         }
    //     }
    // });

    // Encontrar o índice da requisição de reset de senha correspondente ao token
    const resetIndex = passwordResetRequests.findIndex(request => 
        request.token === token && request.expiresAt > new Date()
    );

    if (resetIndex === -1) {
        return null;  // Token inválido ou expirado
    }

    // Token válido, extrair a requisição de reset
    const resetRequest = passwordResetRequests[resetIndex];

    // Remover a requisição da lista
    passwordResetRequests.splice(resetIndex, 1);

    // Token is valid, return the user's GUID
    return resetRequest.guid;
};