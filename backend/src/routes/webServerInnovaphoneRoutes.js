// routes/webServerAPIRoutes.js
import express from 'express';
import { log } from '../utils/log.js';
import multer from 'multer';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { presenceSubscription, callEvents, userEvents, convertRecordingPcapToWav, propfind, restartPassiveRCCMonitor } from '../controllers/innovaphoneController.js'
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Define o diretório onde os arquivos estáticos serão servidos
const staticDir = path.join(__dirname, '../httpfiles/');
//router.use(express.static(staticDir));

// Configuração do Multer para armazenar os arquivos na pasta 'uploads' e preservar o nome original
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(staticDir + 'uploads/'));
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });


// Rota para receber uma mensagem Innovaphone
router.post('/presence', async (req, res) => {
    try {
        const body = req.body;
        log("webServerInnovaphoneRoutes /innovaphone/presence: " + JSON.stringify(body))
        presenceSubscription(body)
        res.status(200).send();
    } catch (e) {
        res.status(500).send(e);
    }
});
router.post('/callEvents', async (req, res) => {
    try {
        const body = req.body;
        log("webServerInnovaphoneRoutes /innovaphone/callEvents: " + JSON.stringify(body))
        callEvents(body)
        res.status(200).send();
    } catch (e) {
        res.status(500).send(e);
    }
});

//Rota para receber eventos de registro dos terminais dos usuários
router.post('/userEvents', async (req, res) => {
    try {
        const body = req.body;
        log("webServerInnovaphoneRoutes /innovaphone/userEvents: " + JSON.stringify(body))
        userEvents(body)
        res.status(200).send();
    } catch (e) {
        res.status(500).send(e);
    }
});

//Rota para receber requisição de reinicio de monitoramento RCC dos usuários
router.get('/restartUserMonitor', async (req, res) => {
    try {
        log("webServerInnovaphoneRoutes /innovaphone/restartUserMonitor: ")
        restartPassiveRCCMonitor()
        res.status(200).send();
    } catch (e) {
        res.status(500).send(e);
    }
});

// Endpoint para capturar dados enviados via PUT e salvar como arquivo Innovaphone Recording URL
router.put('/recording/:filename', (req, res) => {
    const pcapFilePath = path.join(staticDir + 'uploads/', req.params.filename);

    // Cria um stream de escrita para salvar o arquivo no disco
    const writeStream = fs.createWriteStream(pcapFilePath);

    req.on('data', (chunk) => {
        writeStream.write(chunk);
    });

    req.on('end', () => {
        writeStream.end();
        res.status(200).send('File uploaded successfully.');
        const outputDirectory = path.join(__dirname, '../httpfiles/recordings');
        log(`webServerInnovaphoneRoutes: /innovaphone/recording/: File uploaded successfully, start to convert pcap`);
        convertRecordingPcapToWav(pcapFilePath, outputDirectory, req.params.filename.split('.')[0])
    });

    req.on('error', (err) => {
        writeStream.end();
        log(`webServerInnovaphoneRoutes: /innovaphone/recording/: Error handling request: ${err.message}`);
        res.status(500).send('Error uploading file.');
    });

    writeStream.on('error', (err) => {
        log(`webServerInnovaphoneRoutes: /innovaphone/recording/: Error saving file: ${err.message}`);
        res.status(500).send('Error saving file.');
    });
});
// Tratamento da requisição PROPFIND Innovaphone Recording URL
router.propfind('/recording/', (req, res) => {
    log('webServerInnovaphoneRoutes: /innovaphone/recording/: Received PROPFIND request to start a new record stream');

    const responseXml = propfind();

    res.set('Content-Type', 'application/xml');
    res.status(207).send(responseXml);
});

router.get('/recordings/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(staticDir, 'recordings', filename);
  
    res.download(filepath, filename, (err) => {
      if (err) {
        log("webServerInnovaphoneRoutes: /recordings/:filename: Error downloading file:", err);
        res.status(500).send('Error downloading file');
      }
    });
  });

export default router;
