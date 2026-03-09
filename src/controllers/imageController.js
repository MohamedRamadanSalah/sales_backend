const { pool } = require('../db');
const { uploadFile, deleteFile } = require('../utils/storage');

// ─── Upload images for a property ───
exports.uploadImages = async (req, res, next) => {
    try {
        const { id } = req.params;
        const isArabic = req.language === 'ar';

        const property = await pool.query('SELECT id, user_id FROM properties WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (property.rows.length === 0) {
            const err = new Error(isArabic ? 'العقار غير موجود' : 'Property not found');
            err.statusCode = 404; throw err;
        }

        if (req.user.role !== 'admin' && property.rows[0].user_id !== req.user.id) {
            const err = new Error(isArabic ? 'ليس لديك صلاحية لتعديل هذا العقار' : 'You do not have permission to modify this property');
            err.statusCode = 403; throw err;
        }

        if (!req.files || req.files.length === 0) {
            const err = new Error(isArabic ? 'يرجى رفع صورة واحدة على الأقل' : 'Please upload at least one image');
            err.statusCode = 400; throw err;
        }

        const existingPrimary = await pool.query(
            'SELECT id FROM property_images WHERE property_id = $1 AND is_primary = true', [id]
        );

        const insertedImages = [];
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const isPrimary = existingPrimary.rows.length === 0 && i === 0;

            const imageUrl = await uploadFile(file);
            const result = await pool.query(
                `INSERT INTO property_images (property_id, image_url, is_primary)
                 VALUES ($1, $2, $3) RETURNING *`,
                [id, imageUrl, isPrimary]
            );
            insertedImages.push(result.rows[0]);
        }

        if (req.audit) await req.audit('upload_images', 'property', id, { count: insertedImages.length });

        res.status(201).json({
            success: true,
            message: isArabic
                ? `تم رفع ${insertedImages.length} صورة بنجاح`
                : `${insertedImages.length} image(s) uploaded successfully`,
            data: insertedImages
        });
    } catch (err) { next(err); }
};

// ─── Get images for a property ───
exports.getPropertyImages = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM property_images WHERE property_id = $1 ORDER BY is_primary DESC', [id]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) { next(err); }
};

// ─── Delete an image (with ownership check + file cleanup) ───
exports.deleteImage = async (req, res, next) => {
    try {
        const { imageId } = req.params;
        const isArabic = req.language === 'ar';

        const image = await pool.query(
            `SELECT pi.id, pi.image_url, pi.property_id, p.user_id
             FROM property_images pi
             JOIN properties p ON pi.property_id = p.id
             WHERE pi.id = $1`, [imageId]
        );

        if (image.rows.length === 0) {
            const err = new Error(isArabic ? 'الصورة غير موجودة' : 'Image not found');
            err.statusCode = 404; throw err;
        }

        if (req.user.role !== 'admin' && image.rows[0].user_id !== req.user.id) {
            const err = new Error(isArabic ? 'ليس لديك صلاحية لحذف هذه الصورة' : 'You do not have permission to delete this image');
            err.statusCode = 403; throw err;
        }

        // Delete from database
        await pool.query('DELETE FROM property_images WHERE id = $1', [imageId]);

        // Delete file from storage
        const imageUrl = image.rows[0].image_url;
        if (imageUrl) {
            await deleteFile(imageUrl);
        }

        if (req.audit) await req.audit('delete_image', 'property', image.rows[0].property_id, { image_id: imageId });

        res.json({
            success: true,
            message: isArabic ? 'تم حذف الصورة بنجاح' : 'Image deleted successfully'
        });
    } catch (err) { next(err); }
};
