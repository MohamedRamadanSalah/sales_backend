const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { authenticate, authorize } = require('../middlewares/auth');

// Public routes (only approved properties)
router.get('/', propertyController.getProperties);
router.get('/categories', propertyController.getCategories);
router.get('/amenities', propertyController.getAmenities);

// Admin Only routes (MUST be before /:id to avoid param capture)
router.get('/admin/all', authenticate, authorize('admin'), propertyController.getAdminProperties);

// Owner: get my properties (all statuses)
router.get('/my', authenticate, propertyController.getMyProperties);

// Owner: deactivate own property
router.patch('/:id/deactivate', authenticate, propertyController.deactivateProperty);

// Authenticated users can submit properties
router.post('/', authenticate, propertyController.createProperty);

// Parameterized routes last
router.get('/:id', propertyController.getPropertyById);
router.put('/:id', authenticate, propertyController.updateProperty);
router.patch('/:id/status', authenticate, authorize('admin'), propertyController.updatePropertyStatus);
router.delete('/:id', authenticate, propertyController.deleteProperty);

module.exports = router;
