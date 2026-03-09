const { pool } = require('../db');
const { paginatedResponse } = require('../middlewares/pagination');
const { createOrderSchema, updateOrderStatusSchema, createInvoiceSchema, updateInvoiceStatusSchema } = require('../validations/orderValidation');
const { createNotification } = require('../utils/notify');
const logger = require('../utils/logger');

// ─── Client: Create a purchase request ───
exports.createOrder = async (req, res, next) => {
    try {
        const { error, value } = createOrderSchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        const { property_id, notes } = value;
        const client_id = req.user.id;
        const isArabic = req.language === 'ar';

        // Verify property exists and is approved
        const property = await pool.query('SELECT * FROM properties WHERE id = $1 AND deleted_at IS NULL', [property_id]);
        if (property.rows.length === 0) {
            const err = new Error(isArabic ? 'العقار غير موجود' : 'Property not found');
            err.statusCode = 404; throw err;
        }
        if (property.rows[0].status !== 'approved') {
            const err = new Error(isArabic ? 'هذا العقار غير متاح للشراء حالياً' : 'This property is not available for purchase');
            err.statusCode = 400; throw err;
        }

        // Prevent ordering own property
        if (property.rows[0].user_id === client_id) {
            const err = new Error(isArabic ? 'لا يمكنك طلب شراء عقارك الخاص' : 'You cannot order your own property');
            err.statusCode = 400; throw err;
        }

        // Check client hasn't already ordered this property
        const existingOrder = await pool.query(
            "SELECT id FROM orders WHERE client_id = $1 AND property_id = $2 AND status IN ('pending', 'accepted')",
            [client_id, property_id]
        );
        if (existingOrder.rows.length > 0) {
            const err = new Error(isArabic ? 'لديك طلب موجود بالفعل لهذا العقار' : 'You already have an active order for this property');
            err.statusCode = 409; throw err;
        }

        const result = await pool.query(`
            INSERT INTO orders (client_id, property_id, total_amount, status, notes)
            VALUES ($1, $2, $3, 'pending', $4)
            RETURNING *
        `, [client_id, property_id, property.rows[0].price, notes || null]);

        if (req.audit) await req.audit('create', 'order', result.rows[0].id, { property_id, amount: property.rows[0].price });

        // Notify property owner (seller) that an order was received
        try {
            await createNotification(property.rows[0].user_id, 'order_received', {
                title_ar: 'طلب شراء جديد',
                title_en: 'New Purchase Order',
                message_ar: `تم استلام طلب شراء جديد لعقارك "${property.rows[0].title_ar}" بمبلغ ${property.rows[0].price}`,
                message_en: `A new purchase order has been received for your property "${property.rows[0].title_en}" for ${property.rows[0].price}`
            }, 'order', result.rows[0].id);
        } catch (notificationError) {
            logger.error('Failed to notify seller of new order', { orderId: result.rows[0].id, error: notificationError.message });
            // Don't fail request if notification fails
        }

        res.status(201).json({
            success: true,
            message: isArabic ? 'تم إرسال طلب الشراء بنجاح' : 'Purchase request submitted successfully',
            data: result.rows[0]
        });
    } catch (err) { next(err); }
};

// ─── Client: View my orders (with pagination) ───
exports.getMyOrders = async (req, res, next) => {
    try {
        const isArabic = req.language === 'ar';
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;

        const countResult = await pool.query(
            'SELECT COUNT(*) FROM orders WHERE client_id = $1', [req.user.id]
        );
        const totalCount = parseInt(countResult.rows[0].count);

        const result = await pool.query(`
            SELECT o.*,
                   p.title_ar, p.title_en, p.price,
                   l.name_ar AS location_name_ar, l.name_en AS location_name_en
            FROM orders o
            JOIN properties p ON o.property_id = p.id
            JOIN locations l ON p.location_id = l.id
            WHERE o.client_id = $1
            ORDER BY o.created_at DESC
            LIMIT $2 OFFSET $3
        `, [req.user.id, limit, offset]);

        const data = result.rows.map(o => ({
            ...o,
            property_title: isArabic ? o.title_ar : (o.title_en || o.title_ar),
            location_name: isArabic ? o.location_name_ar : o.location_name_en,
        }));

        res.json(paginatedResponse(data, totalCount, { page, limit }));
    } catch (err) { next(err); }
};

// ─── Admin: View all orders (with pagination) ───
exports.getAllOrders = async (req, res, next) => {
    try {
        const isArabic = req.language === 'ar';
        const { status } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;

        let countQuery = 'SELECT COUNT(*) FROM orders';
        let query = `
            SELECT o.*,
                   p.title_ar, p.title_en,
                   u.first_name, u.last_name, u.email, u.phone_number
            FROM orders o
            JOIN properties p ON o.property_id = p.id
            JOIN users u ON o.client_id = u.id
        `;
        const params = [];
        let paramIndex = 1;

        if (status) {
            const whereClause = ` WHERE o.status = $${paramIndex++}`;
            countQuery += whereClause.replace('o.', '');
            query += whereClause;
            params.push(status);
        }

        const countResult = await pool.query(countQuery, params);
        const totalCount = parseInt(countResult.rows[0].count);

        query += ' ORDER BY o.created_at DESC';
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        const data = result.rows.map(o => ({
            ...o,
            property_title: isArabic ? o.title_ar : (o.title_en || o.title_ar),
            client_name: `${o.first_name} ${o.last_name}`,
        }));

        res.json(paginatedResponse(data, totalCount, { page, limit }));
    } catch (err) { next(err); }
};

// ─── Admin: Update order status ───
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error, value } = updateOrderStatusSchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        const { status } = value;
        const isArabic = req.language === 'ar';

        // Get order details before update
        const orderBefore = await pool.query(
            `SELECT o.*, p.title_ar, p.title_en, u.id as client_id, u.first_name, u.last_name
             FROM orders o
             JOIN properties p ON o.property_id = p.id
             JOIN users u ON o.client_id = u.id
             WHERE o.id = $1`,
            [id]
        );

        if (orderBefore.rows.length === 0) {
            const err = new Error(isArabic ? 'الطلب غير موجود' : 'Order not found');
            err.statusCode = 404; throw err;
        }

        const order = orderBefore.rows[0];
        const propertyTitle = isArabic ? order.title_ar : order.title_en;

        const result = await pool.query(
            'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (req.audit) await req.audit(status, 'order', id, { new_status: status });

        // Send notifications based on status change
        let notificationSent = false;
        try {
            if (status === 'accepted') {
                await createNotification(order.client_id, 'order_accepted', {
                    title_ar: 'تم قبول طلبك ✓',
                    title_en: 'Your Order Accepted ✓',
                    message_ar: `تم قبول طلبك لشراء "${propertyTitle}" من الإدارة. يرجى الاتصال لتأكيد تفاصيل الدفع`,
                    message_en: `Your order for "${propertyTitle}" has been accepted. Please contact us to confirm payment details`
                }, 'order', id);
                notificationSent = true;
            } else if (status === 'rejected') {
                await createNotification(order.client_id, 'order_rejected', {
                    title_ar: 'تم رفض طلبك',
                    title_en: 'Your Order Rejected',
                    message_ar: `تم رفض طلبك لشراء "${propertyTitle}". يرجى التواصل معنا للمزيد من المعلومات`,
                    message_en: `Your order for "${propertyTitle}" has been rejected. Please contact us for more information`
                }, 'order', id);
                notificationSent = true;
            } else if (status === 'completed') {
                await createNotification(order.client_id, 'order_completed', {
                    title_ar: 'تم إكمال طلبك',
                    title_en: 'Your Order Completed',
                    message_ar: `تم إكمال عملية شراء "${propertyTitle}" بنجاح. شكراً لاستخدامك عقارك`,
                    message_en: `Your purchase of "${propertyTitle}" has been completed successfully. Thank you for using Aqarak`
                }, 'order', id);
                notificationSent = true;
            }
        } catch (notificationError) {
            logger.error('Failed to send order notification', { orderId: id, status, error: notificationError.message });
            // Don't fail request if notification fails
        }

        const messages = {
            accepted: isArabic ? 'تم قبول الطلب' : 'Order accepted',
            rejected: isArabic ? 'تم رفض الطلب' : 'Order rejected',
            completed: isArabic ? 'تم إتمام الطلب' : 'Order completed',
        };

        res.json({
            success: true,
            message: messages[status],
            data: result.rows[0],
            notification_sent: notificationSent
        });
    } catch (err) { next(err); }
};

// ─── Admin: Create invoice for an order ───
exports.createInvoice = async (req, res, next) => {
    try {
        const { error, value } = createInvoiceSchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        const { order_id, amount, due_date, payment_method } = value;
        const isArabic = req.language === 'ar';

        const order = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);
        if (order.rows.length === 0) {
            const err = new Error(isArabic ? 'الطلب غير موجود' : 'Order not found');
            err.statusCode = 404; throw err;
        }

        const result = await pool.query(`
            INSERT INTO invoices (order_id, amount, due_date, payment_method, status)
            VALUES ($1, $2, $3, $4, 'unpaid')
            RETURNING *
        `, [order_id, amount, due_date, payment_method || null]);

        if (req.audit) await req.audit('create', 'invoice', result.rows[0].id, { order_id, amount });

        res.status(201).json({
            success: true,
            message: isArabic ? 'تم إنشاء الفاتورة بنجاح' : 'Invoice created successfully',
            data: result.rows[0]
        });
    } catch (err) { next(err); }
};

// ─── Admin: View all invoices (with pagination) ───
exports.getAllInvoices = async (req, res, next) => {
    try {
        const { status } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;

        let countQuery = 'SELECT COUNT(*) FROM invoices';
        let query = `
            SELECT i.*, o.client_id, o.property_id,
                   u.first_name, u.last_name, u.email
            FROM invoices i
            JOIN orders o ON i.order_id = o.id
            JOIN users u ON o.client_id = u.id
        `;
        const params = [];
        let paramIndex = 1;

        if (status) {
            const whereClause = ` WHERE i.status = $${paramIndex++}`;
            countQuery += whereClause.replace('i.', '');
            query += whereClause;
            params.push(status);
        }

        const countResult = await pool.query(countQuery, params);
        const totalCount = parseInt(countResult.rows[0].count);

        query += ' ORDER BY i.due_date ASC';
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        const data = result.rows.map(inv => ({
            ...inv,
            client_name: `${inv.first_name} ${inv.last_name}`,
        }));

        res.json(paginatedResponse(data, totalCount, { page, limit }));
    } catch (err) { next(err); }
};

// ─── Admin: Update invoice status ───
exports.updateInvoiceStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error, value } = updateInvoiceStatusSchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        const { status } = value;
        const isArabic = req.language === 'ar';

        const result = await pool.query(
            'UPDATE invoices SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            const err = new Error(isArabic ? 'الفاتورة غير موجودة' : 'Invoice not found');
            err.statusCode = 404; throw err;
        }

        if (req.audit) await req.audit(status, 'invoice', id, { new_status: status });

        const messages = {
            paid: isArabic ? 'تم تأكيد الدفع' : 'Payment confirmed',
            overdue: isArabic ? 'تم تحديث الفاتورة كمتأخرة' : 'Invoice marked as overdue',
            cancelled: isArabic ? 'تم إلغاء الفاتورة' : 'Invoice cancelled',
        };

        res.json({ success: true, message: messages[status], data: result.rows[0] });
    } catch (err) { next(err); }
};
