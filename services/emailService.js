const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

const sendEmail = async (to, subject, html) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.log('⚠️  Email credentials missing. Logging email to console:');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log('Body:', html);
            return { success: true, message: 'Email logged to console (no credentials)' };
        }

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html
        });

        console.log('Message sent: %s', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

/**
 * Send candidate credentials email with login portal and interview link
 */
const sendCandidateCredentialsEmail = async (candidateEmail, candidateName, password, interviewToken, jobTitle, expiresAt) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const loginUrl = `${frontendUrl}/login`;
    const interviewLink = `${frontendUrl}/interview/${interviewToken}`;
    const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; }
                .content { padding: 30px; }
                .credentials-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
                .credentials-box h3 { margin-top: 0; color: #4a5568; }
                .credential-item { margin: 10px 0; }
                .credential-label { font-weight: 600; color: #718096; }
                .credential-value { font-family: monospace; background: #edf2f7; padding: 5px 10px; border-radius: 4px; color: #2d3748; }
                .btn { display: inline-block; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; text-align: center; margin: 10px 5px; }
                .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; }
                .btn-secondary { background: #48bb78; color: white !important; }
                .important-note { background: #fff5f5; border-left: 4px solid #fc8181; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
                .footer { text-align: center; padding: 20px; color: #718096; font-size: 14px; border-top: 1px solid #e2e8f0; }
                .divider { height: 1px; background: #e2e8f0; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Interview Invitation</h1>
                </div>
                <div class="content">
                    <p>Dear <strong>${candidateName}</strong>,</p>
                    <p>Congratulations! You have been selected for an interview for the position of <strong>${jobTitle}</strong>.</p>
                    
                    <div class="credentials-box">
                        <h3>🔐 Your Login Credentials</h3>
                        <div class="credential-item">
                            <span class="credential-label">Email:</span>
                            <span class="credential-value">${candidateEmail}</span>
                        </div>
                        <div class="credential-item">
                            <span class="credential-label">Password:</span>
                            <span class="credential-value">${password}</span>
                        </div>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${loginUrl}" class="btn btn-primary">🚀 Login to Portal</a>
                        <a href="${interviewLink}" class="btn btn-secondary">▶️ Start Interview</a>
                    </div>

                    <div class="important-note">
                        <strong>⏰ Important:</strong> Your interview link will expire on <strong>${expiryDate}</strong>. Please complete your interview before this date.
                    </div>

                    <div class="divider"></div>

                    <p><strong>How to proceed:</strong></p>
                    <ol>
                        <li>Click "Login to Portal" and use the credentials above</li>
                        <li>Once logged in, you'll see your interview link</li>
                        <li>Click "Start Interview" when you're ready</li>
                        <li>We recommend using a quiet environment with good lighting</li>
                    </ol>
                </div>
                <div class="footer">
                    <p>Good luck with your interview! 🍀</p>
                    <p>Recruiting Team</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return sendEmail(candidateEmail, `Interview Invitation: ${jobTitle} - Your Login Credentials`, html);
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, name, resetToken) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .btn { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; border-radius: 8px; text-decoration: none; font-weight: 600; }
                .footer { text-align: center; padding: 20px; color: #718096; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔑 Password Reset Request</h1>
                </div>
                <div class="content">
                    <p>Dear <strong>${name}</strong>,</p>
                    <p>We received a request to reset your password. Click the button below to set a new password:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" class="btn">Reset Password</a>
                    </div>

                    <p style="color: #718096; font-size: 14px;">If you didn't request this, please ignore this email. This link will expire in 1 hour.</p>
                </div>
                <div class="footer">
                    <p>Recruiting Team</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return sendEmail(email, 'Password Reset Request', html);
};

module.exports = { sendEmail, sendCandidateCredentialsEmail, sendPasswordResetEmail };
