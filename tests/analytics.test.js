const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');

describe('Analytics API Integration Tests', () => {
    let adminToken, clientToken;

    beforeAll(async () => {
        // --- Login as admin ---
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);
        await pool.query("UPDATE users SET password_hash = $1 WHERE email = 'admin@realestate.com'", [hash]);

        const adminRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@realestate.com', password: 'admin123' });
        adminToken = adminRes.body.data.token;

        // --- Create a client for RBAC testing ---
        const clientRes = await request(app)
            .post('/api/auth/signup')
            .send({
                first_name: 'AnalyticsTest',
                last_name: 'Client',
                email: 'analyticstest@realestate.com',
                phone_number: '+201666666666',
                password: 'testPass123',
            });
        clientToken = clientRes.body.data.token;
    });

    afterAll(async () => {
        await pool.query("DELETE FROM users WHERE email = 'analyticstest@realestate.com'");
    });

    describe('GET /api/admin/analytics/overview', () => {
        it('should return system overview for admin', async () => {
            const res = await request(app)
                .get('/api/admin/analytics/overview')
                .set('Authorization', `Bearer ${adminToken}`)
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('total_users');
            expect(res.body.data).toHaveProperty('total_properties');
            expect(res.body.data).toHaveProperty('total_orders');
            expect(res.body.data).toHaveProperty('total_invoices');
            expect(res.body.data).toHaveProperty('total_revenue');
            expect(res.body.data).toHaveProperty('active_listings');
            expect(res.body.data).toHaveProperty('pending_approval');
            expect(res.body.data).toHaveProperty('pending_orders');
            expect(res.body.data).toHaveProperty('overdue_invoices');
        });

        it('should block non-admin access', async () => {
            const res = await request(app)
                .get('/api/admin/analytics/overview')
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.statusCode).toEqual(403);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/admin/analytics/overview');

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('GET /api/admin/analytics/revenue', () => {
        it('should return revenue analytics for admin', async () => {
            const res = await request(app)
                .get('/api/admin/analytics/revenue')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('monthly_revenue');
            expect(res.body.data).toHaveProperty('financial_summary');
            expect(res.body.data).toHaveProperty('property_pricing');
        });

        it('should block client access', async () => {
            const res = await request(app)
                .get('/api/admin/analytics/revenue')
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.statusCode).toEqual(403);
        });
    });

    describe('GET /api/admin/analytics/properties', () => {
        it('should return property analytics for admin', async () => {
            const res = await request(app)
                .get('/api/admin/analytics/properties')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('by_status');
            expect(res.body.data).toHaveProperty('by_category');
            expect(res.body.data).toHaveProperty('by_location');
            expect(res.body.data).toHaveProperty('by_listing_type');
            expect(res.body.data).toHaveProperty('by_origin');
            expect(res.body.data).toHaveProperty('by_finishing');
        });
    });

    describe('GET /api/admin/analytics/users', () => {
        it('should return user analytics for admin', async () => {
            const res = await request(app)
                .get('/api/admin/analytics/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('user_growth');
            expect(res.body.data).toHaveProperty('by_role');
            expect(res.body.data).toHaveProperty('top_listers');
            expect(res.body.data).toHaveProperty('top_buyers');
        });
    });

    describe('GET /api/admin/analytics/orders', () => {
        it('should return order analytics for admin', async () => {
            const res = await request(app)
                .get('/api/admin/analytics/orders')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('by_status');
            expect(res.body.data).toHaveProperty('recent_orders');
            expect(res.body.data).toHaveProperty('conversion');
        });
    });

    describe('GET /api/admin/analytics/locations', () => {
        it('should return location analytics for admin', async () => {
            const res = await request(app)
                .get('/api/admin/analytics/locations')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('location_stats');
            expect(res.body.data).toHaveProperty('popular_areas');
        });
    });

    describe('GET /api/admin/analytics/recent-activity', () => {
        it('should return recent audit log activity for admin', async () => {
            const res = await request(app)
                .get('/api/admin/analytics/recent-activity')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('count');
            expect(res.body.data).toBeInstanceOf(Array);
        });

        it('should respect limit parameter', async () => {
            const res = await request(app)
                .get('/api/admin/analytics/recent-activity?limit=5')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.length).toBeLessThanOrEqual(5);
        });
    });

    describe('i18n Support', () => {
        it('should return Arabic overview message', async () => {
            const res = await request(app)
                .get('/api/admin/analytics/overview')
                .set('Authorization', `Bearer ${adminToken}`)
                .set('Accept-Language', 'ar');

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('نظرة عامة على النظام');
        });

        it('should return English overview message', async () => {
            const res = await request(app)
                .get('/api/admin/analytics/overview')
                .set('Authorization', `Bearer ${adminToken}`)
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('System Overview');
        });
    });
});
