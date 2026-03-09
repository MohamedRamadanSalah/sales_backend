const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../db');
const { signupSchema, loginSchema } = require('../validations/authValidation');
const { blacklistToken } = require('../utils/tokenBlacklist');

// ─── Helper: Generate tokens ───
function generateAccessToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, jti: crypto.randomUUID() },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

function generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
}

// ─── SIGNUP ───
exports.signup = async (req, res, next) => {
    try {
        const { error, value } = signupSchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        const { first_name, last_name, email, phone_number, password, preferred_language } = value;
        const isArabic = req.language === 'ar';

        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR phone_number = $2',
            [email, phone_number]
        );

        if (existing.rows.length > 0) {
            const err = new Error('User already exists with this email or phone number.');
            err.statusCode = 409;
            err.message_ar = 'يوجد مستخدم بالفعل بهذا البريد الإلكتروني أو رقم الهاتف.';
            throw err;
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const result = await pool.query(`
            INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role, preferred_language)
            VALUES ($1, $2, $3, $4, $5, 'client', $6)
            RETURNING id, first_name, last_name, email, phone_number, role, preferred_language, created_at
        `, [first_name, last_name, email, phone_number, password_hash, preferred_language || 'ar']);

        const user = result.rows[0];

        const token = generateAccessToken(user);
        const refreshToken = generateRefreshToken();

        // Store refresh token in DB (expires in 30 days)
        const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, refreshToken, refreshExpiresAt]
        );

        if (req.audit) await req.audit('signup', 'user', user.id, { email, role: 'client' });

        res.status(201).json({
            success: true,
            message: isArabic ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully',
            data: { user, token, refresh_token: refreshToken }
        });
    } catch (err) { next(err); }
};

// ─── LOGIN ───
exports.login = async (req, res, next) => {
    try {
        const { error, value } = loginSchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        const { email, password } = value;
        const isArabic = req.language === 'ar';

        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);

        if (result.rows.length === 0) {
            const err = new Error('Invalid email or password.');
            err.statusCode = 401;
            err.message_ar = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
            throw err;
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            const err = new Error('Invalid email or password.');
            err.statusCode = 401;
            err.message_ar = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
            throw err;
        }

        const token = generateAccessToken(user);
        const refreshToken = generateRefreshToken();

        // Store refresh token in DB (expires in 30 days)
        const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, refreshToken, refreshExpiresAt]
        );

        delete user.password_hash;

        if (req.audit) await req.audit('login', 'user', user.id);

        res.json({
            success: true,
            message: isArabic ? 'تم تسجيل الدخول بنجاح' : 'Login successful',
            data: { user, token, refresh_token: refreshToken }
        });
    } catch (err) { next(err); }
};

// ─── GET PROFILE ───
exports.getProfile = async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT id, first_name, last_name, email, phone_number, role, preferred_language, created_at FROM users WHERE id = $1 AND deleted_at IS NULL',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            const err = new Error('User not found');
            err.statusCode = 404; throw err;
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) { next(err); }
};

// ─── UPDATE PROFILE ───
exports.updateProfile = async (req, res, next) => {
    try {
        const { first_name, last_name, phone_number, preferred_language } = req.body;
        const isArabic = req.language === 'ar';

        const result = await pool.query(`
            UPDATE users SET
                first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                phone_number = COALESCE($3, phone_number),
                preferred_language = COALESCE($4, preferred_language)
            WHERE id = $5 AND deleted_at IS NULL
            RETURNING id, first_name, last_name, email, phone_number, role, preferred_language
        `, [first_name, last_name, phone_number, preferred_language, req.user.id]);

        if (result.rows.length === 0) {
            const err = new Error(isArabic ? 'المستخدم غير موجود' : 'User not found');
            err.statusCode = 404; throw err;
        }

        if (req.audit) await req.audit('update', 'user', req.user.id, { fields: Object.keys(req.body) });

        res.json({
            success: true,
            message: isArabic ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully',
            data: result.rows[0],
        });
    } catch (err) { next(err); }
};

// ─── CHANGE PASSWORD ───
exports.changePassword = async (req, res, next) => {
    try {
        const { current_password, new_password } = req.body;
        const isArabic = req.language === 'ar';

        if (!current_password || !new_password) {
            const err = new Error(isArabic ? 'كلمة المرور الحالية والجديدة مطلوبتان' : 'Current and new password are required');
            err.statusCode = 400; throw err;
        }
        if (new_password.length < 6) {
            const err = new Error(isArabic ? 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' : 'New password must be at least 6 characters');
            err.statusCode = 400; throw err;
        }

        const user = await pool.query('SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL', [req.user.id]);
        if (user.rows.length === 0) {
            const err = new Error(isArabic ? 'المستخدم غير موجود' : 'User not found');
            err.statusCode = 404; throw err;
        }

        const isMatch = await bcrypt.compare(current_password, user.rows[0].password_hash);
        if (!isMatch) {
            const err = new Error(isArabic ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect');
            err.statusCode = 401; throw err;
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(new_password, salt);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);

        // Invalidate all refresh tokens for this user (force re-login on other devices)
        await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);

        // Blacklist the current access token
        if (req.token) blacklistToken(req.token);

        if (req.audit) await req.audit('change_password', 'user', req.user.id);

        res.json({
            success: true,
            message: isArabic ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully',
        });
    } catch (err) { next(err); }
};

// ─── LOGOUT ───
exports.logout = async (req, res, next) => {
    try {
        const isArabic = req.language === 'ar';

        // Blacklist the current access token
        if (req.token) blacklistToken(req.token);

        // Remove all refresh tokens for this user
        await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);

        if (req.audit) await req.audit('logout', 'user', req.user.id);

        res.json({
            success: true,
            message: isArabic ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully',
        });
    } catch (err) { next(err); }
};

// ─── REFRESH TOKEN ───
exports.refreshToken = async (req, res, next) => {
    try {
        const { refresh_token } = req.body;
        const isArabic = req.language === 'ar';

        if (!refresh_token) {
            const err = new Error(isArabic ? 'رمز التحديث مطلوب' : 'Refresh token is required');
            err.statusCode = 400; throw err;
        }

        // Find valid refresh token
        const result = await pool.query(
            'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
            [refresh_token]
        );

        if (result.rows.length === 0) {
            const err = new Error(isArabic ? 'رمز التحديث غير صالح أو منتهي' : 'Invalid or expired refresh token');
            err.statusCode = 401; throw err;
        }

        const storedToken = result.rows[0];

        // Get user
        const userResult = await pool.query(
            'SELECT id, email, role FROM users WHERE id = $1 AND deleted_at IS NULL',
            [storedToken.user_id]
        );

        if (userResult.rows.length === 0) {
            const err = new Error(isArabic ? 'المستخدم غير موجود' : 'User not found');
            err.statusCode = 401; throw err;
        }

        const user = userResult.rows[0];

        // Rotate: delete old refresh token, create new one
        await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [storedToken.id]);

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken();
        const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, newRefreshToken, refreshExpiresAt]
        );

        res.json({
            success: true,
            message: isArabic ? 'تم تحديث الرموز بنجاح' : 'Tokens refreshed successfully',
            data: {
                token: newAccessToken,
                refresh_token: newRefreshToken,
            }
        });
    } catch (err) { next(err); }
};
