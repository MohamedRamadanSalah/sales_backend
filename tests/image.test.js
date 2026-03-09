const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');
const path = require('path');
const fs = require('fs');

describe('Image Upload API Integration Tests', () => {
    let adminToken, testPropertyId, testLocationId, testCategoryId, uploadedImageId;

    beforeAll(async () => {
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

        // --- Login as admin ---
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);
        await pool.query("UPDATE users SET password_hash = $1 WHERE email = 'admin@realestate.com'", [hash]);

        const adminRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@realestate.com', password: 'admin123' });
        adminToken = adminRes.body.data.token;

        // --- Create a test property ---
        const propRes = await request(app)
            .post('/api/properties')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                category_id: testCategoryId,
                location_id: testLocationId,
                title_ar: 'عقار اختبار الصور',
                description_ar: 'وصف تجريبي لاختبار رفع الصور يجب ان يكون طويل كفاية',
                listing_type: 'sale',
                property_origin: 'primary',
                finishing_type: 'fully_finished',
                legal_status: 'registered',
                price: 4000000,
                area_sqm: 200,
            });
        testPropertyId = propRes.body.data.id;

        // Ensure uploads directory exists
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
    });

    afterAll(async () => {
        // Clean up uploaded images from DB and filesystem
        if (testPropertyId) {
            const images = await pool.query('SELECT image_url FROM property_images WHERE property_id = $1', [testPropertyId]);
            for (const img of images.rows) {
                const filePath = path.join(__dirname, '..', img.image_url);
                try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
            }
            await pool.query('DELETE FROM property_images WHERE property_id = $1', [testPropertyId]);
            await pool.query('DELETE FROM properties WHERE id = $1', [testPropertyId]);
        }
    });

    describe('POST /api/properties/:id/images', () => {
        it('should upload an image for a property', async () => {
            // Create a minimal valid JPEG buffer (smallest valid JPEG)
            const testImagePath = path.join(__dirname, 'test-image.jpg');
            // Create a small test image file (1x1 pixel JPEG)
            const jpegBuffer = Buffer.from([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
                0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
                0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
                0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
                0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
                0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
                0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
                0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
                0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
                0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
                0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
                0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
                0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
                0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
                0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
                0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
                0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
                0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
                0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
                0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
                0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
                0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
                0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
                0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
                0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
                0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
                0x00, 0x00, 0x3F, 0x00, 0x7B, 0x94, 0x11, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xD9
            ]);
            fs.writeFileSync(testImagePath, jpegBuffer);

            const res = await request(app)
                .post(`/api/properties/${testPropertyId}/images`)
                .set('Authorization', `Bearer ${adminToken}`)
                .set('Accept-Language', 'en')
                .attach('images', testImagePath);

            // Clean up temp test image
            try { fs.unlinkSync(testImagePath); } catch (e) { /* ignore */ }

            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0]).toHaveProperty('image_url');
            expect(res.body.data[0].is_primary).toBe(true);
            uploadedImageId = res.body.data[0].id;
        });

        it('should reject upload without images', async () => {
            const res = await request(app)
                .post(`/api/properties/${testPropertyId}/images`)
                .set('Authorization', `Bearer ${adminToken}`)
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(400);
        });

        it('should reject upload for non-existent property', async () => {
            const testImagePath = path.join(__dirname, 'test-image2.jpg');
            const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9]);
            fs.writeFileSync(testImagePath, jpegBuffer);

            const res = await request(app)
                .post('/api/properties/999999/images')
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('images', testImagePath);

            try { fs.unlinkSync(testImagePath); } catch (e) { /* ignore */ }

            expect(res.statusCode).toEqual(404);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post(`/api/properties/${testPropertyId}/images`);

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('GET /api/properties/:id/images', () => {
        it('should return images for a property (public)', async () => {
            const res = await request(app)
                .get(`/api/properties/${testPropertyId}/images`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeInstanceOf(Array);
        });
    });

    describe('DELETE /api/properties/images/:imageId', () => {
        it('should delete an uploaded image', async () => {
            if (!uploadedImageId) return;

            const res = await request(app)
                .delete(`/api/properties/images/${uploadedImageId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .set('Accept-Language', 'en');

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Image deleted successfully');
        });

        it('should return 404 for non-existent image', async () => {
            const res = await request(app)
                .delete('/api/properties/images/999999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(404);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .delete('/api/properties/images/1');

            expect(res.statusCode).toEqual(401);
        });
    });
});
