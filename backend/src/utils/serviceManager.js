import { exec } from 'child_process';
import { log } from './log.js';
import process from 'process';
const env = process.env.NODE_ENV || 'development';

export async function restartService(serviceName) {
    try {
        //const command = `pm2 restart ${serviceName}`;
        //const command = `docker restart ${serviceName}`;
        
        const COMMAND = process.env.COMMAND || `pm2 restart ${serviceName}`; //
        await new Promise((resolve, reject) => {
            exec(COMMAND, (err, stdout, stderr) => {
                if (err) {
                    log(`Error restarting service: ${stderr}`);
                    return reject(err);
                }
                log(`Service restarted successfully: ${stdout}`);
                resolve(stdout);
            });
        });
    } catch (error) {
        log(`Failed to restart service: ${error.message}`);
    }
}
