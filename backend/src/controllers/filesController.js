// controllers/filesController.js
import path from 'path';
import { validateToken } from '../utils/validadeToken.js';
import { convert3gpToMp3 } from '../utils/convert3gp.js';
import fs from 'fs';
import { log } from '../utils/log.js';
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


export const deleteFile = async (filename) => {
    fs.unlink(filename, (err) => {
        if (err) {
            log(`filesController:deleteFile: Error deleting raw file: ${err}`);
        } else {
            log(`filesController:deleteFile: Deleted raw file: ${filename}`);
        }
    });

}

export function extractSipToPortMap(sipOutput) {
    const lines = sipOutput.trim().split('\n');
    const portMap = {};
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const fromMatch = parts[1]?.match(/sip:(\d+)@/);
        const toMatch = parts[2]?.match(/sip:(\d+)@/);
        const port = parseInt(parts[4]);
        if (fromMatch && toMatch && !isNaN(port)) {
            portMap[port] = { from: fromMatch[1], to: toMatch[1] };
        }
    }
    return portMap;
}

export function oldExtractRtpSsrcInfo(rtpOutput) {
    const lines = rtpOutput.split('\n');
    const ssrcList = [];
    let parsing = false;

    for (const line of lines) {
        if (line.includes('RTP Streams')) {
            parsing = true;
            continue;
        }
        if (parsing && line.trim() === '') break; // end of table
        const match = line.match(/(\d+\.\d+)\s+[\d.]+\s+(\d+)\s+[\d.]+\s+(\d+)\s+(0x[0-9A-Fa-f]+)\s+(\w+)/);
        if (match) {
            const startTime = match[0];
            const endTime = match[1];
            const srcPort = parseInt(match[2]);
            const ssrc = match[4];
            const payload = match[5];
            ssrcList.push({ ssrc, srcPort, payload, startTime, endTime });
        }
    }

    return ssrcList;
}
export function extractRtpSsrcInfo(rtpOutput) {
    const lines = rtpOutput.split('\n');
    const ssrcList = [];
    let parsing = false;

    for (const line of lines) {
        if (line.includes('RTP Streams')) {
            parsing = true;
            continue;
        }
        if (parsing && line.trim() === '') break; // end of table

        const match = line.match(
            /^\s*(\d+\.\d+)\s+(\d+\.\d+)\s+([\d.]+)\s+(\d+)\s+([\d.]+)\s+(\d+)\s+(0x[0-9A-Fa-f]+)\s+(\w+)\s+(\d+)\s+(\d+).*?(\d+\.\d+)\s*$/
        );

        if (match) {
            const startTime = parseFloat(match[1]);
            const endTime = parseFloat(match[2]);
            const srcIP = match[3];
            const srcPort = parseInt(match[4]);
            const destIP = match[5];
            const destPort = parseInt(match[6]);
            const ssrc = match[7];
            const payload = match[8];
            const pktCount = parseInt(match[9]); // total de pacotes (extra)
            const lostPkts = parseInt(match[10]);
            const maxJitter = parseFloat(match[11]);

            ssrcList.push({
                ssrc,
                payload,
                srcIP,
                srcPort,
                destIP,
                destPort,
                startTime,
                endTime,
                lostPkts,
                maxJitter,
                pktCount
            });
        }
    }

    return ssrcList;
}


/**
 * Extrai o primeiro Media Format (DynamicRTP-Type-xxx) de um arquivo PCAP
 * @param {string} pcapFilePath - Caminho para o arquivo .pcap
 * @returns {Promise<number|null>} - O número do Payload encontrado, ou null se não encontrado
 */
export async function extractFirstMediaFormat(pcapFilePath) {
  try {
    // Usamos -O sip para pegar o protocolo SIP completo (inclusive o body)
    const { stdout } = await execPromise(`tshark -r "${pcapFilePath}" -Y "sip" -O sip`);

    const regex = /Media Format: DynamicRTP-Type-(\d+)/g;
    const matches = [...stdout.matchAll(regex)];

    if (matches.length > 0) {
      return parseInt(matches[0][1], 10);
    } else {
      return null;
    }
  } catch (error) {
    log('filesController:extractFirstMediaFormat: Erro ao processar o arquivo pcap:'+ error);
    return null;
  }
}
