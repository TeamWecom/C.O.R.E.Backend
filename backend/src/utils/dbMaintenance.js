import {log} from './log.js';
import db from '../managers/databaseSequelize.js';
import process from 'process';
import { QueryTypes, Op } from 'sequelize';
const env = process.env.NODE_ENV || 'development';
import configFile from '../config/config.js';
const config = configFile[env];
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {exec }from 'child_process';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Define o diretório onde os arquivos estáticos serão servidos
const backupDir = path.join(__dirname, '../httpfiles/backups');



export const getDatabaseSize = async () => {
    try {
        // Substitua 'core' pelo nome real do seu banco de dados, se for diferente
        const dbName = config.database || 'core';

        // Query para obter o tamanho do banco em MB
        const result = await db.sequelize.query(
            `SELECT pg_size_pretty(pg_database_size(:dbName)) AS size;`,
            {
                replacements: { dbName },
                type: QueryTypes.SELECT,
            }
        );

        // O resultado será um array de objetos, pegamos o primeiro
        return result[0].size;
    } catch (error) {
        log('dbMaintenance:getDatabaseSize: Erro ao obter o tamanho do banco de dados:'+error);
        throw error;
    }
};
export const backupDatabase = async () => {
    const dbName = config.database || 'core';
    const username = config.username || 'core_user';
    const password = config.password || 'Wecom12#';
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Ex: 2024-09-19_15-30-45
    const fileName = `${dbName}_backup_${timestamp}.dump`
    const backupFile = path.join(backupDir, fileName);

    try {
        // Verifica se o diretório de backup existe, se não, cria.
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Comando pg_dump para fazer o backup
        const command = `PGPASSWORD='${password}' pg_dump -U '${username}' '${dbName}' > '${backupFile}'`;

        // Execução do comando
        await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    log(`dbMaintenance:backupDatabase: Erro ao executar backup: ${error.message}`);
                    return reject(error);
                }
                if (stderr) {
                    log(`dbMaintenance:backupDatabase: stderr: ${stderr}`);
                }
                resolve(stdout);
            });
        });

        log(`dbMaintenance:backupDatabase: Backup concluído com sucesso: ${backupFile}`);
        return { backupFile, fileName, backupDir} ;
    } catch (error) {
        log(`dbMaintenance:backupDatabase: Erro ao fazer o backup do banco de dados: ${error.message}`);
        throw error;
    }
};