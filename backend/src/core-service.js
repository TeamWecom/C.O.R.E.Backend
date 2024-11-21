// server.js
import { config as dotenvConfig } from 'dotenv';
import express from 'express';
import http from 'http';
import https from 'https';
import bodyParser from 'body-parser';
import fs from 'fs';
import APIRouter from './routes/webServerAPIRoutes.js';
import InnovaphoneRouter from './routes/webServerInnovaphoneRoutes.js';
import MilesightRouter from './routes/webServerMilesightRoutes.js';
import UIRouter from './routes/webServerUIRoutes.js';
import {handleConnection} from './routes/websocketRoutes.js';
import cors from 'cors';
import WebSocket, { WebSocketServer } from 'ws';
import AlexaRouter from './routes/alexaRoutes.js';
import {checkBackupRoutine} from './utils/dbMaintenance.js';
///import WebSocket from 'ws';
const app = express();

import path from 'path';

import process from 'process';
import configFile from './config/config.js';

dotenvConfig();

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { pbxApiPresenceSubscription } from './controllers/innovaphoneController.js';
import db from './managers/databaseSequelize.js'
import {loadOrInstallLicenseKey, decryptedLicenseFile, licenseFileWithUsage} from './controllers/licenseController.js'
import {log } from './utils/log.js'


import bodyParserXml from 'body-parser-xml';

import aedes from 'aedes';
import net from 'net';
import mqttRoutes from './routes/mqttRoutes.js';
import FlicRouter from './routes/flicRoutes.js';

bodyParserXml(bodyParser);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = configFile[env];


const PORT_HTTPS = process.env.PORT_HTTPS ||4444; // Porta padrão para HTTPS
const PORT_HTTP = process.env.PORT_HTTP || 4444; // Porta padrão para HTTP
const PORT_WS = process.env.PORT_WS || 10101; // Porta padrão para WS
const PORT_MQTT = process.env.PORT_MQTT || 1883; // Porta padrão para MQTT

const CERT_SSL = process.env.CERT_SSL || '/app/cert.pem'; // Certificado
const KEY_SSL = process.env.KEY_SSL || '/app/key.key'; // Key

// Permitindo todas as origens
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(bodyParser.json({
    limit: '500mb',
    inflate: true,
    verify: (req, res, buf, encoding) => {
      req.rawBody = buf;
    }
  }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));

async function connectWithRetry() {
    while (true) { // Loop infinito, vai tentar até que a conexão seja bem-sucedida
        try {
            await db.sequelize.authenticate();
            log('Conexão com o banco de dados estabelecida com sucesso!');
            break; // Sai do loop se a conexão for bem-sucedida
        } catch (error) {
            log(`Erro ao tentar conectar ao banco de dados: ${error.message}`);
            log('Tentando novamente em 15 segundos...');
            setTimeout(connectWithRetry, 15000);
        }
    }
}
await connectWithRetry()

await loadOrInstallLicenseKey()
const decryptedLicense = await decryptedLicenseFile()

let enableHttps = config.useHttps === 'true';
if (enableHttps) {
    // Configuração do servidor HTTPS
    const options = {
        key: fs.readFileSync(KEY_SSL),
        cert: fs.readFileSync(CERT_SSL)
    };

    // Iniciar o servidor HTTPS
    const server = https.createServer(options, app);

    server.listen(PORT_HTTPS, () => {
        console.log(`core-service:Secure WebServer running on port ${PORT_HTTPS}`);
    });

    // Configuração do WebSocket
    const wsHttpServer = https.createServer(options);

    const wsServer = new WebSocketServer({server: wsHttpServer });

    wsServer.on('upgrade', (request, socket, head) => {
        const pathname = request.url;

        if (pathname === '/ws') {
            wsServer.handleUpgrade(request, socket, head, (ws) => {
                wsServer.emit('connection', ws, request);
            });
        } else {
            socket.destroy();
        }
    });

    wsServer.on('connection', handleConnection);

    wsHttpServer.listen(PORT_WS, async ()  => {
        log(`core-service:Secure WebSocketServer running on port ${PORT_WS}`);
        if(decryptedLicense && decryptedLicense.pbx == true){
            log(`core-service:decryptedLicenseFile.pbx ${decryptedLicense.pbx}`);
            checkPbxTypeForPresenceSubscription();
        }
    });
} else {
    const wsServer = new WebSocketServer({ noServer: true });

    

    const wsHttpServer = http.createServer();
    wsHttpServer.on('upgrade', (request, socket, head) => {
        const pathname = request.url;
        if (pathname === '/ws') {
            wsServer.handleUpgrade(request, socket, head, (ws) => {
                wsServer.emit('connection', ws, request);
            });
        } else {
            socket.destroy();
        }
    });
    wsServer.on('connection', handleConnection);

    wsHttpServer.listen(PORT_WS, () => {
        console.log(`core-service:WebSocketServer running on port ${PORT_WS}`);
        if(decryptedLicense && decryptedLicense.pbx == true){
            log(`core-service:decryptedLicenseFile.pbx ${decryptedLicense.pbx}`);
            checkPbxTypeForPresenceSubscription();
        }
    });

    const httpServer = http.createServer(app);
    httpServer.listen(PORT_HTTP, () => {
        console.log(`core-service:WebServer running on port ${PORT_HTTP}`);
    });
}

// Usa os roteadores para as rotas
app.use('/ui', UIRouter);

// Configuração do WebServer
app.use(express.json());

if(decryptedLicense && decryptedLicense.pbx == true){
    log(`core-service:decryptedLicenseFile.pbx ${decryptedLicense.pbx}`);
    app.use('/api/innovaphone', InnovaphoneRouter);
    // Configurar body-parser para processar XML
    app.use(bodyParser.xml({
        limit: '1MB',   // Limite do tamanho do XML
        xmlParseOptions: {
            explicitArray: false, // Para não converter filhos de nós com o mesmo nome em arrays
        }
    }));
}
if(decryptedLicense && decryptedLicense.gateway != 0){
    log(`core-service:decryptedLicenseFile.gateways ${decryptedLicense.gateway}`);
    app.use('/api/milesight', MilesightRouter);
}

app.use('/api', APIRouter);



// Função assíncrona para buscar a configuração e executar a função correspondente
async function checkPbxTypeForPresenceSubscription() {
    try {
        

        const pbxType = await db.config.findOne({
            where: {
                entry: 'pbxType'
            }
        });

        if (pbxType && pbxType.value === 'INNOVAPHONE') {
            pbxApiPresenceSubscription();
        }
    } catch (error) {
        log('core-service:checkPbxTypeForPresenceSubscription:Erro ao verificar o pbxType:'+  error);
    }
}


//#region MQTT
// Criar a instância do broker MQTT
const broker = aedes();

// Criar o servidor TCP para escutar conexões MQTT
const server = net.createServer(broker.handle);

// Iniciar o servidor
server.listen(PORT_MQTT, () => {
    console.log(`core-service: Servidor MQTT rodando na porta ${PORT_MQTT}`);
});

// Configura as rotas MQTT
mqttRoutes(broker);

//#endregion

//Rota da Alexa
if(decryptedLicense && decryptedLicense.alexa == true){
    log(`core-service:decryptedLicenseFile.alexa ${decryptedLicense.alexa}`);
    app.use('/api/alexa', AlexaRouter);
}


//Rota do Flic
if(decryptedLicense && decryptedLicense.flic == true){
    log(`core-service:decryptedLicenseFile.flic ${decryptedLicense.flic}`);
    app.use('/api/flic', FlicRouter);
}

//Recria rotina de Backups
checkBackupRoutine();