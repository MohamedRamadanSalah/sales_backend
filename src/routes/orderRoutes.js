const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middlewares/auth');

// Client routes
router.post('/', authenticate, orderController.createOrder);
router.get('/my', authenticate, orderController.getMyOrders);

// Admin routes - Orders
router.get('/all', authenticate, authorize('admin'), orderController.getAllOrders);
router.patch('/:id/status', authenticate, authorize('admin'), orderController.updateOrderStatus);

// Admin routes - Invoices
router.post('/invoices', authenticate, authorize('admin'), orderController.createInvoice);
router.get('/invoices', authenticate, authorize('admin'), orderController.getAllInvoices);
router.patch('/invoices/:id/status', authenticate, authorize('admin'), orderController.updateInvoiceStatus);

module.exports = router;
