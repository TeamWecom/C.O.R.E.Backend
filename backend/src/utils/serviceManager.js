import { exec } from 'child_process';
import { log } from './log.js';

export async function restartService(serviceName) {
    try {
        const command = `pm2 restart ${serviceName}`;

        await new Promise((resolve, reject) => {
            exec(command, (err, stdout, stderr) => {
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
