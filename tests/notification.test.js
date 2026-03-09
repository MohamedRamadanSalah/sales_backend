const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');

describe('Notification API Integration Tests', () => {
    let clientToken, clientUserId;
    let secondClientToken, secondClientUserId;
    let testNotificationId;

    beforeAll(async () => {
        // Clean up stale data
        await pool.query("DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email IN ('notiftest@realestate.com', 'notiftest2@realestate.com'))");
        await pool.query("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email IN ('notiftest@realestate.com', 'notiftest2@realestate.com'))");
        await pool.query("DELETE FROM users WHERE email IN ('notiftest@realestate.com', 'notiftest2@realestate.com')");

        // Create first client
        const clientRes = await request(app)
            .post('/api/auth/signup')
            .send({
                first_name: 'NotifTest',
                last_name: 'User',
                email: 'notiftest@realestate.com',
                phone_number: '+201888888881',
                password: 'testPass123',
            });
        clientToken = clientRes.body.data.token;
        clientUserId = clientRes.body.data.user.id;

        // Create second client
        const client2Res = await request(app)
            .post('/api/auth/signup')
            .send({
                first_name: 'NotifTest2',
                last_name: 'User2',
                email: 'notiftest2@realestate.com',
                phone_number: '+201888888882',
                password: 'testPass123',
            });
        secondClientToken = client2Res.body.data.token;
        secondClientUserId = client2Res.body.data.user.id;

        // Insert test notifications using correct schema (event_type, not type)
        const n1 = await pool.query(
            `INSERT INTO notifications (user_id, event_type, title_ar, title_en, message_ar, message_en, is_read)
             VALUES ($1, 'info', 'إشعار تجريبي 1', 'Test Notification 1', 'رسالة اختبار 1', 'Test message 1', FALSE)
             RETURNING id`,
            [clientUserId]
        );
        testNotificationId = n1.rows[0].id;

        await pool.query(
            `INSERT INTO notifications (user_id, event_type, title_ar, title_en, message_ar, message_en, is_read)
             VALUES ($1, 'info', 'إشعار تجريبي 2', 'Test Notification 2', 'رسالة اختبار 2', 'Test message 2', FALSE)`,
            [clientUserId]
        );

        await pool.query(
            `INSERT INTO notifications (user_id, event_type, title_ar, title_en, message_ar, message_en, is_read)
             VALUES ($1, 'info', 'إشعار مقروء', 'Read Notification', 'رسالة مقروءة', 'Read message', TRUE)`,
            [clientUserId]
        );

        // Insert notification for second user
        await pool.query(
            `INSERT INTO notifications (user_id, event_type, title_ar, title_en, message_ar, message_en, is_read)
             VALUES ($1, 'info', 'إشعار مستخدم 2', 'User2 Notification', 'رسالة مستخدم 2', 'User2 message', FALSE)`,
            [secondClientUserId]
        );
    });

    afterAll(async () => {
        await pool.query("DELETE FROM notifications WHERE user_id IN ($1, $2)", [clientUserId, secondClientUserId]);
        await pool.query("DELETE FROM refresh_tokens WHERE user_id IN ($1, $2)", [clientUserId, secondClientUserId]);
        await pool.query("DELETE FROM users WHERE email IN ('notiftest@realestate.com', 'notiftest2@realestate.com')");
    });

    describe('GET /api/notifications', () => {
        it('should return user notifications with pagination', async () => {
            const res = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.notifications).toBeInstanceOf(Array);
            expect(res.body.notifications.length).toBe(3); // 2 unread + 1 read
            expect(res.body).toHaveProperty('pagination');
            expect(res.body).toHaveProperty('unread_count');
        });

        it('should filter unread-only notifications', async () => {
            const res = await request(app)
                .get('/api/notifications?unread_only=true')
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.notifications.length).toBe(2);
            res.body.notifications.forEach(n => {
                expect(n.is_read).toBe(false);
            });
        });

        it('should not return another user\'s notifications', async () => {
            const res = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${clientToken}`);

            const otherUserNotifs = res.body.notifications.filter(n => n.user_id === secondClientUserId);
            expect(otherUserNotifs.length).toBe(0);
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/notifications');
            expect(res.statusCode).toEqual(401);
        });

        it('should paginate results', async () => {
            const res = await request(app)
                .get('/api/notifications?page=1&limit=1')
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.notifications.length).toBe(1);
            expect(res.body.pagination.page).toBe(1);
            expect(res.body.pagination.total).toBe(3);
        });
    });

    describe('GET /api/notifications/count', () => {
        it('should return unread notification count', async () => {
            const res = await request(app)
                .get('/api/notifications/count')
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.unread_count).toBe(2);
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/notifications/count');
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('PATCH /api/notifications/:id/read', () => {
        it('should mark a notification as read', async () => {
            const res = await request(app)
                .patch(`/api/notifications/${testNotificationId}/read`)
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Notification marked as read');

            // Verify unread count decreased
            const countRes = await request(app)
                .get('/api/notifications/count')
                .set('Authorization', `Bearer ${clientToken}`);
            expect(countRes.body.unread_count).toBe(1);
        });

        it('should return 404 for non-existent notification', async () => {
            const res = await request(app)
                .patch('/api/notifications/999999/read')
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.statusCode).toEqual(404);
        });

        it('should prevent marking another user\'s notification', async () => {
            // Get second user's notification
            const notifs = await pool.query(
                'SELECT id FROM notifications WHERE user_id = $1 LIMIT 1',
                [secondClientUserId]
            );

            const res = await request(app)
                .patch(`/api/notifications/${notifs.rows[0].id}/read`)
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.statusCode).toEqual(404);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .patch(`/api/notifications/${testNotificationId}/read`);
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('PATCH /api/notifications/read-all', () => {
        it('should mark all notifications as read', async () => {
            const res = await request(app)
                .patch('/api/notifications/read-all')
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('All notifications marked as read');

            // Verify unread count is now 0
            const countRes = await request(app)
                .get('/api/notifications/count')
                .set('Authorization', `Bearer ${clientToken}`);
            expect(countRes.body.unread_count).toBe(0);
        });

        it('should not affect other user\'s notifications', async () => {
            // Second user should still have unread notifications
            const countRes = await request(app)
                .get('/api/notifications/count')
                .set('Authorization', `Bearer ${secondClientToken}`);
            expect(countRes.body.unread_count).toBe(1);
        });

        it('should require authentication', async () => {
            const res = await request(app).patch('/api/notifications/read-all');
            expect(res.statusCode).toEqual(401);
        });
    });
});
