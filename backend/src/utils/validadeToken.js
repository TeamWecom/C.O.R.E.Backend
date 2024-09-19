import jwt from 'jsonwebtoken';

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