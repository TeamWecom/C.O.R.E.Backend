// server.js
const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const webServerRoutes = require('./routes/webServerAPIRoutes');
const webServerUIRoutes = require('../src/routes/webServerUIRoutes');
const webSocketController = require('./controllers/webSocketController');
const app = express();
const cors = require('cors');
const WebSocket = require('ws');
const process = require('process');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/config/config.js')[env];
const PORT_HTTPS = 443; // Porta padrão para HTTPS
const PORT_HTTP = process.env.PORT_HTTP || 8000; // Porta padrão para HTTP
const PORT_WS = process.env.PORT_WS || 10000; // Porta padrão para WS
// Permitindo todas as origens
app.use(cors());

let enableHttps = config.useHttps === 'true';
if(enableHttps){
    // Configuração do servidor HTTPS
    const options = {
        key: fs.readFileSync('/home/wecom/private.pem'),
        cert: fs.readFileSync('/home/wecom/cert.pem')
    };
    // Iniciar o servidor HTTPS
    const server = https.createServer(options, app);

    server.listen(PORT_HTTPS, () => {
    console.log(`Secure WebServer running on port ${PORT_HTTPS}`);
    }); 
    
    // Configuração do WebSocket
    const wsHttpServer = https.createServer(options);

    const wsServer = new WebSocket.Server({server: wsHttpServer});

    wsServer.on('connection', webSocketController.handleConnection);

    wsHttpServer.listen(PORT_WS, () => {
        console.log(`Secure WebSocketServer running on port ${PORT_WS}`);
    });
}else{
    // Configuração do WebSocket
    const wsServer = new WebSocket.Server({ noServer: true });

    wsServer.on('connection', webSocketController.handleConnection);

    const wsHttpServer = https.createServer();
    wsHttpServer.on('upgrade', (request, socket, head) => {
        wsServer.handleUpgrade(request, socket, head, (ws) => {
            wsServer.emit('connection', ws, request);
        });
    });

    wsHttpServer.listen(PORT_WS, () => {
        console.log(`WebSocketServer running on port ${PORT_WS}`);
    });
    const httpServer = http.createServer(app);
    httpServer.listen(PORT_HTTP, () => {
        console.log(`WebServer running on port ${PORT_HTTP}`);
    });
    
}


// Usa os roteadores para as rotas
app.use('/ui', webServerUIRoutes);

// Configuração do WebServer
app.use(express.json());

app.use('/api', webServerRoutes);




