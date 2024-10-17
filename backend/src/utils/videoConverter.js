import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import {log} from './log.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Define o diretório onde os arquivos estáticos serão servidos
const staticDir = path.join(__dirname, '../httpfiles/uploads');

// Função para converter o vídeo e enviar para download
export const convertVideo = async (filename) => {
    try{

        const inputFilePath = path.join(staticDir, filename);
        const newFileName = `${filename}.mp4`
        const outputFilePath = path.join(staticDir, newFileName);
    
        // Use ffmpeg para converter o arquivo .ts para .mp4
        ffmpeg(inputFilePath)
        .output(outputFilePath)
        .on('end', async () => {
            log('videoConverter:convertVideo: Conversion Finished!');
            log('videoConverter:/convert: inputFilePath: '+inputFilePath);
            log('videoConverter:/convert: newFileName: '+newFileName);
            log('videoConverter:/convert: outputFilePath: '+outputFilePath);
            
        })
        .on('error', (err) => {
            log('videoConverter:convertVideo: Error during conversion:'+ err);
            return err
        })
        .run();
        
        return {inputFilePath, newFileName, outputFilePath}


    }catch(e){
        log('videoConverter:convertVideo: Error:'+ e);
        return e;
    }
};
export const convertTsToMp4 = (filename) => {
    return new Promise((resolve, reject) => {
        log('videoConverter:convertVideo: Conversion Started!');
        const inputFilePath = path.join(staticDir, filename);
        const newFileName = `${filename}.mp4`;
        const outputFilePath = path.join(staticDir, newFileName);
    
        // Use ffmpeg para converter o arquivo .ts para .mp4
        ffmpeg(inputFilePath)
            .output(outputFilePath)
            .on('end', async () => {
            log('videoConverter:convertVideo: Conversion Finished!');
            log('videoConverter:/convert: inputFilePath: ' + inputFilePath);
            log('videoConverter:/convert: newFileName: ' + newFileName);
            log('videoConverter:/convert: outputFilePath: ' + outputFilePath);
    
            // Quando a conversão terminar, resolve a Promise
            resolve({ inputFilePath, newFileName, outputFilePath });
            })
            .on('error', (err) => {
            log('videoConverter:convertVideo: Error during conversion: ' + err);
            // Em caso de erro, rejeita a Promise
            reject(err);
            })
            .run();
    });
};
  