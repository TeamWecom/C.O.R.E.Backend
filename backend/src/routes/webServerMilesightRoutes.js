// routes/webServerAPIRoutes.js
import express from 'express';
import { log } from '../utils/log.js';
import { receiveAlarm, receiveSensor, receiveImage, receiveController, returnModelByEUI } from '../controllers/milesightController.js';
import multer from 'multer';
import path from 'path';
import url from 'url';
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
import { decodePayloadVS121 } from '../utils/milesightPayloadDecoders/VS121Decoder.js';

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


// Rota para receber uma mensagem Alarm
router.post('/alarmTriggered', async (req, res) => {
    try {
        //const body = req.body;
        //log('webServerAPIRoutes:alarmTriggered: body ' +JSON.stringify(body))
        //const result = await receiveAlarm(body);
        //return res.status(200).send(result);

        const body = req.body;
        log('webServerMilesightRoutes:alarmTriggered: From ' + JSON.stringify(body.deviceName))
        const model = await returnModelByEUI(body.devEUI || '');
        log('webServerMilesightRoutes:alarmTriggered: model ' + model)
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
        //log('webServerMilesightRoutes:sensorTriggered: body ' + JSON.stringify(body))
        log('webServerMilesightRoutes:sensorTriggered: From ' + JSON.stringify(body.deviceName))
        const model = await returnModelByEUI(body.devEUI || '');
        log('webServerMilesightRoutes:sensorTriggered: model ' + model)
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
            case 'vs121':
                decoded = await decodePayloadVS121(body.data);
                log('webServerAPIRoutes:sensorTriggered: VS121 decoded ' +JSON.stringify(decoded))
                break;
            // Adicione outros cases conforme necessário
            default:
                log('webServerAPIRoutes:sensorTriggered: UNKNOWN body ' +JSON.stringify(body))
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
        log('webServerMilesightRoutes:receiveImage: From ' + body.values.devName)
        if (body.topic == 'Alarm') {
            log('webServerMilesightRoutes:receiveImage: From ' + body.values.devName)
        }
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

        log('webServerMilesightRoutes:controllerReceived: From ' + JSON.stringify(body.deviceName))
        const model = await returnModelByEUI(body.devEUI || '');

        log('webServerMilesightRoutes:controllerReceived: model ' + model)
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
                log('webServerAPIRoutes:controllerReceived: UNKNOWN body ' +JSON.stringify(body))
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

export default router;
