const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');

describe('Property Advanced Integration Tests', () => {
    let ownerToken, ownerUserId;
    let otherUserToken;
    let adminToken;
    let testPropertyId, testLocationId, testCategoryId;

    beforeAll(async () => {
        // Clean up stale data
        await pool.query("DELETE FROM favorites WHERE property_id IN (SELECT id FROM properties WHERE title_ar LIKE '%اختبار متقدم%')");
        await pool.query("DELETE FROM property_images WHERE property_id IN (SELECT id FROM properties WHERE title_ar LIKE '%اختبار متقدم%')");
        await pool.query("DELETE FROM orders WHERE property_id IN (SELECT id FROM properties WHERE title_ar LIKE '%اختبار متقدم%')");
        await pool.query("DELETE FROM properties WHERE title_ar LIKE '%اختبار متقدم%'");
        await pool.query("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email IN ('propadvtest@realestate.com', 'propadvtest2@realestate.com'))");
        await pool.query("DELETE FROM users WHERE email IN ('propadvtest@realestate.com', 'propadvtest2@realestate.com')");

        // Ensure location and category
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

        // Admin login
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);
        await pool.query("UPDATE users SET password_hash = $1 WHERE email = 'admin@realestate.com'", [hash]);
        const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@realestate.com', password: 'admin123' });
        adminToken = adminRes.body.data.token;

        // Owner user
        const ownerRes = await request(app).post('/api/auth/signup').send({
            first_name: 'PropAdv', last_name: 'Owner',
            email: 'propadvtest@realestate.com', phone_number: '+201999999901', password: 'testPass123',
        });
        ownerToken = ownerRes.body.data.token;
        ownerUserId = ownerRes.body.data.user.id;

        // Other user
        const otherRes = await request(app).post('/api/auth/signup').send({
            first_name: 'PropAdv', last_name: 'Other',
            email: 'propadvtest2@realestate.com', phone_number: '+201999999902', password: 'testPass123',
        });
        otherUserToken = otherRes.body.data.token;

        // Create a test property
        const propRes = await request(app).post('/api/properties')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                category_id: testCategoryId, location_id: testLocationId,
                title_ar: 'شقة اختبار متقدم', title_en: 'Advanced Test Apartment',
                description_ar: 'وصف تجريبي للاختبار المتقدم يجب ان يكون طويل بما فيه الكفاية',
                description_en: 'A test description for advanced property testing that needs to be long enough',
                listing_type: 'sale', property_origin: 'primary', finishing_type: 'fully_finished',
                legal_status: 'registered', price: 3500000, area_sqm: 180,
                bedrooms: 3, bathrooms: 2, floor_level: 4,
            });
        testPropertyId = propRes.body.data.id;

        // Approve it
        await request(app).patch(`/api/properties/${testPropertyId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'approved' });
    }, 30000);

    afterAll(async () => {
        await pool.query("DELETE FROM favorites WHERE property_id IN (SELECT id FROM properties WHERE title_ar LIKE '%اختبار متقدم%')");
        await pool.query("DELETE FROM property_images WHERE property_id IN (SELECT id FROM properties WHERE title_ar LIKE '%اختبار متقدم%')");
        await pool.query("DELETE FROM orders WHERE property_id IN (SELECT id FROM properties WHERE title_ar LIKE '%اختبار متقدم%')");
        await pool.query("DELETE FROM properties WHERE title_ar LIKE '%اختبار متقدم%'");
        await pool.query("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email IN ('propadvtest@realestate.com', 'propadvtest2@realestate.com'))");
        await pool.query("DELETE FROM users WHERE email IN ('propadvtest@realestate.com', 'propadvtest2@realestate.com')");
    });

    describe('PUT /api/properties/:id (Update)', () => {
        it('should update own property', async () => {
            const res = await request(app)
                .put(`/api/properties/${testPropertyId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .set('Accept-Language', 'en')
                .send({ title_en: 'Updated Advanced Test Apartment', price: 4000000 });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
        });

        it('should block other user from updating property', async () => {
            const res = await request(app)
                .put(`/api/properties/${testPropertyId}`)
                .set('Authorization', `Bearer ${otherUserToken}`)
                .send({ title_en: 'Hacked Title' });

            expect(res.statusCode).toEqual(403);
        });

        it('should allow admin to update any property', async () => {
            const res = await request(app)
                .put(`/api/properties/${testPropertyId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ price: 4500000 });

            expect(res.statusCode).toEqual(200);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .put(`/api/properties/${testPropertyId}`)
                .send({ title_en: 'No Auth' });

            expect(res.statusCode).toEqual(401);
        });

        it('should return 404 for non-existent property', async () => {
            const res = await request(app)
                .put('/api/properties/999999')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ title_en: 'Ghost Property' });

            expect(res.statusCode).toEqual(404);
        });
    });

    describe('GET /api/properties/my (Owner listings)', () => {
        it('should return owner properties including all statuses', async () => {
            const res = await request(app)
                .get('/api/properties/my')
                .set('Authorization', `Bearer ${ownerToken}`)
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it('should not return other user\'s properties', async () => {
            const res = await request(app)
                .get('/api/properties/my')
                .set('Authorization', `Bearer ${otherUserToken}`);

            expect(res.statusCode).toEqual(200);
            const ownerProps = res.body.data.filter(p => p.user_id === ownerUserId);
            expect(ownerProps.length).toBe(0);
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/properties/my');
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('GET /api/properties/admin/all (Admin view)', () => {
        it('should return all properties for admin', async () => {
            const res = await request(app)
                .get('/api/properties/admin/all')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it('should block non-admin access', async () => {
            const res = await request(app)
                .get('/api/properties/admin/all')
                .set('Authorization', `Bearer ${ownerToken}`);

            expect(res.statusCode).toEqual(403);
        });
    });

    describe('GET /api/properties (Search & Filter)', () => {
        it('should filter properties by listing_type', async () => {
            const res = await request(app)
                .get('/api/properties?listing_type=sale')
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
            if (res.body.data.length > 0) {
                res.body.data.forEach(p => {
                    expect(p.listing_type).toBe('sale');
                });
            }
        });

        it('should filter properties by category_id', async () => {
            const res = await request(app)
                .get(`/api/properties?category_id=${testCategoryId}`)
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
        });

        it('should support search parameter', async () => {
            const res = await request(app)
                .get('/api/properties?search=Advanced')
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
        });

        it('should support pagination', async () => {
            const res = await request(app)
                .get('/api/properties?page=1&limit=2')
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.length).toBeLessThanOrEqual(2);
            expect(res.body).toHaveProperty('count');
        });

        it('should support sort parameters', async () => {
            const res = await request(app)
                .get('/api/properties?sort_by=price&sort_order=asc')
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
        });

        it('should filter by price range', async () => {
            const res = await request(app)
                .get('/api/properties?min_price=1000000&max_price=5000000')
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
        });
    });

    describe('GET /api/properties/categories', () => {
        it('should return property categories', async () => {
            const res = await request(app)
                .get('/api/properties/categories')
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/properties/amenities', () => {
        it('should return amenities list', async () => {
            const res = await request(app)
                .get('/api/properties/amenities')
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toBeInstanceOf(Array);
        });
    });

    describe('PATCH /api/properties/:id/deactivate', () => {
        let deactivatePropertyId;

        beforeAll(async () => {
            const propRes = await request(app).post('/api/properties')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                    category_id: testCategoryId, location_id: testLocationId,
                    title_ar: 'شقة اختبار متقدم تعطيل', title_en: 'Deactivate Test',
                    description_ar: 'وصف تجريبي للتعطيل يجب ان يكون طويل كفاية',
                    listing_type: 'sale', property_origin: 'primary', finishing_type: 'fully_finished',
                    legal_status: 'registered', price: 2000000, area_sqm: 120,
                });
            deactivatePropertyId = propRes.body.data.id;

            await request(app).patch(`/api/properties/${deactivatePropertyId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'approved' });
        });

        it('should deactivate own property', async () => {
            const res = await request(app)
                .patch(`/api/properties/${deactivatePropertyId}/deactivate`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
        });

        it('should block other user from deactivating', async () => {
            const res = await request(app)
                .patch(`/api/properties/${testPropertyId}/deactivate`)
                .set('Authorization', `Bearer ${otherUserToken}`);

            expect(res.statusCode).toEqual(403);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .patch(`/api/properties/${testPropertyId}/deactivate`);
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('DELETE /api/properties/:id (Soft Delete)', () => {
        let deletePropertyId;

        beforeAll(async () => {
            const propRes = await request(app).post('/api/properties')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                    category_id: testCategoryId, location_id: testLocationId,
                    title_ar: 'شقة اختبار متقدم حذف', title_en: 'Delete Test',
                    description_ar: 'وصف تجريبي للحذف يجب ان يكون طويل كفاية',
                    listing_type: 'sale', property_origin: 'primary', finishing_type: 'fully_finished',
                    legal_status: 'registered', price: 2500000, area_sqm: 130,
                });
            deletePropertyId = propRes.body.data.id;
        });

        it('should block other user from deleting property', async () => {
            const res = await request(app)
                .delete(`/api/properties/${deletePropertyId}`)
                .set('Authorization', `Bearer ${otherUserToken}`);

            expect(res.statusCode).toEqual(403);
        });

        it('should delete own property', async () => {
            const res = await request(app)
                .delete(`/api/properties/${deletePropertyId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
        });

        it('should return 404 for deleted property', async () => {
            const res = await request(app)
                .get(`/api/properties/${deletePropertyId}`)
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(404);
        });

        it('should require authentication', async () => {
            const res = await request(app).delete(`/api/properties/${testPropertyId}`);
            expect(res.statusCode).toEqual(401);
        });
    });
});
