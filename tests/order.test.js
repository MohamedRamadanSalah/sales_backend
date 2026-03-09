const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');

describe('Orders & Invoices API', () => {
    let clientToken, adminToken;
    let testPropertyId, testOrderId, testInvoiceId;

    beforeAll(async () => {
        // --- Clean up stale data from previous runs (e.g. --forceExit) ---
        await pool.query("DELETE FROM invoices WHERE order_id IN (SELECT id FROM orders WHERE property_id IN (SELECT id FROM properties WHERE title_ar = 'فيلا اختبار الطلبات'))");
        await pool.query("DELETE FROM orders WHERE property_id IN (SELECT id FROM properties WHERE title_ar = 'فيلا اختبار الطلبات')");
        await pool.query("DELETE FROM properties WHERE title_ar = 'فيلا اختبار الطلبات'");
        await pool.query("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email = 'ordertest@realestate.com')");
        await pool.query("DELETE FROM users WHERE email = 'ordertest@realestate.com'");

        // --- 1. Seed or Get Location & Category ---
        let locRes = await pool.query("SELECT id FROM locations WHERE name_en = 'New Cairo' LIMIT 1");
        if (locRes.rows.length === 0) {
            locRes = await pool.query("INSERT INTO locations (name_ar, name_en, type) VALUES ('القاهرة الجديدة', 'New Cairo', 'city') RETURNING id");
        }
        const testLocationId = locRes.rows[0].id;

        let catRes = await pool.query("SELECT id FROM categories WHERE slug = 'villa' LIMIT 1");
        if (catRes.rows.length === 0) {
            catRes = await pool.query("INSERT INTO categories (name_ar, name_en, slug) VALUES ('فيلا', 'Villa', 'villa') RETURNING id");
        }
        const testCategoryId = catRes.rows[0].id;

        // --- 2. Seed Admin User ---
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);
        await pool.query(
            "UPDATE users SET password_hash = $1 WHERE email = 'admin@realestate.com'",
            [hash]
        );
        const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@realestate.com', password: 'admin123' });
        adminToken = adminRes.body.data.token;

        // --- 3. Seed Client User ---
        const clientRes = await request(app)
            .post('/api/auth/signup')
            .send({
                first_name: 'OrderTest',
                last_name: 'User',
                email: 'ordertest@realestate.com',
                phone_number: '+201333333333',
                password: 'testPass123',
            });
        clientToken = clientRes.body.data.token;

        // --- 4. Create an Approved Property to order ---
        const propRes = await request(app)
            .post('/api/properties')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                category_id: testCategoryId,
                location_id: testLocationId,
                title_ar: 'فيلا اختبار الطلبات', description_ar: 'وصف تجريبي للفيلا لاختبار الطلبات والفواتير',
                listing_type: 'sale', property_origin: 'primary', finishing_type: 'fully_finished',
                legal_status: 'registered', price: 10000000, area_sqm: 350,
            });
        testPropertyId = propRes.body.data.id;

        await request(app).patch(`/api/properties/${testPropertyId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'approved' });
    }, 30000);

    afterAll(async () => {
        if (testInvoiceId) await pool.query('DELETE FROM invoices WHERE id = $1', [testInvoiceId]);
        if (testOrderId) await pool.query('DELETE FROM orders WHERE id = $1', [testOrderId]);
        if (testPropertyId) await pool.query('DELETE FROM properties WHERE id = $1', [testPropertyId]);
        await pool.query("DELETE FROM users WHERE email = 'ordertest@realestate.com'");
    });

    describe('POST /api/orders (Client Purchase Request)', () => {
        it('should create a purchase order for an approved property', async () => {
            const res = await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${clientToken}`)
                .set('Accept-Language', 'ar')
                .send({ property_id: testPropertyId });

            expect(res.statusCode).toEqual(201);
            expect(res.body.message).toBe('تم إرسال طلب الشراء بنجاح');
            expect(res.body.data.status).toBe('pending');
            testOrderId = res.body.data.id;
        });

        it('should block duplicate orders for same property', async () => {
            const res = await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ property_id: testPropertyId });

            expect(res.statusCode).toEqual(409);
        });
    });

    describe('GET /api/orders/my (Client Orders)', () => {
        it('should return current client orders', async () => {
            const res = await request(app).get('/api/orders/my')
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.count).toBeGreaterThan(0);
        });
    });

    describe('Admin Order Management', () => {
        it('should let admin view all orders', async () => {
            const res = await request(app).get('/api/orders/all')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.count).toBeGreaterThan(0);
        });

        it('should let admin accept an order', async () => {
            const res = await request(app).patch(`/api/orders/${testOrderId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .set('Accept-Language', 'en')
                .send({ status: 'accepted' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Order accepted');
        });
    });

    describe('Admin Invoice Management', () => {
        it('should create an invoice for the accepted order', async () => {
            const res = await request(app).post('/api/orders/invoices')
                .set('Authorization', `Bearer ${adminToken}`)
                .set('Accept-Language', 'ar')
                .send({
                    order_id: testOrderId,
                    amount: 1000000,
                    due_date: '2026-04-01',
                    payment_method: 'bank_transfer'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.message).toBe('تم إنشاء الفاتورة بنجاح');
            testInvoiceId = res.body.data.id;
        });

        it('should list all invoices', async () => {
            const res = await request(app).get('/api/orders/invoices')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.count).toBeGreaterThan(0);
        });

        it('should mark an invoice as paid', async () => {
            const res = await request(app).patch(`/api/orders/invoices/${testInvoiceId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .set('Accept-Language', 'en')
                .send({ status: 'paid' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Payment confirmed');
        });
    });
});
