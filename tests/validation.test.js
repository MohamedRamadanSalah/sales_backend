const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');

describe('Validation and Security Integration Tests', () => {
    let clientToken, clientUserId;
    let testLocationId, testCategoryId;

    beforeAll(async () => {
        // Clean up
        await pool.query("DELETE FROM users WHERE email = 'valtest@realestate.com'");

        let locRes = await pool.query("SELECT id FROM locations WHERE name_en = 'New Cairo' LIMIT 1");
        testLocationId = locRes.rows[0].id;

        let catRes = await pool.query("SELECT id FROM categories WHERE slug = 'apartment' LIMIT 1");
        testCategoryId = catRes.rows[0].id;

        // Create user
        const clientRes = await request(app).post('/api/auth/signup').send({
            first_name: 'ValTest', last_name: 'User',
            email: 'valtest@realestate.com', phone_number: '+201555555599', password: 'testPass123',
        });
        clientToken = clientRes.body.data.token;
        clientUserId = clientRes.body.data.user.id;
    });

    afterAll(async () => {
        await pool.query("DELETE FROM properties WHERE user_id = $1", [clientUserId]);
        await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [clientUserId]);
        await pool.query("DELETE FROM users WHERE id = $1", [clientUserId]);
    });

    describe('Security & Input Sanitization', () => {
        it('should sanitize XSS payloads in property titles', async () => {
            const xssPayload = '<script>alert("XSS")</script> Test Property';
            
            const res = await request(app).post('/api/properties')
                .set('Authorization', `Bearer ${clientToken}`)
                .send({
                    category_id: testCategoryId, location_id: testLocationId,
                    title_ar: xssPayload, title_en: xssPayload,
                    description_ar: 'Description that is long enough to bypass validation logic',
                    listing_type: 'sale', property_origin: 'primary', finishing_type: 'fully_finished',
                    legal_status: 'registered', price: 1000000, area_sqm: 100,
                });

            // Assuming Joi validation fails or sanitation strips tags
            // EITHER we get a 400 (validation bounce) OR a 201 with stripped script
            if (res.statusCode === 201) {
                expect(res.body.data.title_en).not.toContain('<script>');
            } else {
                expect(res.statusCode).toEqual(400); // Validation blocked it
            }
        });

        it('should handle SQL injection attempts in search queries gracefully', async () => {
            const sqlInjection = "'; DROP TABLE users; --";
            
            const res = await request(app)
                .get(`/api/properties?search=${encodeURIComponent(sqlInjection)}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            // Must not execute SQL obviously, should return 0 results or safely escape it
        });
    });

    describe('Numeric Boundaries', () => {
        it('should reject negative price', async () => {
            const res = await request(app).post('/api/properties')
                .set('Authorization', `Bearer ${clientToken}`)
                .send({
                    category_id: testCategoryId, location_id: testLocationId,
                    title_ar: 'عقار تجريبي', title_en: 'Test Boundary',
                    description_ar: 'وصف تجريبي طويل جدا ومناسب',
                    listing_type: 'sale', property_origin: 'primary', finishing_type: 'fully_finished',
                    legal_status: 'registered', price: -10000, area_sqm: 100,
                });

            expect(res.statusCode).toEqual(400);
        });

        it('should reject zero area (sqm)', async () => {
            const res = await request(app).post('/api/properties')
                .set('Authorization', `Bearer ${clientToken}`)
                .send({
                    category_id: testCategoryId, location_id: testLocationId,
                    title_ar: 'عقار تجريبي', title_en: 'Test Boundary',
                    description_ar: 'وصف تجريبي طويل جدا ومناسب',
                    listing_type: 'sale', property_origin: 'primary', finishing_type: 'fully_finished',
                    legal_status: 'registered', price: 1000000, area_sqm: 0,
                });

            expect(res.statusCode).toEqual(400);
        });
    });

    describe('Auth Validation Edges', () => {
        it('should reject invalid email format on signup', async () => {
            const res = await request(app).post('/api/auth/signup').send({
                first_name: 'Bad', last_name: 'Email',
                email: 'invalid-email', phone_number: '+201555555598', password: 'testPass123',
            });
            expect(res.statusCode).toEqual(400);
        });

        it('should reject malformed JWT token', async () => {
            const res = await request(app).get('/api/auth/profile')
                .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature');
            
            expect(res.statusCode).toEqual(401);
        });

        it('should handle missing Bearer prefix in token', async () => {
            // Testing if auth middleware parses token without "Bearer" gently
            const res = await request(app).get('/api/auth/profile')
                .set('Authorization', `${clientToken}`);
            
            // Depending on strictness, this might be 401 or 200. Usually 401 if strict.
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('Malformed Payloads', () => {
        it('should handle malformed JSON gracefully', async () => {
            const res = await request(app).post('/api/auth/login')
                .set('Content-Type', 'application/json')
                .send('{ "email": "test@test.com", "password": "pass" '); // Missing closing brace
                
            expect([400, 500]).toContain(res.statusCode); // Express body-parser usually throws 400
        });

        it('should handle empty body gracefully', async () => {
            const res = await request(app).post('/api/properties')
                .set('Authorization', `Bearer ${clientToken}`)
                .set('Content-Type', 'application/json')
                .send();
                
            expect(res.statusCode).toEqual(400);
        });
    });
});
