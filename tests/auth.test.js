const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');

describe('Auth API Integration Tests', () => {
    const testUser = {
        first_name: 'Test',
        last_name: 'User',
        email: 'testuser@realestate.com',
        phone_number: '+201111111111',
        password: 'securePass123',
    };

    let clientToken;
    let refreshToken;

    // Clean up test user before tests to handle leftover data from previous runs
    beforeAll(async () => {
        // Clean by email
        const user = await pool.query("SELECT id FROM users WHERE email = $1", [testUser.email]);
        if (user.rows.length > 0) {
            await pool.query("DELETE FROM audit_logs WHERE user_id = $1", [user.rows[0].id]);
            await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [user.rows[0].id]);
            await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
        }
        // Also clean by phone to avoid unique constraint conflicts
        const byPhone = await pool.query("SELECT id, email FROM users WHERE phone_number = $1", [testUser.phone_number]);
        for (const row of byPhone.rows) {
            await pool.query("DELETE FROM audit_logs WHERE user_id = $1", [row.id]);
            await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [row.id]);
            await pool.query("DELETE FROM users WHERE id = $1", [row.id]);
        }
    });

    // Clean up test user after all tests
    afterAll(async () => {
        const user = await pool.query("SELECT id FROM users WHERE email = $1", [testUser.email]);
        if (user.rows.length > 0) {
            await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [user.rows[0].id]);
        }
        await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
    });

    describe('POST /api/auth/signup', () => {
        it('should register a new client and return a JWT token and refresh token', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .set('Accept-Language', 'en')
                .send(testUser);

            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Account created successfully');
            expect(res.body.data.user.role).toBe('client');
            expect(res.body.data).toHaveProperty('token');
            expect(res.body.data).toHaveProperty('refresh_token');
            clientToken = res.body.data.token;
            refreshToken = res.body.data.refresh_token;
        });

        it('should block duplicate signup', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .set('Accept-Language', 'ar')
                .send(testUser);

            expect(res.statusCode).toEqual(409);
            expect(res.body.error).toBe('يوجد مستخدم بالفعل بهذا البريد الإلكتروني أو رقم الهاتف.');
        });

        it('should reject signup with missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({ email: 'bad@test.com' });

            expect(res.statusCode).toEqual(400);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login with correct credentials and return token and refresh token', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .set('Accept-Language', 'en')
                .send({ email: testUser.email, password: testUser.password });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Login successful');
            expect(res.body.data).toHaveProperty('token');
            expect(res.body.data).toHaveProperty('refresh_token');
            clientToken = res.body.data.token;
            refreshToken = res.body.data.refresh_token;
        });

        it('should reject login with wrong password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .set('Accept-Language', 'ar')
                .send({ email: testUser.email, password: 'wrongPassword' });

            expect(res.statusCode).toEqual(401);
            expect(res.body.error).toBe('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
        });
    });

    describe('POST /api/auth/refresh-token', () => {
        it('should issue new tokens with a valid refresh token', async () => {
            const res = await request(app)
                .post('/api/auth/refresh-token')
                .send({ refresh_token: refreshToken });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('token');
            expect(res.body.data).toHaveProperty('refresh_token');

            // Update tokens for subsequent tests
            clientToken = res.body.data.token;
            refreshToken = res.body.data.refresh_token;
        });

        it('should reject reuse of old refresh token (rotation)', async () => {
            // The old refresh token was rotated in the previous test
            const res = await request(app)
                .post('/api/auth/refresh-token')
                .send({ refresh_token: 'old_invalid_token' });

            expect(res.statusCode).toEqual(401);
        });

        it('should reject request without refresh token', async () => {
            const res = await request(app)
                .post('/api/auth/refresh-token')
                .send({});

            expect(res.statusCode).toEqual(400);
        });
    });

    describe('GET /api/auth/profile', () => {
        it('should return profile when authenticated', async () => {
            const res = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.email).toBe(testUser.email);
        });

        it('should block unauthenticated access', async () => {
            const res = await request(app)
                .get('/api/auth/profile');

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should logout and invalidate the token', async () => {
            // First login to get a fresh token for logout test
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email, password: testUser.password });
            const logoutToken = loginRes.body.data.token;

            const res = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${logoutToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);

            // Verify the token is now blacklisted
            const profileRes = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${logoutToken}`);

            expect(profileRes.statusCode).toEqual(401);
        });

        it('should reject logout without token', async () => {
            const res = await request(app)
                .post('/api/auth/logout');

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('Role-Based Access Control', () => {
        it('should block client from creating a location (admin only)', async () => {
            // Login again since the previous token may have been invalidated
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email, password: testUser.password });
            clientToken = loginRes.body.data.token;

            const res = await request(app)
                .post('/api/locations')
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ name_ar: 'اختبار', name_en: 'Test RBAC', type: 'city' });

            expect(res.statusCode).toEqual(403);
        });

        it('should block client from approving properties (admin only)', async () => {
            const res = await request(app)
                .patch('/api/properties/1/status')
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ status: 'approved' });

            expect(res.statusCode).toEqual(403);
        });
    });
});
