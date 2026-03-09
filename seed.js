require('dotenv').config();
const { pool } = require('./src/db');

async function seed() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ============================================
        // 1. Seed Admin User
        // ============================================
        // Password: admin123 (bcrypt hash generated at 10 rounds)
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const adminHash = await bcrypt.hash('admin123', salt);
        await client.query(`
            INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role, preferred_language)
            VALUES ('Admin', 'System', 'admin@realestate.com', '+201000000000', $1, 'admin', 'ar')
            ON CONFLICT (email) DO NOTHING;
        `, [adminHash]);
        console.log('✅ Admin user seeded');

        // ============================================
        // 2. Seed Locations (Governorates -> Cities -> Neighborhoods)
        // ============================================

        // --- Cairo ---
        const cairo = await client.query(`
            INSERT INTO locations (name_ar, name_en, type) VALUES ('القاهرة', 'Cairo', 'governorate')
            ON CONFLICT (name_ar, parent_id) DO UPDATE SET name_en = EXCLUDED.name_en RETURNING id;
        `);
        const cairoId = cairo.rows[0].id;

        const cairoCities = [
            ['القاهرة الجديدة', 'New Cairo'],
            ['مدينة نصر', 'Nasr City'],
            ['المعادي', 'Maadi'],
            ['مصر الجديدة', 'Heliopolis'],
            ['التجمع الخامس', 'Fifth Settlement'],
            ['الشروق', 'El Shorouk'],
            ['بدر', 'Badr City'],
            ['العاصمة الإدارية الجديدة', 'New Administrative Capital'],
            ['مدينتي', 'Madinaty'],
            ['الرحاب', 'Rehab City'],
        ];
        for (const [ar, en] of cairoCities) {
            await client.query(
                `INSERT INTO locations (name_ar, name_en, type, parent_id) VALUES ($1, $2, 'city', $3)
                 ON CONFLICT (name_ar, parent_id) DO UPDATE SET name_en = EXCLUDED.name_en;`,
                [ar, en, cairoId]
            );
        }
        console.log('✅ Cairo locations seeded');

        // --- Giza ---
        const giza = await client.query(`
            INSERT INTO locations (name_ar, name_en, type) VALUES ('الجيزة', 'Giza', 'governorate')
            ON CONFLICT (name_ar, parent_id) DO UPDATE SET name_en = EXCLUDED.name_en RETURNING id;
        `);
        const gizaId = giza.rows[0].id;

        const gizaCities = [
            ['السادس من أكتوبر', '6th of October City'],
            ['الشيخ زايد', 'Sheikh Zayed'],
            ['الحوامدية', 'El Hawamdeyya'],
            ['الهرم', 'Haram'],
            ['فيصل', 'Faisal'],
            ['حدائق الأهرام', 'Hadayek El Ahram'],
        ];
        for (const [ar, en] of gizaCities) {
            await client.query(
                `INSERT INTO locations (name_ar, name_en, type, parent_id) VALUES ($1, $2, 'city', $3)
                 ON CONFLICT (name_ar, parent_id) DO UPDATE SET name_en = EXCLUDED.name_en;`,
                [ar, en, gizaId]
            );
        }
        console.log('✅ Giza locations seeded');

        // --- Alexandria ---
        const alex = await client.query(`
            INSERT INTO locations (name_ar, name_en, type) VALUES ('الإسكندرية', 'Alexandria', 'governorate')
            ON CONFLICT (name_ar, parent_id) DO UPDATE SET name_en = EXCLUDED.name_en RETURNING id;
        `);
        const alexId = alex.rows[0].id;

        const alexCities = [
            ['سموحة', 'Smouha'],
            ['سيدي بشر', 'Sidi Bishr'],
            ['المنتزه', 'Montaza'],
            ['العصافرة', 'El Asafra'],
            ['ستانلي', 'Stanley'],
            ['الساحل الشمالي', 'North Coast'],
            ['برج العرب الجديدة', 'New Borg El Arab'],
        ];
        for (const [ar, en] of alexCities) {
            await client.query(
                `INSERT INTO locations (name_ar, name_en, type, parent_id) VALUES ($1, $2, 'city', $3)
                 ON CONFLICT (name_ar, parent_id) DO UPDATE SET name_en = EXCLUDED.name_en;`,
                [ar, en, alexId]
            );
        }
        console.log('✅ Alexandria locations seeded');

        // ============================================
        // 3. Seed Categories
        // ============================================
        const categories = [
            ['شقة', 'Apartment', 'apartment'],
            ['فيلا', 'Villa', 'villa'],
            ['دوبلكس', 'Duplex', 'duplex'],
            ['بنتهاوس', 'Penthouse', 'penthouse'],
            ['شاليه', 'Chalet', 'chalet'],
            ['تاون هاوس', 'Townhouse', 'townhouse'],
            ['توين هاوس', 'Twin House', 'twin-house'],
            ['استوديو', 'Studio', 'studio'],
            ['محل تجاري', 'Commercial Shop', 'commercial-shop'],
            ['مكتب إداري', 'Office', 'office'],
            ['عيادة', 'Clinic', 'clinic'],
            ['أرض', 'Land', 'land'],
            ['مخزن', 'Warehouse', 'warehouse'],
        ];
        for (const [ar, en, slug] of categories) {
            await client.query(
                `INSERT INTO categories (name_ar, name_en, slug) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING;`,
                [ar, en, slug]
            );
        }
        console.log('✅ Categories seeded');

        // ============================================
        // 4. Seed Amenities
        // ============================================
        const amenities = [
            ['حمام سباحة', 'Swimming Pool'],
            ['أمن وحراسة', 'Security'],
            ['جراج خاص', 'Private Garage'],
            ['حديقة خاصة', 'Private Garden'],
            ['تكييف مركزي', 'Central A/C'],
            ['مصعد', 'Elevator'],
            ['بلكونة', 'Balcony'],
            ['إنترنت', 'Internet'],
            ['غاز طبيعي', 'Natural Gas'],
            ['كاميرات مراقبة', 'CCTV'],
            ['نادي رياضي', 'Gym / Sports Club'],
            ['مناطق تجارية', 'Commercial Area'],
            ['مسجد', 'Mosque'],
            ['منطقة ألعاب أطفال', 'Kids Play Area'],
            ['مسارات للمشي', 'Walking Tracks'],
        ];
        for (const [ar, en] of amenities) {
            await client.query(
                `INSERT INTO amenities (name_ar, name_en) VALUES ($1, $2) ON CONFLICT (name_ar) DO NOTHING;`,
                [ar, en]
            );
        }
        console.log('✅ Amenities seeded');

        // ============================================
        // 5. Seed a few famous Developers
        // ============================================
        const developers = [
            ['مجموعة طلعت مصطفى', 'Talaat Moustafa Group', 'Leading Egyptian real estate developer behind Madinaty and Al Rehab.'],
            ['بالم هيلز', 'Palm Hills Developments', 'A major real estate developer in Egypt with projects across the country.'],
            ['إعمار مصر', 'Emaar Misr', 'Part of the globally renowned Emaar Properties, developer of Marassi and Uptown Cairo.'],
            ['سوديك', 'SODIC', 'One of Egypt largest real estate development companies.'],
            ['ماونتن فيو', 'Mountain View', 'Known for innovative, nature-inspired communities across Egypt.'],
            ['حسن علام', 'Hassan Allam Properties', 'A longstanding name in Egyptian construction and real estate.'],
            ['أورا ديفلوبرز', 'Ora Developers', 'Founded by Naguib Sawiris, developing luxury communities.'],
        ];
        for (const [ar, en, desc] of developers) {
            await client.query(
                `INSERT INTO developers (name_ar, name_en, description_en) VALUES ($1, $2, $3) ON CONFLICT (name_ar) DO NOTHING;`,
                [ar, en, desc]
            );
        }
        console.log('✅ Developers seeded');

        await client.query('COMMIT');
        console.log('\n🎉 All seed data inserted successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Seeding failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
