// smtpManager.js
import nodemailer from 'nodemailer';

class SMTPManager {
    constructor(configs) {
        this.configs = configs; // Configurações do SMTP passadas na instância
        this.transporter = null;
    }

    // Método para inicializar o cliente SMTP com as configurações
    initialize() {
        this.transporter = nodemailer.createTransport({
            host: this.configs.host,
            port: this.configs.port || 587, // Porta padrão de SMTP é 587
            secure: this.configs.secure || false, // True para SSL, false para TLS
            auth: {
                user: this.configs.auth.user,
                pass: this.configs.auth.pass
            }
        });
        log('SMTPManager:initialize Transporter initialized.');
    }

    // Método para enviar e-mails
    async sendEmail(toList, subject, body) {
        if (!this.transporter) {
            throw new Error('SMTPManager:sendEmail Transporter not initialized.');
        }

        const mailOptions = {
            from: this.configs.auth.user, // E-mail de origem
            to: toList.join(','), // Lista de e-mails como string
            subject: subject, // Assunto do e-mail
            html: body // Corpo do e-mail em formato HTML
        };

        try {
            let info = await this.transporter.sendMail(mailOptions);
            log(`SMTPManager:sendEmail Email sent successfully to ${toList}. MessageId: ${info.messageId}`);
            return info;
        } catch (error) {
            log('SMTPManager:sendEmail Error sending email:', error);
            throw error;
        }
    }
}

// Exporta a classe para ser usada no projeto
export default SMTPManager;
