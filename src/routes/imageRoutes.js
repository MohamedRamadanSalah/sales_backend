const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const { authenticate, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Upload images for a property (up to 10 at a time)
router.post('/:id/images', authenticate, upload.array('images', 10), imageController.uploadImages);

// Get images for a property (public)
router.get('/:id/images', imageController.getPropertyImages);

// Delete an image (admin or owner)
router.delete('/images/:imageId', authenticate, imageController.deleteImage);

module.exports = router;
