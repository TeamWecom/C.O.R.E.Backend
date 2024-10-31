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

import archiver from 'archiver';
import cron from 'node-cron';
import moment from 'moment';
import scp from 'scp2';
import * as ftp from 'basic-ftp';
import { createClient } from 'webdav';

let cronTasks = {};



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
export const compressAndDownloadFiles = async (startDate) => {
    log(`dbMaintenance:compressAndDownloadFiles: startDate ${startDate}`);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Ex: 2024-09-19_15-30-45
    const fileName = `httpfiles_backup_${timestamp}.zip`;

    const backupDir = path.join(__dirname, '../httpfiles/backups/');
    const outputPath = path.join(backupDir, fileName);
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
        zlib: { level: 9 }, // Definir o nível de compressão (0-9)
    });

    // Converter a data de início para um objeto Date
    const startDateObj = new Date(startDate);

    // Tratar erros no arquivo de saída
    output.on('close', async () => {
        log(`${archive.pointer()} bytes total compressed.`);
    });

    // Tratar erros durante o processo de arquivamento
    archive.on('error', async (err) => {
        throw err;
    });

    // Enviar os dados do arquivo ZIP para a saída
    archive.pipe(output);

    // Caminho do diretório de onde os arquivos serão incluídos
    const dirPath = path.join(backupDir, '../');

    // Função recursiva para adicionar arquivos ao ZIP
    const addFilesToArchive = (dir) => {
        const files = fs.readdirSync(dir);

        files.forEach((file) => {
            const filePath = path.join(dir, file);

            // Obter informações do arquivo
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                // Se for um diretório e não for o diret´rorio de backups, chamamos a função recursivamente
                if(!filePath.includes('/backups')){
                    addFilesToArchive(filePath);
                }
                
            } else {
                const fileModifiedTime = new Date(stats.mtime);

                // Verificar se a data de modificação é superior à data de início
                if (fileModifiedTime > startDateObj) {
                    const relativePath = path.relative(dirPath, filePath); // Mantém a estrutura de diretórios original
                    //log(`Incluindo arquivo: ${relativePath} - Modificado em: ${fileModifiedTime}`);

                    // Incluir o arquivo no ZIP mantendo a estrutura de diretórios
                    archive.file(filePath, { name: relativePath });
                } else {
                    //log(`Arquivo ignorado: ${file} - Modificado em: ${fileModifiedTime}`);
                }
            }
        });
    };

    // Chamar a função recursiva para o diretório base
    addFilesToArchive(dirPath);

    // Finalizar o processo de arquivamento
    await archive.finalize();

    return { backupFile: outputPath, fileName, backupDir };

};
  
// Function to execute the backup
export const executeBackup = async () => {
    log('dbMaintenance:executeBackup: Backup process started at:'+ new Date());
    try {
        // Obter valores de configuração necessários para a tarefa
        const backupEntries = [
            'backupUsername',
            'backupPassword',
            'backupFrequency',
            'backupDay',
            'backupHour',
            'backupHost',
            'backupPath',
            'backupMethod'
        ];
        
        // Faz uma consulta ao banco de dados para pegar todas as entradas correspondentes
        const configs = await db.config.findAll({
            where: {
              entry: backupEntries
            }
        });
      
        // Transforma o resultado em um objeto chave-valor
        const configObj = {};
        configs.forEach(config => {
        configObj[config.entry] = config.value;
        });

        // Fazer o bakup do Banco
        var {backupFile, fileName, backupDir} = await backupDatabase();

        log('dbMaintenance:executeBackup:database backupDir: '+backupDir);
        log('dbMaintenance:executeBackup:database name: '+fileName);
        log('dbMaintenance:executeBackup:database backupFile: '+backupFile);

        //Enviar os arquivos
        await exportFile({protocol: configObj.backupMethod, localPath: backupFile, remotePath: configObj.backupPath+fileName, options: configObj })

        // Após o upload, você pode excluir o arquivo temporário
        fs.unlink(backupFile, (err) => {
            if (err) {
                log('dbMaintenance:executeBackup:database: Erro ao remover arquivo temporário:', err);
            }
            });

        // Fazer o backup do diretório
        const startDate = subtractMonths(parseInt(configObj.backupFrequency) || 1);
        var {backupFile, fileName, backupDir} = await compressAndDownloadFiles(startDate);

        log('dbMaintenance:executeBackup:directory backupDir: '+backupDir);
        log('dbMaintenance:executeBackup:directory name: '+fileName);
        log('dbMaintenance:executeBackup:directory backupFile: '+backupFile);


        //Enviar os arquivos
        await exportFile({protocol: configObj.backupMethod, localPath: backupFile, remotePath: configObj.backupPath+fileName, options: configObj })

        // Após o upload, você pode excluir o arquivo temporário
        fs.unlink(backupFile, (err) => {
            if (err) {
                log('dbMaintenance:executeBackup:directory: Erro ao remover arquivo temporário:', err);
            }
            });

        log('dbMaintenance:executeBackup: Backup completed successfully.');
    } catch (error) {
        log('dbMaintenance:executeBackup: Error during the backup process:'+ error);
    }
};
  
// Function to generate a cron expression based on the user-defined schedule
const getCronExpression = ({ interval, dayOfMonth, time }) => {
    try{
        const [hour, minute] = time.split(':');
    
        if (interval === 1) {
        // Every month on the specified day and time
        return `${minute} ${hour} ${dayOfMonth} * *`;
        } else if (interval === 3) {
        // Every 3 months on the specified day and time
        return `${minute} ${hour} ${dayOfMonth} */3 *`;
        } else if (interval === 6) {
        // Every 6 months on the specified day and time
        return `${minute} ${hour} ${dayOfMonth} */6 *`;
        } else {
        throw new Error('Invalid interval');
        }
    }catch(e){
        log('dbMaintenance:getCronExpression: Error: '+ e);
        return null;
    }
};

// Main function to schedule the backup task
const scheduleBackupTask = async (config) => {
    try{
        const cronExpression = getCronExpression(config);
        log('dbMaintenance:scheduleBackupTask: Backup scheduled with cron expression:'+ cronExpression);

        // Se já houver uma tarefa agendada com o mesmo nome, a cancela antes de agendar novamente
        if (cronTasks['backupTask']) {
            cronTasks['backupTask'].stop();
            log('dbMaintenance:scheduleBackupTask: Backup stoped cron schedule:');
        }

        //'*/2 * * * *' a cada 2 minutos para testes se necessário
        const task = cron.schedule(cronExpression, async () => {
        log(`dbMaintenance:scheduleBackupTask: Backup task triggered at ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
        await executeBackup();
        });

        cronTasks['backupTask'] = task;
    }catch(e){
        log(`dbMaintenance:scheduleBackupTask: Eror: ${e}`);
    }
};
export const scheduleBackupTaskWithDb = async (name, config) => {
    try {
        const cronExpression = getCronExpression(config);
        log('dbMaintenance:scheduleBackupTask: Backup scheduled with cron expression:'+ cronExpression);
      // Verifica se já existe um agendamento com a mesma cron expression
      const existingSchedule = await db.cronSchedule.findOne({
        where: { name }
      });
  
      if (existingSchedule) {
        log(`dbMaintenance:scheduleBackupTask: Agendamento já existe: ${name}`);
        return;
      }
  
      // Cria um novo agendamento no banco de dados
      const newSchedule = await db.cronSchedule.create({
        name,
        cron_expression: cronExpression,
        status: true
      });
  
      // Agendar a nova tarefa no node-cron
      //'*/2 * * * *' a cada 2 minutos para testes se necessário
      const task = cron.schedule(cronExpression, async() => {
        log(`dbMaintenance:scheduleBackupTask: Backup task ${name} triggered at ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
        await executeBackup();
      });
  
      scheduledTasks[name] = task;
      task.start();
  
      log(`dbMaintenance:scheduleBackupTask: Novo agendamento criado para: ${name} com cron expression: ${cronExpression}`);
    } catch (error) {
      log('dbMaintenance:scheduleBackupTask: Erro ao criar novo agendamento:'+ error);
    }
}
  

// Função principal para exportar arquivos para outro servidor
export const exportFile = async ({ protocol, localPath, remotePath, options }) => {
    try {
        switch (protocol) {
            case 'scp':
                await transferSCP(localPath, remotePath, options);
                break;
            case 'ftp':
                await transferFTP(localPath, remotePath, options);
                break;
            case 'webdav':
                await transferWebDAV(localPath, remotePath, options);
                break;
            default:
                throw new Error(`Protocolo não suportado: ${protocol}`);
        }
        log(`Arquivo transferido com sucesso via ${protocol}`);
    } catch (error) {
        log(`Erro ao transferir arquivo via ${protocol}:`+ error);
    }
}

// Transferência de arquivos via SCP
async function transferSCP(localPath, remotePath, options) {
    return new Promise((resolve, reject) => {
        scp.scp(localPath, {
            host: options.backupHost,
            username: options.backupUsername,
            password: options.backupPassword,
            path: remotePath
        }, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}

// Transferência de arquivos via FTP
async function transferFTP(localPath, remotePath, options) {
    //log(`dbMaintenance:transferFTP: options ${JSON.stringify(options)}`)
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        await client.access({
            host: options.backupHost,
            user: options.backupUsername,
            password: options.backupPassword,
            secure: options.secure || false  // Usar FTP seguro ou não
        });
        await client.uploadFrom(localPath, remotePath);
    } catch (err) {
        throw new Error(`Erro FTP: ${err.message}`);
    } finally {
        client.close();
    }
}

// Transferência de arquivos via WebDAV
async function transferWebDAV(localPath, remotePath, options) {
    const webdavClient = createClient(
        options.backupHost, {
            username: options.backupUsername,
            password: options.backupPassword
        }
    );

    try {
        const fileStream = fs.createReadStream(localPath);
        await webdavClient.putFileContents(remotePath, fileStream, { overwrite: true });
    } catch (err) {
        throw new Error(`Erro WebDAV: ${err.message}`);
    }
}


function subtractMonths(monthsToSubtract) {
    // Obter a data atual
    let currentDate = new Date();
    
    // Subtrair meses
    currentDate.setMonth(currentDate.getMonth() - monthsToSubtract);
    
    // Formatar a data como string (exemplo: YYYY-MM-DD)
    const formattedDate = currentDate.toISOString().split('T')[0]; // Formata como 'YYYY-MM-DD'
    
    return formattedDate;
  }

//Função assincrona para criar a rotina de backup
export const checkBackupRoutine = async () =>{
    try{
        const backupEntries = [
            'backupUsername',
            'backupPassword',
            'backupFrequency',
            'backupDay',
            'backupHour',
            'backupHost',
            'backupPath',
            'backupMethod'
        ];
        
        // Faz uma consulta ao banco de dados para pegar todas as entradas correspondentes
        const configs = await db.config.findAll({
            where: {
              entry: backupEntries
            }
        });
        if(configs.lenght > 0){
            // Transforma o resultado em um objeto chave-valor
            const configObj = {};
            configs.forEach(config => {
            configObj[config.entry] = config.value;
            });
            
            //log('core-service:checkBackupRoutine:configObj: '+  JSON.stringify(configObj));
            if(configObj && configObj.backupMethod != '' && configObj.backupFrequency != ''&& configObj.backupHour != ''&& configObj.backupDay != ''){
                // Simulated user input for the backup schedule
                const userConfig = {
                    interval: parseInt(configObj.backupFrequency), // Interval: 1 (monthly), 3 (every 3 months), 6 (every 6 months)
                    dayOfMonth: parseInt(configObj.backupDay), // Day of the month (e.g., 15th)
                    time: configObj.backupHour, // Time of the day (24-hour format)
                };

                scheduleBackupTask(userConfig);
                //executeBackup();
            }
        }else{
            log('dbMaintenance:checkBackupRoutine:No configs:');
        }

    }catch(e){
        log('dbMaintenance:checkBackupRoutine:Erro: '+  e);
    }
    
}

