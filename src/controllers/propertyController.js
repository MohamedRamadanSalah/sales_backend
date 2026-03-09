const { pool } = require('../db');
const { paginatedResponse } = require('../middlewares/pagination');
const { createPropertySchema, updatePropertySchema, updatePropertyStatusSchema } = require('../validations/propertyValidation');
const { createNotification } = require('../utils/notify');
const logger = require('../utils/logger');

// ─── GET all categories (Public) ───
exports.getCategories = async (req, res, next) => {
    try {
        const isArabic = req.language === 'ar';
        const result = await pool.query('SELECT id, name_ar, name_en, slug FROM categories ORDER BY id');
        const data = result.rows.map(c => ({
            id: c.id,
            name: isArabic ? c.name_ar : c.name_en,
            name_ar: c.name_ar,
            name_en: c.name_en,
            slug: c.slug
        }));
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

// ─── GET all amenities (Public) ───
exports.getAmenities = async (req, res, next) => {
    try {
        const isArabic = req.language === 'ar';
        const result = await pool.query('SELECT id, name_ar, name_en FROM amenities ORDER BY id');
        const data = result.rows.map(a => ({
            id: a.id,
            name: isArabic ? a.name_ar : a.name_en,
            name_ar: a.name_ar,
            name_en: a.name_en
        }));
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

// ─── GET all properties (Public - shows only approved, with search & pagination) ───
exports.getProperties = async (req, res, next) => {
    try {
        const isArabic = req.language === 'ar';
        const {
            category_id, location_id, listing_type, property_origin,
            min_price, max_price, bedrooms, search,
            sort_by, sort_order
        } = req.query;

        // Pagination defaults
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;

        let query = `
            SELECT p.*,
                   c.name_ar AS category_name_ar, c.name_en AS category_name_en,
                   l.name_ar AS location_name_ar, l.name_en AS location_name_en,
                   d.name_ar AS developer_name_ar, d.name_en AS developer_name_en,
                   pr.name_ar AS project_name_ar, pr.name_en AS project_name_en,
                   (SELECT image_url FROM property_images pi WHERE pi.property_id = p.id AND pi.is_primary = true LIMIT 1) AS primary_image
            FROM properties p
            JOIN categories c ON p.category_id = c.id
            JOIN locations l ON p.location_id = l.id
            LEFT JOIN developers d ON p.developer_id = d.id
            LEFT JOIN projects pr ON p.project_id = pr.id
            WHERE p.status = 'approved' AND p.deleted_at IS NULL
        `;
        const params = [];
        let paramIndex = 1;

        // Full-text search
        if (search) {
            query += ` AND (p.title_ar ILIKE $${paramIndex} OR p.title_en ILIKE $${paramIndex} OR p.description_ar ILIKE $${paramIndex} OR p.description_en ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Dynamic filters
        if (category_id) { query += ` AND p.category_id = $${paramIndex++}`; params.push(category_id); }
        if (location_id) { query += ` AND p.location_id = $${paramIndex++}`; params.push(location_id); }
        if (listing_type) { query += ` AND p.listing_type = $${paramIndex++}`; params.push(listing_type); }
        if (property_origin) { query += ` AND p.property_origin = $${paramIndex++}`; params.push(property_origin); }
        if (min_price) { query += ` AND p.price >= $${paramIndex++}`; params.push(min_price); }
        if (max_price) { query += ` AND p.price <= $${paramIndex++}`; params.push(max_price); }
        if (bedrooms) { query += ` AND p.bedrooms = $${paramIndex++}`; params.push(bedrooms); }
        if (req.query.min_area) { query += ` AND p.area_sqm >= $${paramIndex++}`; params.push(req.query.min_area); }
        if (req.query.max_area) { query += ` AND p.area_sqm <= $${paramIndex++}`; params.push(req.query.max_area); }
        if (req.query.finishing_type) { query += ` AND p.finishing_type = $${paramIndex++}`; params.push(req.query.finishing_type); }

        // Count query (without pagination)
        const countQuery = `SELECT COUNT(*) FROM (${query}) AS filtered`;
        const countResult = await pool.query(countQuery, params);
        const totalCount = parseInt(countResult.rows[0].count);

        // Sorting
        const validSortFields = ['price', 'area_sqm', 'created_at', 'bedrooms'];
        const sortField = validSortFields.includes(sort_by) ? `p.${sort_by}` : 'p.created_at';
        const sortDir = sort_order === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortField} ${sortDir}`;

        // Pagination
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        const data = result.rows.map(p => ({
            ...p,
            title: isArabic ? p.title_ar : (p.title_en || p.title_ar),
            description: isArabic ? p.description_ar : (p.description_en || p.description_ar),
            category_name: isArabic ? p.category_name_ar : p.category_name_en,
            location_name: isArabic ? p.location_name_ar : p.location_name_en,
            developer_name: p.developer_name_ar ? (isArabic ? p.developer_name_ar : p.developer_name_en) : null,
            project_name: p.project_name_ar ? (isArabic ? p.project_name_ar : p.project_name_en) : null,
        }));

        res.json(paginatedResponse(data, totalCount, { page, limit }));
    } catch (err) {
        next(err);
    }
};

// ─── GET all properties for Admin (shows all statuses, with pagination) ───
exports.getAdminProperties = async (req, res, next) => {
    try {
        const isArabic = req.language === 'ar';
        const { status, search } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;

        let query = `
            SELECT p.*,
                   c.name_ar AS category_name_ar, c.name_en AS category_name_en,
                   l.name_ar AS location_name_ar, l.name_en AS location_name_en,
                   u.first_name, u.last_name, u.email AS owner_email
            FROM properties p
            JOIN categories c ON p.category_id = c.id
            JOIN locations l ON p.location_id = l.id
            JOIN users u ON p.user_id = u.id
            WHERE p.deleted_at IS NULL
        `;
        const params = [];
        let paramIndex = 1;

        if (status) { query += ` AND p.status = $${paramIndex++}`; params.push(status); }
        if (search) {
            query += ` AND (p.title_ar ILIKE $${paramIndex} OR p.title_en ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) AS filtered`, params);
        const totalCount = parseInt(countResult.rows[0].count);

        query += ' ORDER BY p.created_at DESC';
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        const data = result.rows.map(p => ({
            ...p,
            title: isArabic ? p.title_ar : (p.title_en || p.title_ar),
            category_name: isArabic ? p.category_name_ar : p.category_name_en,
            location_name: isArabic ? p.location_name_ar : p.location_name_en,
            owner_name: `${p.first_name} ${p.last_name}`,
        }));

        res.json(paginatedResponse(data, totalCount, { page, limit }));
    } catch (err) {
        next(err);
    }
};

// ─── GET current user's own properties (all statuses) ───
exports.getMyProperties = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const isArabic = req.language === 'ar';
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        const { status } = req.query;

        let query = `
            SELECT p.*,
                   c.name_ar AS category_name_ar, c.name_en AS category_name_en,
                   l.name_ar AS location_name_ar, l.name_en AS location_name_en
            FROM properties p
            JOIN categories c ON p.category_id = c.id
            JOIN locations l ON p.location_id = l.id
            WHERE p.user_id = $1 AND p.deleted_at IS NULL
        `;
        const params = [userId];
        let paramIndex = 2;

        if (status) { query += ` AND p.status = $${paramIndex++}`; params.push(status); }

        const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) AS filtered`, params);
        const totalCount = parseInt(countResult.rows[0].count);

        query += ' ORDER BY p.created_at DESC';
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        const data = result.rows.map(p => ({
            ...p,
            title: isArabic ? p.title_ar : (p.title_en || p.title_ar),
            category_name: isArabic ? p.category_name_ar : p.category_name_en,
            location_name: isArabic ? p.location_name_ar : p.location_name_en,
        }));

        res.json(paginatedResponse(data, totalCount, { page, limit }));
    } catch (err) {
        next(err);
    }
};

// ─── PATCH deactivate own property (Owner only) ───
exports.deactivateProperty = async (req, res, next) => {
    try {
        const { id } = req.params;
        const isArabic = req.language === 'ar';

        const property = await pool.query(
            'SELECT user_id, status FROM properties WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        if (property.rows.length === 0) {
            const err = new Error(isArabic ? 'العقار غير موجود' : 'Property not found');
            err.statusCode = 404; throw err;
        }

        // Only the owner can deactivate
        if (property.rows[0].user_id !== req.user.id) {
            const err = new Error(isArabic ? 'ليس لديك صلاحية لتعطيل هذا العقار' : 'You do not have permission to deactivate this property');
            err.statusCode = 403; throw err;
        }

        // Can only deactivate approved properties
        if (property.rows[0].status !== 'approved') {
            const err = new Error(isArabic ? 'يمكن تعطيل العقارات المعتمدة فقط' : 'Only approved properties can be deactivated');
            err.statusCode = 400; throw err;
        }

        const result = await pool.query(
            'UPDATE properties SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            ['inactive', id]
        );

        if (req.audit) await req.audit('deactivate', 'property', id, { new_status: 'inactive' });

        res.json({
            success: true,
            message: isArabic ? 'تم تعطيل العقار بنجاح' : 'Property deactivated successfully',
            data: result.rows[0]
        });
    } catch (err) {
        next(err);
    }
};

// ─── GET single property by ID ───
exports.getPropertyById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const isArabic = req.language === 'ar';

        const result = await pool.query(`
            SELECT p.*,
                   c.name_ar AS category_name_ar, c.name_en AS category_name_en,
                   l.name_ar AS location_name_ar, l.name_en AS location_name_en,
                   d.name_ar AS developer_name_ar, d.name_en AS developer_name_en,
                   pr.name_ar AS project_name_ar, pr.name_en AS project_name_en
            FROM properties p
            JOIN categories c ON p.category_id = c.id
            JOIN locations l ON p.location_id = l.id
            LEFT JOIN developers d ON p.developer_id = d.id
            LEFT JOIN projects pr ON p.project_id = pr.id
            WHERE p.id = $1 AND p.deleted_at IS NULL
        `, [id]);

        if (result.rows.length === 0) {
            const err = new Error(isArabic ? 'العقار غير موجود' : 'Property not found');
            err.statusCode = 404;
            throw err;
        }

        const p = result.rows[0];

        // Fetch amenities for this property
        const amenities = await pool.query(`
            SELECT a.id, a.name_ar, a.name_en
            FROM property_amenities pa
            JOIN amenities a ON pa.amenity_id = a.id
            WHERE pa.property_id = $1
        `, [id]);

        // Fetch images
        const images = await pool.query(
            'SELECT * FROM property_images WHERE property_id = $1 ORDER BY is_primary DESC',
            [id]
        );

        res.json({
            success: true,
            data: {
                ...p,
                title: isArabic ? p.title_ar : (p.title_en || p.title_ar),
                description: isArabic ? p.description_ar : (p.description_en || p.description_ar),
                category_name: isArabic ? p.category_name_ar : p.category_name_en,
                location_name: isArabic ? p.location_name_ar : p.location_name_en,
                developer_name: p.developer_name_ar ? (isArabic ? p.developer_name_ar : p.developer_name_en) : null,
                project_name: p.project_name_ar ? (isArabic ? p.project_name_ar : p.project_name_en) : null,
                amenities: amenities.rows.map(a => ({
                    id: a.id,
                    name: isArabic ? a.name_ar : a.name_en
                })),
                images: images.rows
            }
        });
    } catch (err) {
        next(err);
    }
};

// ─── POST create a new property ───
exports.createProperty = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { error, value } = createPropertySchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        const {
            category_id, location_id, project_id, developer_id,
            title_ar, title_en, description_ar, description_en,
            listing_type, property_origin, finishing_type, legal_status,
            price, currency, down_payment, installment_years, delivery_date,
            maintenance_deposit, commission_percentage,
            area_sqm, bedrooms, bathrooms, floor_level,
            latitude, longitude,
            amenity_ids
        } = value;

        const user_id = req.user.id;

        await client.query('BEGIN');

        const result = await client.query(`
            INSERT INTO properties (
                user_id, category_id, location_id, project_id, developer_id,
                title_ar, title_en, description_ar, description_en,
                listing_type, property_origin, finishing_type, legal_status,
                price, currency, down_payment, installment_years, delivery_date,
                maintenance_deposit, commission_percentage,
                area_sqm, bedrooms, bathrooms, floor_level,
                latitude, longitude, status
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9,
                $10, $11, $12, $13,
                $14, $15, $16, $17, $18,
                $19, $20,
                $21, $22, $23, $24,
                $25, $26, 'pending_approval'
            ) RETURNING *
        `, [
            user_id, category_id, location_id, project_id || null, developer_id || null,
            title_ar, title_en || null, description_ar, description_en || null,
            listing_type, property_origin, finishing_type, legal_status,
            price, currency || 'EGP', down_payment || null, installment_years || 0, delivery_date || null,
            maintenance_deposit || null, commission_percentage || 0,
            area_sqm, bedrooms || null, bathrooms || null, floor_level || null,
            latitude || null, longitude || null
        ]);

        const propertyId = result.rows[0].id;

        // Link amenities if provided
        if (amenity_ids && amenity_ids.length > 0) {
            for (const amenityId of amenity_ids) {
                await client.query(
                    'INSERT INTO property_amenities (property_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [propertyId, amenityId]
                );
            }
        }

        await client.query('COMMIT');

        // Audit log
        if (req.audit) await req.audit('create', 'property', propertyId, { title_ar, listing_type, price });

        const isArabic = req.language === 'ar';
        res.status(201).json({
            success: true,
            message: isArabic
                ? 'تم إضافة العقار بنجاح وهو في انتظار موافقة الإدارة'
                : 'Property added successfully and is pending admin approval',
            data: result.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

// ─── PUT update a property (owner or admin) ───
exports.updateProperty = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const isArabic = req.language === 'ar';

        const { error, value } = updatePropertySchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        // Check ownership
        const existing = await client.query('SELECT user_id, status FROM properties WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (existing.rows.length === 0) {
            const err = new Error(isArabic ? 'العقار غير موجود' : 'Property not found');
            err.statusCode = 404; throw err;
        }
        if (req.user.role !== 'admin' && existing.rows[0].user_id !== req.user.id) {
            const err = new Error(isArabic ? 'ليس لديك صلاحية لتعديل هذا العقار' : 'You do not have permission to edit this property');
            err.statusCode = 403; throw err;
        }

        const { amenity_ids, ...fields } = value;
        const oldStatus = existing.rows[0].status;

        await client.query('BEGIN');

        // If property was approved/rejected and is being edited by owner, reset to pending_approval
        if ((oldStatus === 'approved' || oldStatus === 'rejected') && req.user.role !== 'admin') {
            fields.status = 'pending_approval';
        }

        // Build dynamic SET clause
        if (Object.keys(fields).length > 0) {
            const setClauses = [];
            const params = [];
            let idx = 1;
            for (const [key, val] of Object.entries(fields)) {
                setClauses.push(`${key} = $${idx++}`);
                params.push(val);
            }
            params.push(id);
            await client.query(
                `UPDATE properties SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
                params
            );
        }

        // Update amenities if provided
        if (amenity_ids) {
            await client.query('DELETE FROM property_amenities WHERE property_id = $1', [id]);
            for (const amenityId of amenity_ids) {
                await client.query(
                    'INSERT INTO property_amenities (property_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [id, amenityId]
                );
            }
        }

        await client.query('COMMIT');

        // Fetch updated property
        const result = await pool.query('SELECT * FROM properties WHERE id = $1', [id]);

        if (req.audit) await req.audit('update', 'property', id, fields);

        // Log status change
        if ((oldStatus === 'approved' || oldStatus === 'rejected') && req.user.role !== 'admin') {
            logger.info(`Property status reset to pending after edit`, { propertyId: id, userId: req.user.id, previousStatus: oldStatus });
        }

        res.json({
            success: true,
            message: isArabic ? 'تم تحديث العقار بنجاح' : 'Property updated successfully',
            data: result.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

// ─── PATCH update property status (Admin Approval) ───
exports.updatePropertyStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error, value } = updatePropertyStatusSchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        const { status } = value;
        const isArabic = req.language === 'ar';

        // Get property and owner info before update
        const propertyBefore = await pool.query(
            'SELECT user_id, title_ar, title_en FROM properties WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        if (propertyBefore.rows.length === 0) {
            const err = new Error(isArabic ? 'العقار غير موجود' : 'Property not found');
            err.statusCode = 404;
            throw err;
        }

        const userId = propertyBefore.rows[0].user_id;
        const title = isArabic ? propertyBefore.rows[0].title_ar : propertyBefore.rows[0].title_en;

        // Update status
        const result = await pool.query(
            'UPDATE properties SET status = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL RETURNING *',
            [status, id]
        );

        // Audit log
        if (req.audit) await req.audit(status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'update', 'property', id, { new_status: status });

        // Send notifications based on status change
        let notificationSent = false;
        try {
            if (status === 'approved') {
                await createNotification(userId, 'property_approved', {
                    title_ar: 'تم قبول عقارك ✓',
                    title_en: 'Your Property Approved ✓',
                    message_ar: `تم قبول عقارك "${propertyBefore.rows[0].title_ar}" من قبل الإدارة وظهر في نتائج البحث`,
                    message_en: `Your property "${propertyBefore.rows[0].title_en}" has been approved and is now visible in search results`
                }, 'property', id);
                notificationSent = true;
            } else if (status === 'rejected') {
                await createNotification(userId, 'property_rejected', {
                    title_ar: 'تم رفض عقارك',
                    title_en: 'Your Property Rejected',
                    message_ar: `تم رفض عقارك "${propertyBefore.rows[0].title_ar}". يرجى التحقق من البيانات والمحاولة مرة أخرى`,
                    message_en: `Your property "${propertyBefore.rows[0].title_en}" has been rejected. Please review the information and try again`
                }, 'property', id);
                notificationSent = true;
            } else if (status === 'approved' && propertyBefore.rows[0].status === 'inactive') {
                // Reactivation from inactive to approved
                await createNotification(userId, 'property_reactivated', {
                    title_ar: 'تم إعادة تنشيط عقارك',
                    title_en: 'Your Property Reactivated',
                    message_ar: `تم إعادة تنشيط عقارك "${propertyBefore.rows[0].title_ar}" من قبل الإدارة`,
                    message_en: `Your property "${propertyBefore.rows[0].title_en}" has been reactivated by admin`
                }, 'property', id);
                notificationSent = true;
            }
        } catch (notificationError) {
            logger.error('Failed to send notification', { propertyId: id, status, error: notificationError.message });
            // Don't fail the request if notification fails
        }

        const statusMessages = {
            approved: isArabic ? 'تم الموافقة على العقار' : 'Property approved',
            rejected: isArabic ? 'تم رفض العقار' : 'Property rejected',
            sold: isArabic ? 'تم تحديث حالة العقار إلى مباع' : 'Property marked as sold',
            rented: isArabic ? 'تم تحديث حالة العقار إلى مؤجر' : 'Property marked as rented',
            inactive: isArabic ? 'تم إلغاء تفعيل العقار' : 'Property deactivated',
        };

        res.json({
            success: true,
            message: statusMessages[status],
            data: result.rows[0],
            notification_sent: notificationSent
        });
    } catch (err) {
        next(err);
    }
};

// ─── DELETE (soft delete) a property ───
exports.deleteProperty = async (req, res, next) => {
    try {
        const { id } = req.params;
        const isArabic = req.language === 'ar';

        // Only owner or admin can delete
        const property = await pool.query('SELECT user_id FROM properties WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (property.rows.length === 0) {
            const err = new Error(isArabic ? 'العقار غير موجود' : 'Property not found');
            err.statusCode = 404; throw err;
        }

        if (req.user.role !== 'admin' && property.rows[0].user_id !== req.user.id) {
            const err = new Error(isArabic ? 'ليس لديك صلاحية لحذف هذا العقار' : 'You do not have permission to delete this property');
            err.statusCode = 403; throw err;
        }

        await pool.query('UPDATE properties SET deleted_at = NOW(), status = $1 WHERE id = $2', ['inactive', id]);

        if (req.audit) await req.audit('delete', 'property', id);

        res.json({
            success: true,
            message: isArabic ? 'تم حذف العقار بنجاح' : 'Property deleted successfully',
        });
    } catch (err) { next(err); }
};
