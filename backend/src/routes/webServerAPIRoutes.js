// routes/webServerAPIRoutes.js
import express from 'express';
import db from '../managers/databaseSequelize.js';
import { log } from '../utils/log.js';
import {
    createUser, signInUser, updatePassword,
    updateUser, resetPasswordByAdmin, listUsers, deleteUser,
    requestPasswordReset, resetPassword
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
import { backupDatabase, compressAndDownloadFiles } from '../utils/dbMaintenance.js';
import {convertVideo, convertTsToMp4} from '../utils/videoConverter.js';
import process from 'process';
import { getSystemPreferences } from '../utils/serviceManager.js'
import { getTokens, loadGoogleTokens } from '../managers/googleCalendarManager.js';
import { broadcast } from '../managers/webSocketManager.js';
import { sendSms } from '../managers/awsManager.js';
const env = process.env.NODE_ENV || 'development';

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
//#region Upload de Arquivos
const upload = multer({ limits: { fileSize: 100 * 1024 * 1024 }, storage: storage });

// Rota para upload de arquivos
router.post('/uploadFiles', upload.single('file'), async (req, res) => {
    try {
        const xAuthHeader = req.headers['x-auth'];
        const uploadedFile = req.file;
        const result = await uploadFile(uploadedFile, xAuthHeader, req.protocol, req.get('host'));
        log('webServerAPIRoutes:/uploadFiles: File Uploaded! '+uploadedFile.filename);
        res.status(200).json({ fileUrl: result.fileUrl, fileName: uploadedFile.filename, });
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
//#endregion

//#region Gestão de Contas e Autenticação

// Rota para criar usuário
router.post('/create', async (req, res) => {
    try {
        const host = process.env.FRONT_URL || req.headers.origin;
        const result = await createUser(req.headers['x-auth'], req.body, host);
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
        res.status(401).json({ error: e.message });
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
        const result = await resetPasswordByAdmin(req.headers['x-auth'], req.body);
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
//#endregion

//#region Redefinição de Senha
// Route for requesting password reset
router.post('/request-password-reset', requestPasswordReset);
// Route for handling password reset (token validation + new password submission)
router.post('/reset-password', resetPassword);
//#endregion

//#region Gerar Relatórios
router.post('/generatePdf', async (req, res) => {
    try{
        const token = req.headers['x-auth'] || '';
        const decoded = await validateToken(token);
        const user = await db.user.findOne({ where: { id: decoded.id } });

        if (!user) {
            log("webServerAPIRoutes:generatePdf: ID no Token JWT inválido");
            res.status(401).send('Token de autenticação inválido');
            return;
        }

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
            fs.unlink(filePath, (err) => {
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

        const token = req.headers['x-auth'] || '';
        const decoded = await validateToken(token);
        const user = await db.user.findOne({ where: { id: decoded.id } });

        if (!user) {
            log("webServerAPIRoutes:generatePdf: ID no Token JWT inválido");
            res.status(401).send('Token de autenticação inválido');
            return;
        }

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
//#endregion

//#region Backup
router.get('/backupDataBase', async (req, res) => {
    try{

        const token = req.headers['x-auth'] || '';
        const decoded = await validateToken(token);
        const user = await db.user.findOne({ where: { id: decoded.id } });

        if (!user) {
            log("webServerAPIRoutes:backupDataBase: ID no Token JWT inválido");
            res.status(401).send('Token de autenticação inválido');
            return;
        }

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
router.post('/backupFiles', async (req, res) => {
    try{

        const token = req.headers['x-auth'] || '';
        const decoded = await validateToken(token);
        const user = await db.user.findOne({ where: { id: decoded.id } });

        if (!user) {
            log("webServerAPIRoutes:backupFiles: ID no Token JWT inválido");
            res.status(401).send('Token de autenticação inválido');
            return;
        }
        const body = req.body;
        const {backupFile, fileName, backupDir} = await compressAndDownloadFiles(body.from);

        log('webServerAPIRoutes:/backupFiles: backupDir: '+backupDir);
        log('webServerAPIRoutes:/backupFiles: name: '+fileName);
        log('webServerAPIRoutes:/backupFiles: backupFile: '+backupFile);
        // Forçar o download do arquivo
        res.download(backupFile, fileName, (err) => {
            if (err) {
            log('webServerAPIRoutes:/backupFiles: Erro ao fazer download do Arquivo: '+err);
            res.status(500).send('Erro ao fazer download do Arquivo');
            }else{
                log('webServerAPIRoutes:/backupFiles: download do Arquivo OK!');
            }
    
            // Após o download, você pode excluir o arquivo temporário
            fs.unlink(backupFile, (err) => {
            if (err) {
                log('webServerAPIRoutes:/backupFiles: Erro ao remover arquivo temporário:'+err);
            }else{
                log('webServerAPIRoutes:/backupFiles: Removido arquivo de backup temporário:');
            }
            });
        });

    } catch (e) {
        res.status(500).json({error: e.message});
    }
})
//#endregion

//#region Converter Video para mp4
// Rota que inicia a conversão e fornece o link de download
router.get('/convert/:fileName', async (req, res) => {
    try{

        const token = req.headers['x-auth'] || '';
        const decoded = await validateToken(token);
        const user = await db.user.findOne({ where: { id: decoded.id } });

        if (!user) {
            log("webServerAPIRoutes:convert: ID no Token JWT inválido");
            res.status(401).send('Token de autenticação inválido');
            return;
        }
        const { fileName } = req.params;
        log('webServerAPIRoutes:/convert: Request Conversion Start!');
        //const {inputFilePath, newFileName, outputFilePath} = await convertVideo(fileName);
        const { inputFilePath, newFileName, outputFilePath } = await convertTsToMp4(fileName);
        log('webServerAPIRoutes:/convert: continuando');
        log('webServerAPIRoutes:/convert: inputFilePath: '+inputFilePath);
        log('webServerAPIRoutes:/convert: newFileName: '+newFileName);
        log('webServerAPIRoutes:/convert: outputFilePath: '+outputFilePath);
        // Forçar o download do arquivo
        res.download(outputFilePath, newFileName, (err) => {
            if (err) {
            log('webServerAPIRoutes:/convert: Erro ao fazer download do Arquivo: '+err);
            res.status(500).send('Erro ao fazer download do Arquivo');
            }else{
                log('webServerAPIRoutes:/convert: download do Arquivo OK!');
            }
    
            // Após o download, você pode excluir o arquivo temporário
            // fs.unlink(inputFilePath, (unlinkErr) => {
            //     if (unlinkErr) log('webServerAPIRoutes:/convert: Erro ao remover arquivo temporário input:'+unlinkErr);;
            // });
            // fs.unlink(outputFilePath, (unlinkErr) => {
            //     if (unlinkErr) log('webServerAPIRoutes:/convert: Erro ao remover arquivo temporário output:'+unlinkErr);;
            // });
        });

    } catch (e) {
        res.status(500).json({error: e.message});
    }
})
//#endregion

//#region Predefinições de Aparencia
// Rota para login do usuário
router.get('/systemPreferences', async (req, res) => {
    try {
        const result = await getSystemPreferences();
        res.status(200).send(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

//#endregion

// Rota para confirmar Google OAuth
router.get('/google-oauth-callback', async (req, res) => {
    try {
        const code = req.query.code; // Obtém o valor de 'code' da URL
        if (!code) {
            return res.status(400).send('Código de autorização não encontrado.');
        }
        await getTokens(code)
        const status = await loadGoogleTokens()
        broadcast({ api: "admin", mt: "RequestGoogleOAuthStatusResult", result: status })
        res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google OAuth - CORE</title>
      <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
                color: white;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: hsl(222.2, 84%, 4.9%);
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                color: white;
            }
            .header {
                background-color: hsl(222.2, 84%, 4.9%);
                padding: 20px;
                border-radius: 8px 8px 0 0;
                text-align: center;
                color: white;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
                color: white;
            }
            .content {
                padding: 20px;
                text-align: center;
                color: white;
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
            .link{
                text-decoration: none;
                color: white
            }
        </style>
</head>
<body>
    <div class="container">
        <div class="header" >
            <img src="">
            <h1>Google OAuth</h1>
        </div>
        <div class="content">
            <p>Você pode fechar essa página!</p>
        </div>
        <div class="footer">
            <p>Av Carlos Gomes, 466 -CJ 401, Porto Alegre - RS</p>
        </div>
    </div>
</body>
        </html>`);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

//Rota para enviar SMS
router.post('/sendSms', async (req, res) => {
    try{

        const token = req.headers['x-auth'] || '';
        const decoded = await validateToken(token);
        const user = await db.user.findOne({ where: { id: decoded.id } });

        if (!user) {
            log("webServerAPIRoutes:sendSms: ID no Token JWT inválido");
            res.status(401).send('Token de autenticação inválido');
            return;
        }
        const body = req.body;
        await sendSms(body.cgpn, body.msg)
        .then((result)=>{
            res.status(200).send(result);

        }).catch((e)=>{
            res.status(500).send(e);
        })
    }catch(e){
        log("webServerAPIRoutes:sendSms: Erro" +e);
        res.status(404).send('Erro'+e);
        return;
    }
})
export default router;
