// controllers/filesController.js
import path from 'path';
import { validateToken } from '../utils/validadeToken.js';

export const uploadFile = async (file, token, protocol, host) => {
    const decoded = await validateToken(token);
    if (!file) {
        throw new Error('No file uploaded');
    }

    // Construir a URL de acesso ao arquivo
    const fileUrl = `${protocol}://${host}/api/uploads/${file.filename}`;
    
    return { fileUrl, decoded };
};