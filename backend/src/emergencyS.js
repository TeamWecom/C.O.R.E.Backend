// server.js
import { config as dotenvConfig } from 'dotenv';
import express from 'express';
import http from 'http';
import https from 'https';
import bodyParser from 'body-parser';
import fs from 'fs';
import APIRouter from './routes/webServerAPIRoutes.js';
import UIRouter from './routes/webServerUIRoutes.js';
import {handleConnection} from '../src/routes/websocketRoutes.js';
import cors from 'cors';
import WebSocket, { WebSocketServer } from 'ws';
///import WebSocket from 'ws';
const app = express();

import path from 'path';

import process from 'process';
import configFile from '../src/config/config.js';

dotenvConfig();

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = configFile[env];


const PORT_HTTPS = 444; // Porta padrão para HTTPS
const PORT_HTTP = process.env.PORT_HTTP || 8000; // Porta padrão para HTTP
const PORT_WS = process.env.PORT_WS || 10000; // Porta padrão para WS

// Permitindo todas as origens
app.use(cors());
app.use(bodyParser.json());

let enableHttps = config.useHttps === 'true';
if (enableHttps) {
    // Configuração do servidor HTTPS
    const options = {
        key: fs.readFileSync('/home/wecom/wecom.com.br.key'),
        cert: fs.readFileSync('/home/wecom/wecom.com.br.pem')
    };

    // Iniciar o servidor HTTPS
    const server = https.createServer(options, app);

    server.listen(PORT_HTTPS, () => {
        console.log(`Secure WebServer running on port ${PORT_HTTPS}`);
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

    wsHttpServer.listen(PORT_WS, () => {
        console.log(`Secure WebSocketServer running on port ${PORT_WS}`);
    });
} else {
    // Configuração do WebSocket
    const wsServer = new WebSocket.Server({ noServer: true });

    

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
        console.log(`WebSocketServer running on port ${PORT_WS}`);
    });

    const httpServer = http.createServer(app);
    httpServer.listen(PORT_HTTP, () => {
        console.log(`WebServer running on port ${PORT_HTTP}`);
    });
}

// Usa os roteadores para as rotas
app.use('/ui', UIRouter);

// Configuração do WebServer
app.use(express.json());
app.use('/api', APIRouter);





