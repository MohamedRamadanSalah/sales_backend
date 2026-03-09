const { pool } = require('../db');

// ─── ADD TO FAVORITES ───
exports.addFavorite = async (req, res, next) => {
    try {
        const { property_id } = req.body;
        const user_id = req.user.id;
        const isArabic = req.language === 'ar';

        if (!property_id) {
            const err = new Error(isArabic ? 'معرف العقار مطلوب' : 'Property ID is required');
            err.statusCode = 400; throw err;
        }

        // Verify property exists
        const property = await pool.query('SELECT id FROM properties WHERE id = $1 AND deleted_at IS NULL', [property_id]);
        if (property.rows.length === 0) {
            const err = new Error(isArabic ? 'العقار غير موجود' : 'Property not found');
            err.statusCode = 404; throw err;
        }

        // Check if already favorited
        const existing = await pool.query(
            'SELECT id FROM favorites WHERE user_id = $1 AND property_id = $2',
            [user_id, property_id]
        );
        if (existing.rows.length > 0) {
            const err = new Error(isArabic ? 'هذا العقار موجود بالفعل في المفضلة' : 'Property is already in your favorites');
            err.statusCode = 409; throw err;
        }

        const result = await pool.query(
            'INSERT INTO favorites (user_id, property_id) VALUES ($1, $2) RETURNING *',
            [user_id, property_id]
        );

        if (req.audit) await req.audit('add_favorite', 'favorite', result.rows[0].id, { property_id });

        res.status(201).json({
            success: true,
            message: isArabic ? 'تمت الإضافة إلى المفضلة' : 'Added to favorites',
            data: result.rows[0],
        });
    } catch (err) { next(err); }
};

// ─── GET MY FAVORITES ───
exports.getMyFavorites = async (req, res, next) => {
    try {
        const isArabic = req.language === 'ar';

        const result = await pool.query(`
            SELECT f.id AS favorite_id, f.created_at AS favorited_at,
                   p.id, p.title_ar, p.title_en, p.price, p.area_sqm, p.bedrooms, p.bathrooms,
                   p.listing_type, p.status,
                   c.name_ar AS category_ar, c.name_en AS category_en,
                   l.name_ar AS location_ar, l.name_en AS location_en,
                   (SELECT image_url FROM property_images pi WHERE pi.property_id = p.id AND pi.is_primary = true LIMIT 1) AS primary_image
            FROM favorites f
            JOIN properties p ON f.property_id = p.id
            JOIN categories c ON p.category_id = c.id
            JOIN locations l ON p.location_id = l.id
            WHERE f.user_id = $1 AND p.deleted_at IS NULL
            ORDER BY f.created_at DESC
        `, [req.user.id]);

        const data = result.rows.map(r => ({
            favorite_id: r.favorite_id,
            favorited_at: r.favorited_at,
            property: {
                id: r.id,
                title: isArabic ? r.title_ar : (r.title_en || r.title_ar),
                price: parseFloat(r.price),
                area_sqm: parseFloat(r.area_sqm),
                bedrooms: r.bedrooms,
                bathrooms: r.bathrooms,
                listing_type: r.listing_type,
                status: r.status,
                category: isArabic ? r.category_ar : r.category_en,
                location: isArabic ? r.location_ar : r.location_en,
                primary_image: r.primary_image,
            },
        }));

        res.json({ success: true, count: data.length, data });
    } catch (err) { next(err); }
};

// ─── REMOVE FROM FAVORITES ───
exports.removeFavorite = async (req, res, next) => {
    try {
        const { propertyId } = req.params;
        const isArabic = req.language === 'ar';

        const result = await pool.query(
            'DELETE FROM favorites WHERE user_id = $1 AND property_id = $2 RETURNING *',
            [req.user.id, propertyId]
        );

        if (result.rows.length === 0) {
            const err = new Error(isArabic ? 'العقار غير موجود في المفضلة' : 'Property not found in favorites');
            err.statusCode = 404; throw err;
        }

        if (req.audit) await req.audit('remove_favorite', 'favorite', result.rows[0].id, { property_id: propertyId });

        res.json({
            success: true,
            message: isArabic ? 'تمت الإزالة من المفضلة' : 'Removed from favorites',
        });
    } catch (err) { next(err); }
};
