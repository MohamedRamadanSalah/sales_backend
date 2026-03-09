const multer = require('multer');
const path = require('path');

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local';

// Use memory storage for cloud providers (Cloudinary), disk for local dev
const storage = STORAGE_PROVIDER === 'local'
    ? multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, path.join(__dirname, '../../uploads'));
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, `property-${uniqueSuffix}${ext}`);
        }
    })
    : multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(req.language === 'ar'
            ? 'نوع الملف غير مدعوم. يرجى رفع صور بصيغة JPEG، PNG، WEBP، أو GIF فقط'
            : 'Unsupported file type. Please upload JPEG, PNG, WEBP, or GIF images only'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max per image
});

module.exports = upload;
