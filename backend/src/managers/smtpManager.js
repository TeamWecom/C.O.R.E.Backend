// smtpManager.js
import nodemailer from 'nodemailer';
import db from '../managers/databaseSequelize.js';
import {log} from '../utils/log.js';

// Método para enviar e-mails
export const sendEmail = async(toList, subject, body) =>{

    // Obter valores de configuração necessários para a tarefa
    const smtpParamters = [
        'smtpUsername',
        'smtpPassword',
        'smtpHost',
        'smtpSecure',
        'smtpPort'
    ];

    // Faz uma consulta ao banco de dados para pegar todas as entradas correspondentes
    const configs = await db.config.findAll({
        where: {
        entry: smtpParamters
        }
    });

    // Transforma o resultado em um objeto chave-valor
    const configObj = {};
    configs.forEach(config => {
    configObj[config.entry] = config.value;
    });
log(`smtpManager:sendEmail:configObj ${JSON.stringify(configObj)}`)
    const transporter = nodemailer.createTransport({
        host: configObj.smtpHost,
        port: configObj.smtpPort || 587, // Porta padrão de SMTP é 587
        secure: false, // True para SSL, false para TLS
        auth: {
            user: configObj.smtpUsername,
            pass: configObj.smtpPassword
        },
        tls: {
            rejectUnauthorized: false, // Evitar rejeitar certificados não autorizados
            minVersion: 'TLSv1.2' // Garantir que no mínimo TLS 1.2 será usado
        }
    });
    log('SMTPManager:sendEmail: Transporter initialized.');


    if (!transporter) {
        throw new Error('SMTPManager:sendEmail Transporter not initialized.');
    }

    const mailOptions = {
        from: configObj.smtpUsername, // E-mail de origem
        to: toList.join(','), // Lista de e-mails como string
        subject: subject, // Assunto do e-mail
        html: body // Corpo do e-mail em formato HTML
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        log(`SMTPManager:sendEmail Email sent successfully to ${toList}. MessageId: ${info.messageId}`);
        return info;
    } catch (error) {
        log('SMTPManager:sendEmail Error sending email:', error);
        throw error;
    }
}
