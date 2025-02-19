// controllers/filesController.js
import path from 'path';
import { validateToken } from '../utils/validadeToken.js';
import { convert3gpToMp3 } from '../utils/convert3gp.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export const uploadFile = async (file, token, protocol, host) => {
    const decoded = await validateToken(token);
    if (!file) {
        throw new Error('No file uploaded');
    }

    let filename = file.filename;
    const outputDirectory = path.join(__dirname, '../httpfiles/uploads/');

    console.log('filesController:uploadFile: Extensão do arquivo:', path.extname(file.filename));
    console.log('filesController:uploadFile: Nome do arquivo:', path.parse(file.filename).name);

    if (path.extname(file.filename) === '.3gp') {
        console.log('filesController:uploadFile: Arquivo 3GP detectado, iniciando conversão...');

        const inputPath = path.join(outputDirectory, file.filename);
        const outputPath = path.join(outputDirectory, `${path.parse(file.filename).name}.m4a`);

        console.log('filesController:uploadFile: Caminho de entrada:', inputPath);
        console.log('filesController:uploadFile: Caminho de saída:', outputPath);

        // Comando para converter .3gp para .m4a
        const convertCommand = `ffmpeg -i "${inputPath}" -c:a aac -b:a 128k "${outputPath}"`;
        console.log('filesController:uploadFile: Comando de conversão:', convertCommand);

        try {
            await execPromise(convertCommand);
            console.log('filesController:uploadFile: Conversão concluída com sucesso.');

            // Atualiza o nome do arquivo para a versão convertida
            filename = path.basename(outputPath);
        } catch (err) {
            console.error('filesController:uploadFile: Erro na conversão:', err);
            throw new Error('Erro na conversão de 3gp para m4a');
        }
    }

    // Construir a URL de acesso ao arquivo
    const fileUrl = `/api/uploads/${filename}`;

    return { fileUrl, filename, decoded };
};
