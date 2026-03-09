/**
 * Email Service
 * Configurable email transport using Nodemailer.
 * Set SMTP_* env vars in production. Falls back to console logging in dev.
 */
const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Production: use real SMTP
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

/**
 * Send an email
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} [options.html] - HTML body
 * @returns {Promise<boolean>} - true if sent successfully
 */
async function sendEmail({ to, subject, text, html }) {
    if (!transporter) {
        // Development: log to console instead of sending
        logger.info('📧 EMAIL (dev mode - not actually sent)', {
            to,
            subject,
            body: text,
        });
        return true;
    }

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject,
            text,
            html,
        });
        logger.info('Email sent successfully', { to, subject });
        return true;
    } catch (err) {
        logger.error('Failed to send email', { to, subject, error: err.message });
        return false;
    }
}

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} token - Reset token
 * @param {boolean} isArabic - Whether to use Arabic template
 */
async function sendPasswordResetEmail(email, token, isArabic = false) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const subject = isArabic
        ? 'إعادة تعيين كلمة المرور'
        : 'Password Reset Request';

    const text = isArabic
        ? `لقد طلبت إعادة تعيين كلمة المرور.\n\nرابط إعادة التعيين: ${resetUrl}\n\nهذا الرابط صالح لمدة ساعة واحدة.\n\nإذا لم تطلب ذلك، تجاهل هذا البريد.`
        : `You requested a password reset.\n\nReset link: ${resetUrl}\n\nThis link is valid for 1 hour.\n\nIf you didn't request this, please ignore this email.`;

    const html = isArabic
        ? `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>إعادة تعيين كلمة المرور</h2>
            <p>لقد طلبت إعادة تعيين كلمة المرور.</p>
            <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">إعادة تعيين كلمة المرور</a></p>
            <p style="color: #666;">هذا الرابط صالح لمدة ساعة واحدة.</p>
            <p style="color: #999;">إذا لم تطلب ذلك، تجاهل هذا البريد.</p>
           </div>`
        : `<div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your account.</p>
            <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
            <p style="color: #666;">This link is valid for 1 hour.</p>
            <p style="color: #999;">If you didn't request this, please ignore this email.</p>
           </div>`;

    return sendEmail({ to: email, subject, text, html });
}

module.exports = { sendEmail, sendPasswordResetEmail };
