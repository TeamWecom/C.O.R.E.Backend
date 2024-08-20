// routes/webServerAPIRoutes.js
import express from 'express';
import { log } from '../utils/log.js';
import { receiveAlarm, receiveSensor, receiveImage, receiveController, returnModelByEUI } from '../controllers/milesightController.js';
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
import { decodePayloadUC300 } from '../utils/milesightPayloadDecoders/UC300Decoder.js';
import { decodePayloadWS301 } from '../utils/milesightPayloadDecoders/WS301Decoder.js';
import { decodePayloadWS101 } from '../utils/milesightPayloadDecoders/WS101Decoder.js';
import { decodePayloadEM300SLD, decodePayloadEM300TH } from '../utils/milesightPayloadDecoders/EM300Decoder.js';
import { decodePayloadWTS506 } from '../utils/milesightPayloadDecoders/WTS506Decoder.js';
import { decodePayloadAM103 } from '../utils/milesightPayloadDecoders/AM103Decoder.js';
import { decodePayloadAM104 } from '../utils/milesightPayloadDecoders/AM104Decoder.js';
import { decodePayloadAM107 } from '../utils/milesightPayloadDecoders/AM107Decoder.js';
import { decodePayloadAM300 } from '../utils/milesightPayloadDecoders/AM300Decoder.js';
import { decodePayloadCT100 } from '../utils/milesightPayloadDecoders/CT10xDecoder.js';
import { decodePayloadUC50X } from '../utils/milesightPayloadDecoders/UC50xDecoder.js';
import { decodePayloadWS202 } from '../utils/milesightPayloadDecoders/WS202Decoder.js';
import { decodePayloadAM307 } from '../utils/milesightPayloadDecoders/AM307Decoder.js';
import { decodePayloadWS156 } from '../utils/milesightPayloadDecoders/WS156Decoder.js';
import { presenceSubscription, callEvents } from '../controllers/innovaphoneController.js'
import fs from 'fs';

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

// Rota para receber uma mensagem Alarm
router.post('/alarmTriggered', async (req, res) => {
    try {
        //const body = req.body;
        //log('webServerAPIRoutes:alarmTriggered: body ' +JSON.stringify(body))
        //const result = await receiveAlarm(body);
        //return res.status(200).send(result);

        const body = req.body;
        //log('webServerAPIRoutes:sensorTriggered: body ' +JSON.stringify(body))
        const model = await returnModelByEUI(body.devEUI || '');
        log('webServerAPIRoutes:controllerReceived: model ' + model)
        let decoded;

        // Seleciona o decodificador correto com base no modelo
        switch (model.toLowerCase()) {
            case 'ws101':
                decoded = await decodePayloadWS101(body.data)
                break;
            default:
                return res.status(400).send({ error: 'Modelo desconhecido' });
        }

        // Adiciona informações adicionais ao objeto decodificado
        decoded.sensor_name = body.deviceName || '';
        decoded.deveui = body.devEUI || '';

        const result = await receiveAlarm(decoded);
        return res.status(200).send(result);

    } catch (e) {
        return res.status(500).send(e);
    }
});

// Rota para receber uma mensagem Sensor
router.post('/sensorTriggered', async (req, res) => {
    try {
        //const { model } = req.params;

        const body = req.body;
        log('webServerAPIRoutes:sensorTriggered: body ' + JSON.stringify(body))
        const model = await returnModelByEUI(body.devEUI || '');
        log('webServerAPIRoutes:controllerReceived: model ' + model)
        let decoded;

        // Seleciona o decodificador correto com base no modelo
        switch (model.toLowerCase()) {
            case 'em300':
                decoded = await decodePayloadEM300SLD(body.data);
                break;
            case 'em300-th':
                decoded = await decodePayloadEM300TH(body.data);
                break;
            case 'em300-sld':
                decoded = await decodePayloadEM300SLD(body.data);
                break;
            case 'am307':
                decoded = await decodePayloadAM307(body.data)
                break;
            case 'am300':
                decoded = await decodePayloadAM300(body.data)
                break;
            case 'am103':
                decoded = await decodePayloadAM103(body.data)
                break;
            case 'am104':
                decoded = await decodePayloadAM104(body.data)
                break;
            case 'am107':
                decoded = await decodePayloadAM107(body.data)
                break;
            case 'ct101':
                decoded = await decodePayloadCT100(body.data)
                break;
            case 'ct103':
                decoded = await decodePayloadCT100(body.data)
                break;
            case 'ws156':
                decoded = await decodePayloadWS156(body.data)
                break;
            case 'ws301':
                decoded = await decodePayloadWS301(body.data)
                break;
            case 'ws202':
                decoded = await decodePayloadWS202(body.data)
                break;
            case 'wts506':
                decoded = await decodePayloadWTS506(body.data)
                break;

            // Adicione outros cases conforme necessário
            default:
                return res.status(400).send({ error: 'Modelo desconhecido' });
        }

        // Adiciona informações adicionais ao objeto decodificado
        decoded.sensor_name = body.deviceName || '';
        decoded.deveui = body.devEUI || '';

        const result = await receiveSensor(decoded);
        return res.status(200).send(result);
    } catch (e) {
        res.status(500).send(e);
    }
});

// Rota para receber uma mensagem Sensor
router.post('/receiveImage', async (req, res) => {
    try {
        const body = req.body;
        if (body.topic == 'Alarm') {
            log('webServerAPIRoutes:receiveImage: body ' + JSON.stringify(body))
        }
        log("Camera mandou foto " + body.values.devName)
        const result = await receiveImage(body);
        res.status(200).send(result);
    } catch (e) {
        res.status(500).send(e);
    }
});

// Rota para receber uma mensagem do IOT Controller
router.post('/controllerReceived', async (req, res) => {
    try {
        //const { model } = req.params;
        const body = req.body;
        //log('webServerAPIRoutes:controllerReceived: body ' +JSON.stringify(body))


        const model = await returnModelByEUI(body.devEUI || '');

        log('webServerAPIRoutes:controllerReceived: model ' + model)
        let decoded;

        // Seleciona o decodificador correto com base no modelo
        switch (model.toLowerCase()) {
            case 'uc300':
                decoded = await decodePayloadUC300(body.data);
                break;
            case 'uc50x':
                decoded = await decodePayloadUC50X(body.data);
                break;
            // Adicione outros cases conforme necessário
            default:
                return res.status(400).send({ error: 'Modelo desconhecido' });
        }

        // Adiciona informações adicionais ao objeto decodificado
        decoded.sensor_name = body.deviceName || '';
        decoded.deveui = body.devEUI || '';

        const result = await receiveController(decoded);
        return res.status(200).send(result);
    } catch (e) {
        return res.status(500).send(e);
    }
});

// Rota para receber uma mensagem Innovaphone
router.post('/innovaphone/presence', async (req, res) => {
    try {
        const body = req.body;
        log("webServerAPIRoutes /innovaphone/presence: " + JSON.stringify(body))
        presenceSubscription(body)
        res.status(200).send();
    } catch (e) {
        res.status(500).send(e);
    }
});
router.post('/innovaphone/callEvents', async (req, res) => {
    try {
        const body = req.body;
        log("webServerAPIRoutes /innovaphone/callEvents: " + JSON.stringify(body))
        callEvents(body)
        res.status(200).send();
    } catch (e) {
        res.status(500).send(e);
    }
});

// Endpoint para capturar dados enviados via PUT e salvar como arquivo
router.put('/innovaphone/recording/:filename', (req, res) => {
    const filePath = path.join(__dirname, '../httpfiles/uploads/', req.params.filename);

    // Cria um stream de escrita para salvar o arquivo no disco
    const writeStream = fs.createWriteStream(filePath);

    req.on('data', (chunk) => {
        writeStream.write(chunk);
    });

    req.on('end', () => {
        writeStream.end();
        res.status(200).send('File uploaded successfully.');
    });

    req.on('error', (err) => {
        writeStream.end();
        log(`Error handling request: ${err.message}`);
        res.status(500).send('Error uploading file.');
    });

    writeStream.on('error', (err) => {
        log(`Error saving file: ${err.message}`);
        res.status(500).send('Error saving file.');
    });
});
// Tratamento da requisição PROPFIND
router.propfind('/innovaphone/recording/', (req, res) => {
    console.log('Received PROPFIND request');
    console.log('XML Body:', req.body);

    // Aqui você pode processar o XML recebido e gerar uma resposta adequada

    const responseXml = `<?xml version="1.0" encoding="utf-8"?>
        <multistatus xmlns="DAV:">
            <response>
                <href>/api/innovaphone/recording/</href>
                <propstat>
                    <prop>
                        <resourcetype><collection/></resourcetype>
                        <getcontentlength>0</getcontentlength>
                        <creationdate>${new Date().toISOString()}</creationdate>
                        <getlastmodified>${new Date().toUTCString()}</getlastmodified>
                    </prop>
                    <status>HTTP/1.1 200 OK</status>
                </propstat>
            </response>
        </multistatus>`;

    res.set('Content-Type', 'application/xml');
    res.status(207).send(responseXml);
});

export default router;
