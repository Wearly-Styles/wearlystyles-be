import nodemailer from "nodemailer";

export class EmailService {
    private transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com", 
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    async sendResetOtpEmail(to: string, otpCode: string) {
        try {
            await this.transporter.sendMail({
                from: `"Wearly Styles Support" <${process.env.SMTP_USER}>`,
                to,
                subject: "Code to reset your password",
                html: `
                    <div style="font-family: sans-serif; text-align: center; padding: 20px;">
                        <h2>Your verification code is:</h2>
                        <h2 style="color: #8B4513; letter-spacing: 5px; font-size: 40px;">${otpCode}</h2>
                        <p>This code will expire in 3 minutes. Please do not share this code with anyone.</p>
                    </div>
                `,
            });
            console.log("==> Email sent to:", to);
        } catch (error) {
            console.error("==> Error sending email:", error);
            throw error; 
        }
    }
}
export const emailService = new EmailService();