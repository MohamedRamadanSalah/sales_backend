const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');

describe('Favorites API Integration Tests', () => {
    let clientToken, testPropertyId, testLocationId, testCategoryId;

    beforeAll(async () => {
        // --- Clean up stale data from previous runs (e.g. --forceExit) ---
        await pool.query("DELETE FROM favorites WHERE property_id IN (SELECT id FROM properties WHERE title_ar = 'شقة اختبار المفضلة')");
        await pool.query("DELETE FROM properties WHERE title_ar = 'شقة اختبار المفضلة'");
        await pool.query("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email = 'favtest@realestate.com')");
        await pool.query("DELETE FROM users WHERE email = 'favtest@realestate.com'");

        // --- Ensure location and category exist ---
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

        // --- Login as admin to create an approved property ---
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);
        await pool.query("UPDATE users SET password_hash = $1 WHERE email = 'admin@realestate.com'", [hash]);

        const adminRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@realestate.com', password: 'admin123' });
        const adminToken = adminRes.body.data.token;

        // Create a property and approve it
        const propRes = await request(app)
            .post('/api/properties')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                category_id: testCategoryId,
                location_id: testLocationId,
                title_ar: 'شقة اختبار المفضلة',
                description_ar: 'وصف تجريبي لاختبار المفضلة يجب ان يكون طويل كفاية',
                listing_type: 'sale',
                property_origin: 'primary',
                finishing_type: 'fully_finished',
                legal_status: 'registered',
                price: 3000000,
                area_sqm: 150,
            });
        testPropertyId = propRes.body.data.id;

        await request(app)
            .patch(`/api/properties/${testPropertyId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'approved' });

        // --- Create a client user ---
        const clientRes = await request(app)
            .post('/api/auth/signup')
            .send({
                first_name: 'FavTest',
                last_name: 'User',
                email: 'favtest@realestate.com',
                phone_number: '+201444444444',
                password: 'testPass123',
            });
        clientToken = clientRes.body.data.token;
    }, 30000);

    afterAll(async () => {
        await pool.query("DELETE FROM favorites WHERE property_id = $1", [testPropertyId]);
        if (testPropertyId) await pool.query('DELETE FROM properties WHERE id = $1', [testPropertyId]);
        await pool.query("DELETE FROM users WHERE email = 'favtest@realestate.com'");
    });

    describe('POST /api/favorites', () => {
        it('should add a property to favorites', async () => {
            const res = await request(app)
                .post('/api/favorites')
                .set('Authorization', `Bearer ${clientToken}`)
                .set('Accept-Language', 'en')
                .send({ property_id: testPropertyId });

            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Added to favorites');
        });

        it('should block duplicate favorites', async () => {
            const res = await request(app)
                .post('/api/favorites')
                .set('Authorization', `Bearer ${clientToken}`)
                .set('Accept-Language', 'en')
                .send({ property_id: testPropertyId });

            expect(res.statusCode).toEqual(409);
        });

        it('should reject adding favorite without property_id', async () => {
            const res = await request(app)
                .post('/api/favorites')
                .set('Authorization', `Bearer ${clientToken}`)
                .send({});

            expect(res.statusCode).toEqual(400);
        });

        it('should reject adding non-existent property', async () => {
            const res = await request(app)
                .post('/api/favorites')
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ property_id: 999999 });

            expect(res.statusCode).toEqual(404);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/favorites')
                .send({ property_id: testPropertyId });

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('GET /api/favorites', () => {
        it('should return user favorites in English', async () => {
            const res = await request(app)
                .get('/api/favorites')
                .set('Authorization', `Bearer ${clientToken}`)
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.count).toBeGreaterThan(0);
            expect(res.body.data[0]).toHaveProperty('property');
            expect(res.body.data[0].property).toHaveProperty('title');
        });

        it('should return user favorites in Arabic', async () => {
            const res = await request(app)
                .get('/api/favorites')
                .set('Authorization', `Bearer ${clientToken}`)
                .set('Accept-Language', 'ar');

            expect(res.statusCode).toEqual(200);
            expect(res.body.data[0].property.title).toBe('شقة اختبار المفضلة');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/favorites');

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('DELETE /api/favorites/:propertyId', () => {
        it('should remove a property from favorites', async () => {
            const res = await request(app)
                .delete(`/api/favorites/${testPropertyId}`)
                .set('Authorization', `Bearer ${clientToken}`)
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Removed from favorites');
        });

        it('should return 404 when removing non-favorited property', async () => {
            const res = await request(app)
                .delete(`/api/favorites/${testPropertyId}`)
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.statusCode).toEqual(404);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .delete(`/api/favorites/${testPropertyId}`);

            expect(res.statusCode).toEqual(401);
        });
    });
});
