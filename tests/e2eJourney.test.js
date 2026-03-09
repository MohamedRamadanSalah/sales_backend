const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');
const crypto = require('crypto');

describe('End-to-End User Journeys', () => {
    let adminToken, sellerToken, buyerToken;
    let sellerId, buyerId;
    let propertyId, orderId, invoiceId;
    let testLocationId, testCategoryId;

    beforeAll(async () => {
        // --- 1. Clean Database ---
        await pool.query("DELETE FROM invoices WHERE order_id IN (SELECT id FROM orders WHERE property_id IN (SELECT id FROM properties WHERE title_en = 'E2E Journey Villa'))");
        await pool.query("DELETE FROM orders WHERE property_id IN (SELECT id FROM properties WHERE title_en = 'E2E Journey Villa')");
        await pool.query("DELETE FROM properties WHERE title_en = 'E2E Journey Villa'");
        await pool.query("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email IN ('e2eseller@realestate.com', 'e2ebuyer@realestate.com'))");
        await pool.query("DELETE FROM users WHERE email IN ('e2eseller@realestate.com', 'e2ebuyer@realestate.com')");

        // Ensure location & category
        let locRes = await pool.query("SELECT id FROM locations WHERE name_en = 'New Cairo' LIMIT 1");
        if (locRes.rows.length === 0) {
            locRes = await pool.query("INSERT INTO locations (name_ar, name_en, type) VALUES ('القاهرة الجديدة', 'New Cairo', 'city') RETURNING id");
        }
        testLocationId = locRes.rows[0].id;

        let catRes = await pool.query("SELECT id FROM categories WHERE slug = 'villa' LIMIT 1");
        if (catRes.rows.length === 0) {
            catRes = await pool.query("INSERT INTO categories (name_ar, name_en, slug) VALUES ('فيلا', 'Villa', 'villa') RETURNING id");
        }
        testCategoryId = catRes.rows[0].id;

        // Admin Auth
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);
        await pool.query("UPDATE users SET password_hash = $1 WHERE email = 'admin@realestate.com'", [hash]);
        const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@realestate.com', password: 'admin123' });
        adminToken = adminRes.body.data.token;
    }, 30000);

    afterAll(async () => {
        await pool.query("DELETE FROM invoices WHERE order_id IN (SELECT id FROM orders WHERE property_id IN (SELECT id FROM properties WHERE title_en = 'E2E Journey Villa'))");
        await pool.query("DELETE FROM orders WHERE property_id IN (SELECT id FROM properties WHERE title_en = 'E2E Journey Villa')");
        await pool.query("DELETE FROM favorites WHERE property_id IN (SELECT id FROM properties WHERE title_en = 'E2E Journey Villa')");
        await pool.query("DELETE FROM properties WHERE title_en = 'E2E Journey Villa'");
        await pool.query("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email IN ('e2eseller@realestate.com', 'e2ebuyer@realestate.com'))");
        await pool.query("DELETE FROM users WHERE email IN ('e2eseller@realestate.com', 'e2ebuyer@realestate.com')");
    });

    describe('1. Seller Journey', () => {
        it('should allow seller to signup', async () => {
            const res = await request(app).post('/api/auth/signup').send({
                first_name: 'Jane', last_name: 'Seller',
                email: 'e2eseller@realestate.com', phone_number: '+201111111181', password: 'securePassword123',
                preferred_language: 'en'
            });
            expect(res.statusCode).toEqual(201);
            sellerToken = res.body.data.token;
            sellerId = res.body.data.user.id;
        });

        it('should allow seller to create a property listing', async () => {
            const res = await request(app).post('/api/properties')
                .set('Authorization', `Bearer ${sellerToken}`).set('Accept-Language', 'en')
                .send({
                    category_id: testCategoryId, location_id: testLocationId,
                    title_ar: 'فيلا رحلة مستخدم', title_en: 'E2E Journey Villa',
                    description_ar: 'وصف فيلا رحلة المستخدم يجب ان يكون طويل جدا ومفصل',
                    description_en: 'E2E journey villa description that is long enough to pass validation',
                    listing_type: 'sale', property_origin: 'primary', finishing_type: 'fully_finished',
                    legal_status: 'registered', price: 12000000, area_sqm: 450, bedrooms: 5, bathrooms: 4
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.data.status).toBe('pending_approval');
            propertyId = res.body.data.id;
        });

        it('should show property in seller\'s own listings', async () => {
            const res = await request(app).get('/api/properties/my')
                .set('Authorization', `Bearer ${sellerToken}`);
            expect(res.statusCode).toEqual(200);
            const found = res.body.data.find(p => p.id === propertyId);
            expect(found).toBeDefined();
            expect(found.status).toBe('pending_approval');
        });
    });

    describe('2. Admin Journey (Approval)', () => {
        it('should allow admin to see pending property in all listings', async () => {
            const res = await request(app).get('/api/properties/admin/all?status=pending_approval')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            const found = res.body.data.find(p => p.id === propertyId);
            expect(found).toBeDefined();
        });

        it('should allow admin to approve property', async () => {
            const res = await request(app).patch(`/api/properties/${propertyId}/status`)
                .set('Authorization', `Bearer ${adminToken}`).set('Accept-Language', 'en')
                .send({ status: 'approved' });
            expect(res.statusCode).toEqual(200);
        });

        it('should have sent an approval notification to the seller', async () => {
            const res = await request(app).get('/api/notifications?unread_only=true')
                .set('Authorization', `Bearer ${sellerToken}`);

            expect(res.statusCode).toEqual(200);
            const approvalNotif = res.body.notifications.find(n => n.event_type === 'property_approved' || n.title_en === 'Property Approved');
            expect(approvalNotif).toBeDefined();
        });
    });

    describe('3. Buyer Journey', () => {
        it('should allow buyer to signup', async () => {
            const res = await request(app).post('/api/auth/signup').send({
                first_name: 'John', last_name: 'Buyer',
                email: 'e2ebuyer@realestate.com', phone_number: '+201111111182', password: 'buyerPassword123',
                preferred_language: 'ar'
            });
            expect(res.statusCode).toEqual(201);
            buyerToken = res.body.data.token;
            buyerId = res.body.data.user.id;
        });

        it('should show approved property in public search', async () => {
            const res = await request(app).get(`/api/properties?search=E2E Journey`)
                .set('Accept-Language', 'en');
            expect(res.statusCode).toEqual(200);
            const found = res.body.data.find(p => p.id === propertyId);
            expect(found).toBeDefined();
        });

        it('should allow buyer to add property to favorites', async () => {
            const res = await request(app).post('/api/favorites')
                .set('Authorization', `Bearer ${buyerToken}`)
                .send({ property_id: propertyId });
            expect(res.statusCode).toEqual(201);
        });

        it('should allow buyer to place an order', async () => {
            const res = await request(app).post('/api/orders')
                .set('Authorization', `Bearer ${buyerToken}`).set('Accept-Language', 'en')
                .send({ property_id: propertyId, notes: 'I am ready to pay in cash' });
            expect(res.statusCode).toEqual(201);
            expect(res.body.data.status).toBe('pending');
            orderId = res.body.data.id;
        });

        it('should show order in buyer\'s orders', async () => {
            const res = await request(app).get('/api/orders/my')
                .set('Authorization', `Bearer ${buyerToken}`);
            expect(res.statusCode).toEqual(200);
            const found = res.body.data.find(o => o.id === orderId);
            expect(found).toBeDefined();
        });
    });

    describe('4. Admin Journey (Order & Invoice)', () => {
        it('should see new order in admin dashboard list', async () => {
            const res = await request(app).get('/api/orders/all?status=pending')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            const found = res.body.data.find(o => o.id === orderId);
            expect(found).toBeDefined();
            expect(found.client_id).toBe(buyerId);
        });

        it('should allow admin to accept order', async () => {
            const res = await request(app).patch(`/api/orders/${orderId}/status`)
                .set('Authorization', `Bearer ${adminToken}`).set('Accept-Language', 'en')
                .send({ status: 'accepted' });
            expect(res.statusCode).toEqual(200);
        });

        it('should allow admin to create an invoice', async () => {
            const res = await request(app).post('/api/orders/invoices')
                .set('Authorization', `Bearer ${adminToken}`).set('Accept-Language', 'en')
                .send({
                    order_id: orderId,
                    amount: 12000000,
                    due_date: '2026-12-31',
                    payment_method: 'bank_transfer'
                });
            expect(res.statusCode).toEqual(201);
            invoiceId = res.body.data.id;
        });

        it('should allow admin to mark invoice as paid', async () => {
            const res = await request(app).patch(`/api/orders/invoices/${invoiceId}/status`)
                .set('Authorization', `Bearer ${adminToken}`).set('Accept-Language', 'en')
                .send({ status: 'paid' });
            expect(res.statusCode).toEqual(200);
        });

        it('should allow admin to complete the order', async () => {
            const res = await request(app).patch(`/api/orders/${orderId}/status`)
                .set('Authorization', `Bearer ${adminToken}`).set('Accept-Language', 'en')
                .send({ status: 'completed' });
            expect(res.statusCode).toEqual(200);
        });
    });

    describe('5. Analytics Verification', () => {
        it('should reflect completed sales in admin revenue analytics', async () => {
            const res = await request(app).get('/api/admin/analytics/revenue')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toHaveProperty('financial_summary');
            expect(res.body.data.financial_summary).toBeDefined();
            const revenue = res.body.data.financial_summary.total_collected;
            expect(revenue).toBeDefined();
            expect(Number(revenue)).toBeGreaterThanOrEqual(12000000);
        });
    });
});
