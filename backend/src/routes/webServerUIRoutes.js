// webServerUIRoutes.js
import express from 'express';
import { validateToken } from '../utils/validadeToken.js';
import path from 'path';
import url from 'url';
//import multer from 'multer';
//import { uploadFile } from '../controllers/filesController.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UIRouter = express.Router();

// Define o diretório onde os arquivos estáticos serão servidos
const staticDir = path.join(__dirname, '../httpfiles');
UIRouter.use(express.static(staticDir));

// Configuração do Multer para armazenar os arquivos na pasta 'uploads' e preservar o nome original
//const storage = multer.diskStorage({
//    destination: (req, file, cb) => {
//        cb(null, path.join(__dirname, '../httpfiles/uploads/'));
//    },
//    filename: (req, file, cb) => {
 //       cb(null, file.originalname);
///    }
//});

//const upload = multer({ storage: storage });

// Rota para upload de arquivos
// UIRouter.post('/uploadFiles', upload.single('file'), async (req, res) => {
//     try {
//         const xAuthHeader = req.headers['x-auth'];
//         const result = await uploadFile(req.file, xAuthHeader, req.protocol, req.get('host'));
//         res.status(200).json({ fileUrl: result.fileUrl });
//     } catch (error) {
//         if (error.message === 'No file uploaded') {
//             res.status(400).json({ error: error.message });
//         } else if (error.message === 'Token JWT inválido') {
//             res.status(401).json({ error: error.message });
//         } else {
//             res.status(500).json({ error: 'Internal Server Error' });
//         }
//     }
// });

// Rota para login do usuário
UIRouter.get('/login', (req, res) => {
    res.sendFile(path.join(staticDir, 'login.html'));
});

UIRouter.get('/user', async (req, res) => {
    const query = url.parse(req.url, true).query;
    try {
        const decoded = await validateToken(query.tk);
        // Se o token for válido, você pode acessar os dados decodificados (por exemplo, o ID do usuário)
        console.log('Token JWT válido:', decoded);
        res.sendFile(path.join(staticDir, 'test.html'));
    } catch (error) {
        console.log("Token JWT inválido: ", error);
        res.redirect('/ui/login'); //.status(401).json({ error: 'Token JWT inválido' });
    }
});

export default UIRouter;
