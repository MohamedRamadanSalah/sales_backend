const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');

describe('Auth Profile Management Tests', () => {
    let userToken;
    const testUser = {
        first_name: 'Profile',
        last_name: 'Tester',
        email: 'profiletest@realestate.com',
        phone_number: '+201777777777',
        password: 'testPass123',
    };

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/auth/signup')
            .send(testUser);
        userToken = res.body.data.token;
    });

    afterAll(async () => {
        const user = await pool.query("SELECT id FROM users WHERE email = $1", [testUser.email]);
        if (user.rows.length > 0) {
            await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [user.rows[0].id]);
        }
        await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
    });

    describe('PUT /api/auth/profile', () => {
        it('should update user profile', async () => {
            const res = await request(app)
                .put('/api/auth/profile')
                .set('Authorization', `Bearer ${userToken}`)
                .set('Accept-Language', 'en')
                .send({
                    first_name: 'UpdatedFirst',
                    last_name: 'UpdatedLast',
                    preferred_language: 'en',
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Profile updated successfully');
            expect(res.body.data.first_name).toBe('UpdatedFirst');
            expect(res.body.data.last_name).toBe('UpdatedLast');
        });

        it('should return Arabic success message', async () => {
            const res = await request(app)
                .put('/api/auth/profile')
                .set('Authorization', `Bearer ${userToken}`)
                .set('Accept-Language', 'ar')
                .send({ first_name: 'تحديث' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('تم تحديث الملف الشخصي بنجاح');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .put('/api/auth/profile')
                .send({ first_name: 'Hacker' });

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('POST /api/auth/change-password', () => {
        it('should change password with correct current password', async () => {
            const res = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${userToken}`)
                .set('Accept-Language', 'en')
                .send({
                    current_password: testUser.password,
                    new_password: 'newTestPass456',
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Password changed successfully');
        });

        it('should allow login with new password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email, password: 'newTestPass456' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toHaveProperty('token');
            userToken = res.body.data.token;
        });

        it('should reject wrong current password', async () => {
            const res = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${userToken}`)
                .set('Accept-Language', 'en')
                .send({
                    current_password: 'wrongOldPassword',
                    new_password: 'newPass789',
                });

            expect(res.statusCode).toEqual(401);
        });

        it('should reject short new password', async () => {
            const res = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    current_password: 'newTestPass456',
                    new_password: '123',
                });

            expect(res.statusCode).toEqual(400);
        });

        it('should reject missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${userToken}`)
                .send({});

            expect(res.statusCode).toEqual(400);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/auth/change-password')
                .send({
                    current_password: 'newTestPass456',
                    new_password: 'anotherPass',
                });

            expect(res.statusCode).toEqual(401);
        });
    });
});
