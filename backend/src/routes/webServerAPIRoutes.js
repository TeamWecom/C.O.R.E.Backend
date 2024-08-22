// routes/webServerAPIRoutes.js
import express from 'express';
import { log } from '../utils/log.js';
import {
    createUser, signInUser, verifyToken, updatePassword,
    updateUser, resetPassword, listUsers, deleteUser
} from '../controllers/authController.js';
import multer from 'multer';
import { validateToken } from '../utils/validadeToken.js';
import path from 'path';
import url from 'url';
import { uploadFile } from '../controllers/filesController.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Define o diretório onde os arquivos estáticos serão servidos
const staticDir = path.join(__dirname, '../httpfiles');
router.use(express.static(staticDir));

// Configuração do Multer para armazenar os arquivos na pasta 'uploads' e preservar o nome original
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../httpfiles/uploads/'));
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Rota para upload de arquivos
router.post('/uploadFiles', upload.single('file'), async (req, res) => {
    try {
        const xAuthHeader = req.headers['x-auth'];
        const result = await uploadFile(req.file, xAuthHeader, req.protocol, req.get('host'));
        res.status(200).json({ fileUrl: result.fileUrl });
    } catch (error) {
        if (error.message === 'No file uploaded') {
            res.status(400).json({ error: error.message });
        } else if (error.message === 'Token JWT inválido') {
            res.status(401).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// Rota para criar usuário
router.post('/create', async (req, res) => {
    try {
        const result = await createUser(req.headers['x-auth'], req.body);
        res.status(200).send(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Rota para verificar token
router.post('/verifyToken', async (req, res) => {
    try {
        const result = await verifyToken(req.body.token);
        res.status(200).send(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Rota para login do usuário
router.post('/login', async (req, res) => {
    try {
        const result = await signInUser(req.body);
        res.status(200).send(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Rota para listar usuários
router.get('/listUsers', async (req, res) => {
    try {
        const result = await listUsers(req.headers['x-auth']);
        res.status(200).json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Rota para exclusão do usuário
router.post('/deleteUser', async (req, res) => {
    try {
        const result = await deleteUser(req.headers['x-auth'], req.body);
        res.status(200).send(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Rota para atualização do usuário
router.post('/updateUser', async (req, res) => {
    try {
        const result = await updateUser(req.headers['x-auth'], req.body);
        res.status(200).send(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Rota para alterar senha do usuário
router.post('/updatePassword', async (req, res) => {
    try {
        const result = await updatePassword(req.body);
        res.status(200).send(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Rota para resetar senha do usuário
router.post('/resetPassword', async (req, res) => {
    try {
        const result = await resetPassword(req.headers['x-auth'], req.body);
        res.status(200).send(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


export default router;
