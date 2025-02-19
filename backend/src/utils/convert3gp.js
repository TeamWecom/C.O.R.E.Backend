import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

/**
 * Converte um arquivo .3gp para .mp3 usando FFmpeg.
 * @param {string} inputFile - Caminho do arquivo .3gp
 * @param {string} outputFile - Caminho de saída do arquivo .mp3
 */
export const convert3gpToMp3 = async (inputFile, outputFile) => {
    if (!fs.existsSync(inputFile)) {
        console.error(`Arquivo não encontrado: ${inputFile}`);
        return;
    }

    ffmpeg(inputFile)
        .toFormat('mp3')
        .on('progress', (progress) => {
            console.log(`Progresso: ${Math.round(progress.percent)}% concluído`);
        })
        .on('end', () => {
            console.log(`Conversão concluída: ${outputFile}`);
            return outputFile;
        })
        .on('error', (err) => {
            console.error('Erro ao converter:', err.message);
            return;
        })
        .save(outputFile);
};

