const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');

describe('Property API Integration Tests', () => {
    let createdPropertyId;
    let authToken;

    // Create a test user and get token before tests
    beforeAll(async () => {
        const res = await request(app)
            .post('/api/auth/signup')
            .send({
                first_name: 'PropTest',
                last_name: 'User',
                email: 'proptest@realestate.com',
                phone_number: '+201222222222',
                password: 'testPass123',
            });
        authToken = res.body.data.token;
    });

    // Clean up after tests
    afterAll(async () => {
        if (createdPropertyId) {
            await pool.query('DELETE FROM properties WHERE id = $1', [createdPropertyId]);
        }
        await pool.query("DELETE FROM users WHERE email = 'proptest@realestate.com'");
    });

    describe('POST /api/properties', () => {
        let testLocationId;
        let testCategoryId;

        beforeAll(async () => {
            let locRes = await pool.query("SELECT id FROM locations WHERE name_en = 'New Cairo' LIMIT 1");
            if (locRes.rows.length === 0) {
                locRes = await pool.query("INSERT INTO locations (name_ar, name_en, type) VALUES ('القاهرة الجديدة', 'New Cairo', 'city') RETURNING id");
            }
            testLocationId = locRes.rows[0].id;

            let catRes = await pool.query("SELECT id FROM categories WHERE slug = 'apartment' LIMIT 1");
            if (catRes.rows.length === 0) {
                catRes = await pool.query("INSERT INTO categories (name_ar, name_en, slug) VALUES ('شقة', 'Apartment', 'apartment') RETURNING id");
            }
            testCategoryId = catRes.rows[0].id;
        });

        it('should create a new property with Arabic bilingual support', async () => {
            const res = await request(app)
                .post('/api/properties')
                .set('Accept-Language', 'ar')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    category_id: testCategoryId,
                    location_id: testLocationId,
                    title_ar: 'شقة فاخرة للبيع في التجمع الخامس',
                    title_en: 'Luxury Apartment for Sale in Fifth Settlement',
                    description_ar: 'شقة 200 متر مربع بتشطيب كامل في كمبوند متميز بالتجمع الخامس',
                    description_en: 'A 200 sqm fully finished apartment in a premium compound in Fifth Settlement',
                    listing_type: 'sale',
                    property_origin: 'primary',
                    finishing_type: 'fully_finished',
                    legal_status: 'registered',
                    price: 5500000,
                    down_payment: 550000,
                    installment_years: 7,
                    area_sqm: 200,
                    bedrooms: 3,
                    bathrooms: 2,
                    floor_level: 5,
                });

            if (res.statusCode !== 201) console.error("CREATE PROPERTY FAILED:", res.body);
            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('تم إضافة العقار بنجاح وهو في انتظار موافقة الإدارة');
            expect(res.body.data.status).toBe('pending_approval');
            createdPropertyId = res.body.data.id;
        });

        it('should block unauthenticated property creation', async () => {
            const res = await request(app)
                .post('/api/properties')
                .send({ title_ar: 'test' });

            expect(res.statusCode).toEqual(401);
        });

        it('should reject property with missing required fields', async () => {
            const res = await request(app)
                .post('/api/properties')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ title_ar: 'عقار اختباري' });

            expect(res.statusCode).toEqual(400);
        });
    });

    describe('GET /api/properties', () => {
        it('should NOT return pending properties in public listing', async () => {
            const res = await request(app)
                .get('/api/properties')
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
            const found = res.body.data.find(p => p.id === createdPropertyId);
            expect(found).toBeUndefined();
        });
    });

    describe('PATCH /api/properties/:id/status (Admin Approval)', () => {
        let adminToken;

        beforeAll(async () => {
            // Login as the admin we seeded 
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

        it('should approve a pending property', async () => {
            const res = await request(app)
                .patch(`/api/properties/${createdPropertyId}/status`)
                .set('Accept-Language', 'en')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'approved' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Property approved');
        });

        it('should now show approved property in public listing', async () => {
            const res = await request(app)
                .get('/api/properties')
                .set('Accept-Language', 'en');

            const found = res.body.data.find(p => p.id === createdPropertyId);
            expect(found).toBeDefined();
            expect(found.title).toBe('Luxury Apartment for Sale in Fifth Settlement');
        });

        it('should return Arabic response when queried in Arabic', async () => {
            const res = await request(app)
                .get(`/api/properties/${createdPropertyId}`)
                .set('Accept-Language', 'ar');

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.title).toBe('شقة فاخرة للبيع في التجمع الخامس');
        });
    });
});
