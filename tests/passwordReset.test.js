const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');
const crypto = require('crypto');

describe('Password Reset API Integration Tests', () => {
    const testUser = {
        first_name: 'ResetTest',
        last_name: 'User',
        email: 'resettest@realestate.com',
        phone_number: '+201555555555',
        password: 'originalPass123',
    };
    let resetToken;
    let shortPasswordToken;
    let testUserId;

    beforeAll(async () => {
        // Create a test user
        const signupRes = await request(app)
            .post('/api/auth/signup')
            .send(testUser);
        testUserId = signupRes.body.data.user.id;

        // Get a reset token via API
        const res = await request(app)
            .post('/api/auth/forgot-password')
            .set('Accept-Language', 'en')
            .send({ email: testUser.email });
        resetToken = res.body.dev_token;

        // Create a second token directly in the DB (avoids rate limiting and token invalidation)
        shortPasswordToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await pool.query(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [testUserId, shortPasswordToken, expiresAt]
        );
    });

    afterAll(async () => {
        if (testUserId) {
            await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [testUserId]);
            await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [testUserId]);
        }
        await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
    });

    describe('POST /api/auth/forgot-password', () => {
        it('should have returned a reset token (dev mode)', () => {
            expect(resetToken).toBeDefined();
            expect(typeof resetToken).toBe('string');
            expect(resetToken.length).toBeGreaterThan(0);
        });

        it('should return success even for non-existent email (security)', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .set('Accept-Language', 'en')
                .send({ email: 'nonexistent@realestate.com' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
        });

        it('should reject request without email', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({});

            expect(res.statusCode).toEqual(400);
        });
    });

    describe('POST /api/auth/reset-password', () => {
        it('should reset the password with a valid token', async () => {
            expect(resetToken).toBeDefined();

            const res = await request(app)
                .post('/api/auth/reset-password')
                .set('Accept-Language', 'en')
                .send({
                    token: resetToken,
                    new_password: 'newSecurePass456',
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Password has been reset successfully');
        });

        it('should allow login with the new password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email, password: 'newSecurePass456' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toHaveProperty('token');
        });

        it('should reject reuse of the same token', async () => {
            const res = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: resetToken,
                    new_password: 'anotherPass789',
                });

            expect(res.statusCode).toEqual(400);
        });

        it('should reject invalid token', async () => {
            const res = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: 'invalid_token_value',
                    new_password: 'somePass123',
                });

            expect(res.statusCode).toEqual(400);
        });

        it('should reject reset with missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/reset-password')
                .send({});

            expect(res.statusCode).toEqual(400);
        });

        it('should reject reset with short password', async () => {
            // Use the pre-created DB token to avoid rate-limit issues
            const res = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: shortPasswordToken,
                    new_password: '12345',
                });

            expect(res.statusCode).toEqual(400);
        });
    });
});
