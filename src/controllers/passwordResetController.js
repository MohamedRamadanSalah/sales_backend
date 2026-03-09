const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { sendPasswordResetEmail } = require('../utils/email');

// ─── REQUEST PASSWORD RESET ───
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const isArabic = req.language === 'ar';

        if (!email) {
            const err = new Error(isArabic ? 'البريد الإلكتروني مطلوب' : 'Email is required');
            err.statusCode = 400; throw err;
        }

        // Check if user exists
        const user = await pool.query('SELECT id, email FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);

        // Always return success (don't reveal if email exists)
        if (user.rows.length === 0) {
            return res.json({
                success: true,
                message: isArabic
                    ? 'إذا كان البريد الإلكتروني مسجلاً، ستتلقى رابط إعادة تعيين كلمة المرور'
                    : 'If the email is registered, you will receive a password reset link.',
            });
        }

        // Generate a secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Invalidate any existing tokens
        await pool.query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false', [user.rows[0].id]);

        // Store the new token
        await pool.query(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.rows[0].id, token, expiresAt]
        );

        // Log audit
        if (req.audit) await req.audit('password_reset_request', 'user', user.rows[0].id);

        // Send password reset email (in dev mode, logs to console)
        await sendPasswordResetEmail(email, token, isArabic);

        const response = {
            success: true,
            message: isArabic
                ? 'إذا كان البريد الإلكتروني مسجلاً، ستتلقى رابط إعادة تعيين كلمة المرور'
                : 'If the email is registered, you will receive a password reset link.',
        };

        // Dev only: include token in response for testing
        if (process.env.NODE_ENV !== 'production') {
            response.dev_token = token;
            response.dev_note = 'This token is only shown in development mode. In production, it would be sent via email.';
        }

        res.json(response);
    } catch (err) { next(err); }
};

// ─── RESET PASSWORD WITH TOKEN ───
exports.resetPassword = async (req, res, next) => {
    try {
        const { token, new_password } = req.body;
        const isArabic = req.language === 'ar';

        if (!token || !new_password) {
            const err = new Error(isArabic ? 'الرمز وكلمة المرور الجديدة مطلوبان' : 'Token and new password are required');
            err.statusCode = 400; throw err;
        }

        if (new_password.length < 6) {
            const err = new Error(isArabic ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
            err.statusCode = 400; throw err;
        }

        // Find valid token
        const tokenResult = await pool.query(
            'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW()',
            [token]
        );

        if (tokenResult.rows.length === 0) {
            const err = new Error(isArabic ? 'الرابط غير صالح أو منتهي الصلاحية' : 'Invalid or expired reset link');
            err.statusCode = 400; throw err;
        }

        const resetToken = tokenResult.rows[0];

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(new_password, salt);

        // Update password and mark token as used
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, resetToken.user_id]);
        await pool.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [resetToken.id]);

        // Log audit
        if (req.audit) await req.audit('password_reset', 'user', resetToken.user_id);

        res.json({
            success: true,
            message: isArabic ? 'تم تغيير كلمة المرور بنجاح' : 'Password has been reset successfully',
        });
    } catch (err) { next(err); }
};
