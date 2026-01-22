import nodemailer from 'nodemailer';
import { config } from '../config/env';

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        // Use Ethereal for dev if no real SMTP provided
        if (config.nodeEnv === 'development' || !config.email.smtp.host) {
            // Ethereal will be initialized lazily or using test account
            this.transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                auth: {
                    user: 'ethereal.user@example.com', // Placeholder, will be generated if not present
                    pass: 'secret'
                }
            });

            // Generate test account automatically for dev
            nodemailer.createTestAccount().then((account) => {
                this.transporter = nodemailer.createTransport({
                    host: account.smtp.host,
                    port: account.smtp.port,
                    secure: account.smtp.secure,
                    auth: {
                        user: account.user,
                        pass: account.pass,
                    },
                });
                console.log('📧 Email Service ready (Ethereal Dev Mode)');
                console.log(`📧 Dev Account: ${account.user}`);
            });
        } else {
            // Real SMTP
            this.transporter = nodemailer.createTransport({
                host: config.email.smtp.host,
                port: config.email.smtp.port,
                secure: config.email.smtp.secure,
                auth: {
                    user: config.email.smtp.user,
                    pass: config.email.smtp.pass,
                },
            });
        }
    }

    async sendPasswordResetEmail(to: string, resetLink: string, userName: string) {
        try {
            const info = await this.transporter.sendMail({
                from: '"FinDash Security" <security@findash.com>',
                to,
                subject: 'FinDash - Recuperação de Senha',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                        <h2 style="color: #4f46e5;">Recuperação de Senha</h2>
                        <p>Olá, ${userName},</p>
                        <p>Recebemos uma solicitação para redefinir sua senha no FinDash.</p>
                        <p>Clique no botão abaixo para criar uma nova senha:</p>
                        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0;">Redefinir Senha</a>
                        <p style="color: #666; font-size: 0.9em;">Este link expira em 1 hora.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #999; font-size: 0.8em;">Se você não solicitou isso, ignore este e-mail.</p>
                    </div>
                `,
            });

            console.log('📨 Password reset email sent:', info.messageId);
            if (config.nodeEnv === 'development' || !config.email.smtp.host) {
                console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
            }
        } catch (error) {
            console.error('❌ Failed to send email:', error);
            throw new Error('Failed to send email');
        }
    }
}
