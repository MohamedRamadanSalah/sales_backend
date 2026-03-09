const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middlewares/auth');

// All analytics routes are admin-only
router.use(authenticate, authorize('admin'));

router.get('/overview', analyticsController.getOverview);
router.get('/revenue', analyticsController.getRevenueAnalytics);
router.get('/properties', analyticsController.getPropertyAnalytics);
router.get('/users', analyticsController.getUserAnalytics);
router.get('/orders', analyticsController.getOrderAnalytics);
router.get('/locations', analyticsController.getLocationAnalytics);
router.get('/recent-activity', analyticsController.getRecentActivity);

module.exports = router;
