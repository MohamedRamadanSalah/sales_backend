const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middlewares/auth');

// Client routes
router.get('/preview/:property_id', authenticate, orderController.previewInvoice);
router.post('/', authenticate, orderController.createOrder);
router.get('/my', authenticate, orderController.getMyOrders);

// Admin routes - Orders
router.get('/all', authenticate, authorize('admin'), orderController.getAllOrders);
router.patch('/:id/status', authenticate, authorize('admin'), orderController.updateOrderStatus);

// Admin routes - Invoices
router.post('/invoices', authenticate, authorize('admin'), orderController.createInvoice);
router.get('/invoices', authenticate, authorize('admin'), orderController.getAllInvoices);
router.patch('/invoices/:id/status', authenticate, authorize('admin'), orderController.updateInvoiceStatus);

// Detailed Invoice Routes
router.get('/invoices/:id/detail', authenticate, orderController.getDetailedInvoice);
router.patch('/invoices/:id/seller-approval', authenticate, orderController.sellerInvoiceApproval);
router.patch('/invoices/:id/admin-approval', authenticate, authorize('admin'), orderController.adminInvoiceApproval);

module.exports = router;
