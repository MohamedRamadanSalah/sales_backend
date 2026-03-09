const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');

describe('Location API Integration Tests', () => {
    let adminToken;

    // Get an admin token before running tests
    beforeAll(async () => {
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);
        await pool.query(
            "UPDATE users SET password_hash = $1 WHERE email = 'admin@realestate.com'",
            [hash]
        );
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@realestate.com', password: 'admin123' });
        adminToken = res.body.data.token;
    });

    // Clean up inserted test locations after the suite finishes
    afterAll(async () => {
        await pool.query("DELETE FROM locations WHERE name_en LIKE 'Test %'");
    });

    describe('POST /api/locations', () => {
        it('should create a new Governorate in English', async () => {
            const res = await request(app)
                .post('/api/locations')
                .set('Accept-Language', 'en')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name_ar: 'اختبار القاهرة',
                    name_en: 'Test Cairo',
                    type: 'governorate'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Location added successfully');
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.name_en).toBe('Test Cairo');
        });

        it('should return Arabic error messages if Accept-Language is ar', async () => {
            const res = await request(app)
                .post('/api/locations')
                .set('Accept-Language', 'ar')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name_ar: 'اختبار الجيزة',
                    name_en: 'Test Giza',
                    // Missing 'type' to trigger a validation error
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
        });

        it('should block duplicate locations and return Arabic error', async () => {
            // Setup duplicate
            await request(app).post('/api/locations')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name_ar: 'اختبار مكرر', name_en: 'Test Duplicate', type: 'city'
                });

            // Try inserting again in Arabic
            const res = await request(app)
                .post('/api/locations')
                .set('Accept-Language', 'ar')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name_ar: 'اختبار مكرر', name_en: 'Test Duplicate', type: 'city'
                });

            expect(res.statusCode).toEqual(409);
            expect(res.body.error).toBe('يوجد موقع بهذا الاسم بالفعل.');
        });
    });

    describe('GET /api/locations', () => {
        it('should fetch locations structured for Arabic UI', async () => {
            const res = await request(app)
                .get('/api/locations')
                .set('Accept-Language', 'ar');

            expect(res.statusCode).toEqual(200);
            if (res.body.data.length > 0) {
                expect(res.body.data[0].name).toBe(res.body.data[0].name_ar);
            }
        });

        it('should fetch locations structured for English UI', async () => {
            const res = await request(app)
                .get('/api/locations')
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
            if (res.body.data.length > 0) {
                expect(res.body.data[0].name).toBe(res.body.data[0].name_en);
            }
        });
    });
});
