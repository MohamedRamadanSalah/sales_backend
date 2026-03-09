const request = require('supertest');
const app = require('../src/app');

describe('Health Endpoint', () => {
    it('should return ok status with DB connectivity in English', async () => {
        const res = await request(app)
            .get('/api/health')
            .set('Accept-Language', 'en');

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.language_used).toBe('en');
        expect(res.body.database).toBe('connected');
        expect(res.body).toHaveProperty('server_time');
        expect(res.body).toHaveProperty('uptime');
    });

    it('should return ok status in Arabic (default)', async () => {
        const res = await request(app)
            .get('/api/health');

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.language_used).toBe('ar');
        expect(res.body.database).toBe('connected');
    });
});
