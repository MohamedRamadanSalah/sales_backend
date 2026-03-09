const { pool } = require('../db');
const { paginatedResponse } = require('../middlewares/pagination');
const { createLocationSchema } = require('../validations/locationValidation');

// Fetch all locations (with pagination and i18n)
exports.getLocations = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const offset = (page - 1) * limit;
        const { type, search } = req.query;

        let countQuery = 'SELECT COUNT(*) FROM locations';
        let query = `
            SELECT id, type, parent_id, name_ar, name_en
            FROM locations
        `;
        const params = [];
        let paramIndex = 1;
        const conditions = [];

        if (type) { conditions.push(`type = $${paramIndex++}`); params.push(type); }
        if (search) {
            conditions.push(`(name_ar ILIKE $${paramIndex} OR name_en ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (conditions.length > 0) {
            const where = ' WHERE ' + conditions.join(' AND ');
            countQuery += where;
            query += where;
        }

        const countResult = await pool.query(countQuery, params);
        const totalCount = parseInt(countResult.rows[0].count);

        query += ' ORDER BY type, name_en';
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        const isArabic = req.language === 'ar';
        const mappedLocations = result.rows.map(loc => ({
            id: loc.id,
            type: loc.type,
            parent_id: loc.parent_id,
            name: isArabic ? loc.name_ar : loc.name_en,
            name_ar: loc.name_ar,
            name_en: loc.name_en
        }));

        res.json(paginatedResponse(mappedLocations, totalCount, { page, limit }));
    } catch (err) {
        next(err);
    }
};

// Get location by ID
exports.getLocationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM locations WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            const error = new Error(req.language === 'ar' ? 'الموقع غير موجود' : 'Location not found');
            error.statusCode = 404;
            throw error;
        }

        const loc = result.rows[0];
        const isArabic = req.language === 'ar';

        // Fetch children
        const children = await pool.query('SELECT id, name_ar, name_en, type FROM locations WHERE parent_id = $1', [id]);

        res.json({
            success: true,
            data: {
                ...loc,
                name: isArabic ? loc.name_ar : loc.name_en,
                children: children.rows.map(c => ({
                    id: c.id,
                    name: isArabic ? c.name_ar : c.name_en,
                    type: c.type,
                })),
            }
        });
    } catch (err) {
        next(err);
    }
};

// Create a new location (Admin Only)
exports.createLocation = async (req, res, next) => {
    try {
        const { error, value } = createLocationSchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        const { name_ar, name_en, type, parent_id } = value;

        const duplicateCheck = await pool.query(
            `SELECT id FROM locations WHERE name_ar = $1 AND (parent_id = $2 OR (parent_id IS NULL AND $2 IS NULL))`,
            [name_ar, parent_id || null]
        );

        if (duplicateCheck.rows.length > 0) {
            const dupError = new Error('A location with this name already exists.');
            dupError.statusCode = 409;
            dupError.message_ar = 'يوجد موقع بهذا الاسم بالفعل.';
            throw dupError;
        }

        const result = await pool.query(
            `INSERT INTO locations (name_ar, name_en, type, parent_id)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [name_ar, name_en, type, parent_id || null]
        );

        if (req.audit) await req.audit('create', 'location', result.rows[0].id, { name_en, type });

        res.status(201).json({
            success: true,
            message: req.language === 'ar' ? 'تم إضافة الموقع بنجاح' : 'Location added successfully',
            data: result.rows[0]
        });
    } catch (err) {
        if (err.code === '23505') {
            err.statusCode = 409;
            err.message = 'A location with this name already exists.';
            err.message_ar = 'يوجد موقع بهذا الاسم بالفعل.';
        }
        next(err);
    }
};

// Update a location (Admin Only)
exports.updateLocation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error, value } = createLocationSchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        const { name_ar, name_en, type, parent_id } = value;

        const result = await pool.query(
            `UPDATE locations SET name_ar = $1, name_en = $2, type = $3, parent_id = $4
             WHERE id = $5 RETURNING *`,
            [name_ar, name_en, type, parent_id || null, id]
        );

        if (result.rows.length === 0) {
            const err = new Error(req.language === 'ar' ? 'الموقع غير موجود' : 'Location not found');
            err.statusCode = 404; throw err;
        }

        if (req.audit) await req.audit('update', 'location', id, { name_en, type });

        res.json({
            success: true,
            message: req.language === 'ar' ? 'تم تحديث الموقع بنجاح' : 'Location updated successfully',
            data: result.rows[0]
        });
    } catch (err) { next(err); }
};

// Delete a location (Admin Only)
exports.deleteLocation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM locations WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            const err = new Error(req.language === 'ar' ? 'الموقع غير موجود' : 'Location not found');
            err.statusCode = 404; throw err;
        }

        if (req.audit) await req.audit('delete', 'location', id, { name_en: result.rows[0].name_en });

        res.json({
            success: true,
            message: req.language === 'ar' ? 'تم حذف الموقع بنجاح' : 'Location deleted successfully',
        });
    } catch (err) { next(err); }
};
