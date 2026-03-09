/**
 * Storage Service Abstraction
 * Supports local filesystem (default) and cloud storage (S3/Cloudinary).
 *
 * To switch to cloud storage in production:
 * 1. Set STORAGE_PROVIDER=cloudinary in .env
 * 2. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local';

/**
 * Upload a file buffer to cloud storage (Cloudinary)
 * @param {Express.Multer.File} file - The multer file object (with buffer for cloud, filename for local)
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
async function uploadFile(file) {
    if (STORAGE_PROVIDER === 'cloudinary') {
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: 'real-estate', resource_type: 'image' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result.secure_url);
                }
            );
            stream.end(file.buffer);
        });
    }
    // Local: file already saved to disk by multer
    return getFileUrl(file.filename);
}

/**
 * Get the public URL for a stored file
 * @param {string} filename - The stored filename
 * @returns {string} - The public URL
 */
function getFileUrl(filename) {
    if (STORAGE_PROVIDER === 's3') {
        const bucket = process.env.AWS_S3_BUCKET;
        const region = process.env.AWS_REGION || 'us-east-1';
        return `https://${bucket}.s3.${region}.amazonaws.com/uploads/${filename}`;
    }

    if (STORAGE_PROVIDER === 'cloudinary') {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        return `https://res.cloudinary.com/${cloudName}/image/upload/uploads/${filename}`;
    }

    // Local
    return `/uploads/${filename}`;
}

/**
 * Delete a file from storage
 * @param {string} fileUrl - The file URL or path to delete
 * @returns {Promise<boolean>}
 */
async function deleteFile(fileUrl) {
    if (STORAGE_PROVIDER === 's3') {
        // In production, implement S3 delete:
        // const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        // const s3Client = new S3Client({ region: process.env.AWS_REGION });
        // await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: fileUrl }));
        logger.warn('S3 delete not implemented yet', { fileUrl });
        return false;
    }

    if (STORAGE_PROVIDER === 'cloudinary') {
        try {
            const cloudinary = require('cloudinary').v2;
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
            });
            // Extract public_id from the Cloudinary URL
            // e.g. https://res.cloudinary.com/name/image/upload/v123/real-estate/abc.jpg => real-estate/abc
            const match = fileUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
            if (match) {
                await cloudinary.uploader.destroy(match[1]);
            }
            return true;
        } catch (err) {
            logger.error('Failed to delete Cloudinary file', { fileUrl, error: err.message });
            return false;
        }
    }

    // Local filesystem
    try {
        const filePath = path.join(__dirname, '../../', fileUrl);
        await fs.promises.unlink(filePath);
        return true;
    } catch (err) {
        if (err.code !== 'ENOENT') {
            logger.error('Failed to delete local file', { fileUrl, error: err.message });
        }
        return false;
    }
}

module.exports = { getFileUrl, deleteFile, uploadFile, STORAGE_PROVIDER };
