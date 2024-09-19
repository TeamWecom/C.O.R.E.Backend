import puppeteer from 'puppeteer';
import {log} from './log.js';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Define o diretório onde os arquivos estáticos serão servidos
const staticDir = path.join(__dirname, '../httpfiles/reports');

// Função para gerar o PDF
export const generatePDF = async (body) => {
    try{
        // Inicia o browser do Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();

        // Define o conteúdo HTML que deseja renderizar
        const htmlContent = `
            <html>
            <head>
                <title>${body.name}</title>
                <style>
                body {
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .card-image { width: 100%; max-width: 800px; }
                    .page-break { page-break-before: always; }
                }
                </style>
            </head>
            <body>
                ${body.pdf}
            </body>
            </html>
        `;

        // Carrega o conteúdo HTML na página
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const { name, pdf, landscape } = body;
        const pdfName = name+'.pdf'
        const filePath = path.join(staticDir, pdfName);
        log('generatePdf:generatePDF:result '+filePath)
        // Gera o PDF com as configurações desejadas
        await page.pdf({
            path: filePath, // Caminho onde o PDF será salvo
            format: 'A4',        // Tamanho da página
            printBackground: true, // Inclui as cores de fundo
            landscape: landscape? true : false
        });

        // Fecha o browser
        await browser.close();
        log('generatePdf:generatePDF:result '+filePath)
        return {staticDir, pdfName, filePath};
    }catch(e){
        log('generatePdf:generatePDF:error '+e)
        return e;
    }
};
// Função para gerar o Excel
export const generateExcel = async (data, name) => {
    try{
        // Cria uma nova pasta de trabalho
        const workbook = XLSX.utils.book_new();

        // Converte os dados para o formato de planilha
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Adiciona a planilha à pasta de trabalho
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

        // Define o nome e o caminho do arquivo
        const fileName = `${name}.xlsx`;
        const filePath = path.join(staticDir, fileName);

        // Escreve o arquivo Excel no sistema de arquivos
        XLSX.writeFile(workbook, filePath);

        // Retorna o caminho do arquivo gerado
        return {staticDir, filePath, fileName };
    }catch(e){
        log('generateReportFile:generateExcel:Error'+e)
        return e;
    }
    
};