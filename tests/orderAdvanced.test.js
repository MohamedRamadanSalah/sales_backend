const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');

describe('Order Advanced Integration Tests', () => {
    let clientToken, adminToken, ownerToken;
    let testPropertyId, testPropertyId2, testLocationId, testCategoryId;
    let rejectedOrderId, completedOrderId;

    beforeAll(async () => {
        // Clean up
        await pool.query("DELETE FROM invoices WHERE order_id IN (SELECT id FROM orders WHERE property_id IN (SELECT id FROM properties WHERE title_ar LIKE '%اختبار طلبات متقدم%'))");
        await pool.query("DELETE FROM orders WHERE property_id IN (SELECT id FROM properties WHERE title_ar LIKE '%اختبار طلبات متقدم%')");
        await pool.query("DELETE FROM properties WHERE title_ar LIKE '%اختبار طلبات متقدم%'");
        await pool.query("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email IN ('ordadv@realestate.com', 'ordadv2@realestate.com'))");
        await pool.query("DELETE FROM users WHERE email IN ('ordadv@realestate.com', 'ordadv2@realestate.com')");

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

        // Admin
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);
        await pool.query("UPDATE users SET password_hash = $1 WHERE email = 'admin@realestate.com'", [hash]);
        const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@realestate.com', password: 'admin123' });
        adminToken = adminRes.body.data.token;

        // Property owner (seller)
        const ownerRes = await request(app).post('/api/auth/signup').send({
            first_name: 'OrderAdv', last_name: 'Owner',
            email: 'ordadv2@realestate.com', phone_number: '+201777777781', password: 'testPass123',
        });
        ownerToken = ownerRes.body.data.token;

        // Client (buyer)
        const clientRes = await request(app).post('/api/auth/signup').send({
            first_name: 'OrderAdv', last_name: 'Client',
            email: 'ordadv@realestate.com', phone_number: '+201777777782', password: 'testPass123',
        });
        clientToken = clientRes.body.data.token;

        // Create property by owner
        const propRes = await request(app).post('/api/properties')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                category_id: testCategoryId, location_id: testLocationId,
                title_ar: 'فيلا اختبار طلبات متقدم', title_en: 'Advanced Order Test Villa',
                description_ar: 'وصف تجريبي لاختبار الطلبات المتقدمة يجب ان يكون طويل',
                listing_type: 'sale', property_origin: 'primary', finishing_type: 'fully_finished',
                legal_status: 'registered', price: 8000000, area_sqm: 300,
            });
        testPropertyId = propRes.body.data.id;
        await request(app).patch(`/api/properties/${testPropertyId}/status`)
            .set('Authorization', `Bearer ${adminToken}`).send({ status: 'approved' });

        // Second property (pending, not approved)
        const prop2Res = await request(app).post('/api/properties')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                category_id: testCategoryId, location_id: testLocationId,
                title_ar: 'فيلا اختبار طلبات متقدم معلقة', title_en: 'Pending Order Test',
                description_ar: 'وصف للعقار المعلق للاختبار يجب ان يكون طويل كفاية',
                listing_type: 'rent', property_origin: 'resale', finishing_type: 'semi_finished',
                legal_status: 'registered', price: 5000, area_sqm: 100,
            });
        testPropertyId2 = prop2Res.body.data.id;
        // NOT approved — stays pending
    }, 30000);

    afterAll(async () => {
        await pool.query("DELETE FROM invoices WHERE order_id IN (SELECT id FROM orders WHERE property_id IN (SELECT id FROM properties WHERE title_ar LIKE '%اختبار طلبات متقدم%'))");
        await pool.query("DELETE FROM orders WHERE property_id IN (SELECT id FROM properties WHERE title_ar LIKE '%اختبار طلبات متقدم%')");
        await pool.query("DELETE FROM properties WHERE title_ar LIKE '%اختبار طلبات متقدم%'");
        await pool.query("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email IN ('ordadv@realestate.com', 'ordadv2@realestate.com'))");
        await pool.query("DELETE FROM users WHERE email IN ('ordadv@realestate.com', 'ordadv2@realestate.com')");
    });

    describe('Order Creation Edge Cases', () => {
        it('should NOT allow ordering a non-approved (pending) property', async () => {
            const res = await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ property_id: testPropertyId2 });

            expect(res.statusCode).toEqual(400);
        });

        it('should NOT allow ordering own property', async () => {
            const res = await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ property_id: testPropertyId });

            expect(res.statusCode).toEqual(400);
        });

        it('should NOT allow ordering non-existent property', async () => {
            const res = await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ property_id: 999999 });

            expect(res.statusCode).toEqual(404);
        });

        it('should require authentication to order', async () => {
            const res = await request(app).post('/api/orders')
                .send({ property_id: testPropertyId });

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('Order Status Workflow', () => {
        beforeAll(async () => {
            // Create order for rejection test
            const r = await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ property_id: testPropertyId });
            rejectedOrderId = r.body.data.id;
        });

        it('should allow admin to reject an order', async () => {
            const res = await request(app).patch(`/api/orders/${rejectedOrderId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .set('Accept-Language', 'en')
                .send({ status: 'rejected' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Order rejected');
        });

        it('should allow admin to complete an order', async () => {
            // Remove old order so client can re-order
            await pool.query("DELETE FROM orders WHERE id = $1", [rejectedOrderId]);

            const orderRes = await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ property_id: testPropertyId });
            completedOrderId = orderRes.body.data.id;

            // Accept first
            await request(app).patch(`/api/orders/${completedOrderId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'accepted' });

            // Then complete
            const res = await request(app).patch(`/api/orders/${completedOrderId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .set('Accept-Language', 'en')
                .send({ status: 'completed' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Order completed');
        });

        it('should return 404 for non-existent order', async () => {
            const res = await request(app).patch('/api/orders/999999/status')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'accepted' });

            expect(res.statusCode).toEqual(404);
        });
    });

    describe('Order Pagination & Filtering', () => {
        it('should paginate client orders', async () => {
            const res = await request(app).get('/api/orders/my?page=1&limit=5')
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('count');
            expect(res.body.data.length).toBeLessThanOrEqual(5);
        });

        it('should filter admin orders by status', async () => {
            const res = await request(app).get('/api/orders/all?status=completed')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
            if (res.body.data.length > 0) {
                res.body.data.forEach(o => {
                    expect(o.status).toBe('completed');
                });
            }
        });

        it('should block client from viewing all orders', async () => {
            const res = await request(app).get('/api/orders/all')
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.statusCode).toEqual(403);
        });
    });

    describe('Invoice Edge Cases', () => {
        let testInvoiceId;

        beforeAll(async () => {
            if (completedOrderId) {
                const invRes = await request(app).post('/api/orders/invoices')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        order_id: completedOrderId,
                        amount: 500000,
                        due_date: '2026-05-01',
                        payment_method: 'cash',
                    });
                testInvoiceId = invRes.body.data?.id;
            }
        });

        it('should mark invoice as overdue', async () => {
            if (!testInvoiceId) return;
            const res = await request(app).patch(`/api/orders/invoices/${testInvoiceId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .set('Accept-Language', 'en')
                .send({ status: 'overdue' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Invoice marked as overdue');
        });

        it('should cancel an invoice', async () => {
            if (!testInvoiceId) return;
            const res = await request(app).patch(`/api/orders/invoices/${testInvoiceId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .set('Accept-Language', 'en')
                .send({ status: 'cancelled' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Invoice cancelled');
        });

        it('should return 404 for non-existent invoice', async () => {
            const res = await request(app).patch('/api/orders/invoices/999999/status')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'paid' });

            expect(res.statusCode).toEqual(404);
        });

        it('should filter invoices by status', async () => {
            const res = await request(app).get('/api/orders/invoices?status=cancelled')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
        });
    });
});
