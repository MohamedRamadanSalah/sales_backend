const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticate, authorize } = require('../middlewares/auth');

// Public
router.get('/', locationController.getLocations);
router.get('/:id', locationController.getLocationById);

// Admin Only
router.post('/', authenticate, authorize('admin'), locationController.createLocation);
router.put('/:id', authenticate, authorize('admin'), locationController.updateLocation);
router.delete('/:id', authenticate, authorize('admin'), locationController.deleteLocation);

module.exports = router;
