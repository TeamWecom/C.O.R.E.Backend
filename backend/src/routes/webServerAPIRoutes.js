// routes/webServerAPIRoutes.js
import express from 'express';
import { log } from '../utils/log.js';
import {
    createUser, signInUser, updatePassword,
    updateUser, resetPassword, listUsers, deleteUser
} from '../controllers/authController.js';
import multer from 'multer';
import { renewToken, validateToken } from '../utils/validadeToken.js';
import path from 'path';
import url from 'url';
import { uploadFile } from '../controllers/filesController.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { generatePDF, generateExcel } from '../utils/generateReportFile.js';
import fs from 'fs';
import { backupDatabase } from '../utils/dbMaintenance.js';

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
        const result = await validateToken(req.body.token);
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

// Rota para renovar o token
router.get('/renewToken', async (req, res) => {
    try {
        const newToken = await renewToken(req.headers['x-auth']);
        res.status(200).send({accessToken: newToken});
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/generatePdf', async (req, res) => {
    try{
        const body = req.body;
        const {staticDir, pdfName,filePath} = await generatePDF(body)
        //res.status(200).send(pdf);
        log('webServerAPIRoutes:/generatePdf: staticDir: '+staticDir);
        log('webServerAPIRoutes:/generatePdf: name: '+pdfName);
        log('webServerAPIRoutes:/generatePdf: filePath: '+filePath);
        // Forçar o download do PDF
        res.download(filePath, pdfName, (err) => {
            if (err) {
            log('webServerAPIRoutes:/generatePdf: Erro ao fazer download do PDF: '+err);
            res.status(500).send('Erro ao fazer download do PDF');
            }else{
                log('webServerAPIRoutes:/generatePdf: download do PDF:');
            }
    
            // Após o download, você pode excluir o arquivo temporário
            fs.unlink(pdfPath, (err) => {
            if (err) {
                log('webServerAPIRoutes:/generatePdf: Erro ao remover arquivo temporário:', err);
            }
            });
        });

    } catch (e) {
        res.status(500).json({error: e.message});
    }
})
router.post('/generateExcel', async (req, res) => {
    try {
        const body = req.body;
        const { staticDir, fileName, filePath } = await generateExcel(body.data, body.name);
        log('webServerAPIRoutes:/generateExcel: staticDir: '+staticDir);
        log('webServerAPIRoutes:/generateExcel: name: '+fileName);
        log('webServerAPIRoutes:/generateExcel: filePath: '+filePath);
        // Forçar o download do arquivo Excel
        res.download(filePath, fileName, (err) => {
            if (err) {
                log('webServerAPIRoutes:/generateExcel: Erro ao baixar o arquivo Excel:'+ err);
                res.status(500).send('Erro ao fazer download do arquivo Excel');
            } else {
                log('webServerAPIRoutes:/generateExcel: Download do arquivo Excel realizado com sucesso.');
                // Após o download, você pode excluir o arquivo temporário se necessário
                fs.unlink(filePath, (err) => {
                    if (err) {
                        log('webServerAPIRoutes:/generateExcel: Erro ao remover arquivo temporário:', err);
                    }
                    });
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/backupDataBase', async (req, res) => {
    try{
        const {backupFile, fileName, backupDir} = await backupDatabase();

        log('webServerAPIRoutes:/backupDataBase: backupDir: '+backupDir);
        log('webServerAPIRoutes:/backupDataBase: name: '+fileName);
        log('webServerAPIRoutes:/backupDataBase: backupFile: '+backupFile);
        // Forçar o download do arquivo
        res.download(backupFile, fileName, (err) => {
            if (err) {
            log('webServerAPIRoutes:/backupDataBase: Erro ao fazer download do Arquivo: '+err);
            res.status(500).send('Erro ao fazer download do Arquivo');
            }else{
                log('webServerAPIRoutes:/backupDataBase: download do Arquivo OK!');
            }
    
            // Após o download, você pode excluir o arquivo temporário
            fs.unlink(backupFile, (err) => {
            if (err) {
                log('webServerAPIRoutes:/backupDataBase: Erro ao remover arquivo temporário:', err);
            }
            });
        });

    } catch (e) {
        res.status(500).json({error: e.message});
    }
})
export default router;
