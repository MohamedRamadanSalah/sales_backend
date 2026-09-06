'use strict';

const { pool } = require('../db');
const { paginatedResponse } = require('../middlewares/pagination');
const {
    createOrderSchema,
    updateOrderStatusSchema,
    createInvoiceSchema,
    updateInvoiceStatusSchema,
    sellerApprovalSchema,
    adminApprovalSchema,
} = require('../validations/orderValidation');
const { createNotification } = require('../utils/notify');
const logger = require('../utils/logger');
const { buildDetailedInvoice, scopeInvoiceForViewer } = require('../utils/invoiceBuilder');
const {
    canTransitionApproval,
    canTransitionPayment,
    sellerActionToStatus,
    adminActionToStatus,
    SELLER_ACTION_REQUIRED_STATE,
    ADMIN_ACTION_REQUIRED_STATES,
} = require('../utils/invoiceStateMachine');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetches the order + property seller_id needed for ownership checks.
 * Returns null if the order does not exist.
 */
async function fetchOrderOwnership(db, orderId) {
    const res = await db.query(
        `SELECT o.client_id, p.user_id AS seller_id
         FROM orders o
         JOIN properties p ON o.property_id = p.id
         WHERE o.id = $1`,
        [orderId]
    );
    return res.rows[0] || null;
}

/**
 * Determines the caller's relationship to this invoice.
 * @returns {'admin'|'buyer'|'seller'|null}
 */
function resolveViewerRole(user, ownership) {
    if (!ownership) return null;
    if (user.role === 'admin') return 'admin';
    if (user.id === ownership.client_id) return 'buyer';
    if (user.id === ownership.seller_id) return 'seller';
    return null;
}

/**
 * Maps internal invoice approval states to buyer-facing display labels.
 * Buyers should not see internal states like 'blocked_pending_review'.
 * @param {string} status - Raw approval_status from DB
 * @param {boolean} isSeller - Sellers see slightly more detail
 */
function mapApprovalStatusForDisplay(status, isSeller) {
    if (isSeller) return status; // Sellers see the real state
    const buyerMap = {
        draft:                  'pending',
        pending_seller:         'awaiting_seller_review',
        seller_approved:        'awaiting_admin_review',
        seller_rejected:        'rejected',
        pending_admin:          'under_review',
        blocked_pending_review: 'under_review',  // Don't alarm the buyer
        admin_approved:         'approved',
        admin_rejected:         'rejected',
        fully_approved:         'approved',
        voided:                 'cancelled',
    };
    return buyerMap[status] || status;
}

// ─── Client: Preview Checkout Invoice (no DB write) ──────────────────────────
exports.previewInvoice = async (req, res, next) => {
    try {
        const { property_id } = req.params;
        const client_id = req.user.id;

        const propertyRes = await pool.query(
            `SELECT p.*, l.name_ar AS loc_ar, l.name_en AS loc_en
             FROM properties p
             JOIN locations l ON p.location_id = l.id
             WHERE p.id = $1 AND p.deleted_at IS NULL`,
            [property_id]
        );
        if (propertyRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }
        const property = propertyRes.rows[0];

        // Prevent a seller from previewing their own property's checkout
        if (property.user_id === client_id) {
            return res.status(403).json({ success: false, error: 'You cannot preview checkout for your own property.' });
        }

        const [buyerRes, sellerRes] = await Promise.all([
            pool.query('SELECT first_name, last_name, email, phone_number FROM users WHERE id = $1', [client_id]),
            pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [property.user_id]), // Seller: name only for preview
        ]);

        const buyer = buyerRes.rows[0];
        const seller = sellerRes.rows[0];

        // Seller object for preview — only name exposed to buyer in preview
        const sellerForPreview = {
            first_name: seller.first_name,
            last_name: seller.last_name,
            email: null,
            phone_number: null,
        };

        const { detailedData } = buildDetailedInvoice({
            invoiceDbId: null,
            order: { client_id },
            property,
            buyer,
            seller: sellerForPreview,
            nationalId: null,
            address: null,
            paymentMethod: null,
            isPreview: true,
        });

        // Apply buyer scoping to the preview (buyer only sees what they're entitled to)
        const scoped = scopeInvoiceForViewer(detailedData, 'buyer');

        res.json({ success: true, data: scoped });
    } catch (err) { next(err); }
};

// ─── Client: Create a purchase request (atomic) ──────────────────────────────
exports.createOrder = async (req, res, next) => {
    const db = await pool.connect();
    try {
        const { error, value } = createOrderSchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        const { property_id, notes, national_id, address, payment_method } = value;
        const client_id = req.user.id;
        const isArabic = req.language === 'ar';

        await db.query('BEGIN');

        // ── 1. Verify property exists and is approved ──
        const propertyRes = await db.query(
            `SELECT p.*, l.name_ar AS loc_ar, l.name_en AS loc_en
             FROM properties p
             JOIN locations l ON p.location_id = l.id
             WHERE p.id = $1 AND p.deleted_at IS NULL`,
            [property_id]
        );
        if (propertyRes.rows.length === 0) {
            const err = new Error(isArabic ? 'العقار غير موجود' : 'Property not found');
            err.statusCode = 404; throw err;
        }
        const property = propertyRes.rows[0];

        if (property.status !== 'approved') {
            const err = new Error(isArabic ? 'هذا العقار غير متاح للشراء حالياً' : 'This property is not available for purchase');
            err.statusCode = 400; throw err;
        }

        if (property.user_id === client_id) {
            const err = new Error(isArabic ? 'لا يمكنك طلب شراء عقارك الخاص' : 'You cannot order your own property');
            err.statusCode = 400; throw err;
        }

        // ── 2. Prevent duplicate orders — FOR UPDATE (not SKIP LOCKED) so concurrent
        //       requests wait and correctly see the existing order after the first commits.
        const existingOrder = await db.query(
            `SELECT id FROM orders
             WHERE client_id = $1 AND property_id = $2 AND status IN ('pending', 'accepted')
             FOR UPDATE`,
            [client_id, property_id]
        );
        if (existingOrder.rows.length > 0) {
            const err = new Error(isArabic ? 'لديك طلب موجود بالفعل لهذا العقار' : 'You already have an active order for this property');
            err.statusCode = 409; throw err;
        }

        // ── 3. Fetch buyer details (seller PII never leaves the server for this response) ──
        const [buyerRes, sellerRes] = await Promise.all([
            db.query('SELECT first_name, last_name, email, phone_number FROM users WHERE id = $1', [client_id]),
            db.query('SELECT first_name, last_name, email, phone_number FROM users WHERE id = $1', [property.user_id]),
        ]);
        const buyer = buyerRes.rows[0];
        const seller = sellerRes.rows[0];

        // ── 4. Create order (with seller_notified flag for consistency) ──
        const orderResult = await db.query(
            `INSERT INTO orders (client_id, property_id, total_amount, status, notes)
             VALUES ($1, $2, $3, 'pending', $4)
             RETURNING *`,
            [client_id, property_id, property.price, notes || null]
        );
        const orderId = orderResult.rows[0].id;

        // ── 5. Build the full invoice JSON (shared builder, no duplication) ──
        const { detailedData, totalWithFees } = buildDetailedInvoice({
            invoiceDbId: null, // We don't have the DB ID yet
            order: orderResult.rows[0],
            property,
            buyer,
            seller,
            nationalId: national_id,
            address,
            paymentMethod: payment_method,
            isPreview: false,
        });

        // ── 6. Insert invoice (all fields consistent: amount = base, total_with_fees = true total) ──
        const invoiceResult = await db.query(
            `INSERT INTO invoices
                (order_id, amount, total_with_fees, due_date, payment_method, status, approval_status, detailed_data)
             VALUES ($1, $2, $3, CURRENT_DATE + INTERVAL '3 days', $4, 'unpaid', 'pending_seller', $5)
             RETURNING *`,
            [orderId, property.price, totalWithFees, payment_method || null, detailedData]
        );
        const invoice = invoiceResult.rows[0];

        // ── 7. Fix invoice_id inside JSON to use real DB ID, update in same transaction ──
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const day = String(new Date().getDate()).padStart(2, '0');
        detailedData.invoice_metadata.invoice_id = `INV-${year}${month}${day}-${String(invoice.id).padStart(4, '0')}`;
        detailedData.invoice_metadata.status = 'PENDING_APPROVAL';

        await db.query(
            'UPDATE invoices SET detailed_data = $1 WHERE id = $2',
            [detailedData, invoice.id]
        );

        await db.query('COMMIT');

        // ── 8. Audit log ──
        if (req.audit) {
            await req.audit('create', 'order', orderId, { property_id, amount: property.price, total_with_fees: totalWithFees });
        }

        // ── 9. Notify seller (outside transaction — failure doesn't roll back the order) ──
        try {
            await createNotification(property.user_id, 'order_received', {
                title_ar: 'طلب شراء جديد',
                title_en: 'New Purchase Order',
                message_ar: `تم استلام طلب شراء وفاتورة قيد مراجعتك لعقارك "${property.title_ar}"`,
                message_en: `A new purchase order and invoice awaiting your review for "${property.title_en || property.title_ar}"`,
            }, 'order', orderId);
        } catch (notifyErr) {
            logger.error('Failed to notify seller of new order', { orderId, error: notifyErr.message });
        }

        res.status(201).json({
            success: true,
            message: isArabic ? 'تم إنشاء الطلب والفاتورة بنجاح' : 'Order and invoice created successfully',
            data: { ...orderResult.rows[0], invoice_id: invoice.id },
        });
    } catch (err) {
        await db.query('ROLLBACK').catch(() => {});
        next(err);
    } finally {
        db.release();
    }
};

// ─── Client: Cancel a pending order (before seller approves) ──────────────────────────────────────
exports.cancelOrder = async (req, res, next) => {
    const db = await pool.connect();
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const isArabic = req.language === 'ar';

        await db.query('BEGIN');

        // ── 1. Lock order and verify ownership ──
        const orderRes = await db.query(
            `SELECT o.*, p.title_ar, p.title_en, p.user_id AS seller_id
             FROM orders o
             JOIN properties p ON o.property_id = p.id
             WHERE o.id = $1 FOR UPDATE OF o`,
            [id]
        );
        if (orderRes.rows.length === 0) {
            const err = new Error(isArabic ? 'الطلب غير موجود' : 'Order not found');
            err.statusCode = 404; throw err;
        }
        const order = orderRes.rows[0];

        if (order.client_id !== userId) {
            const err = new Error(isArabic ? 'غير مصرح لك' : 'Forbidden');
            err.statusCode = 403; throw err;
        }

        if (order.status !== 'pending') {
            const err = new Error(
                isArabic
                    ? 'لا يمكن إلغاء الطلب في حالته الحالية'
                    : `Cannot cancel an order with status "${order.status}". Only pending orders can be cancelled.`
            );
            err.statusCode = 422; throw err;
        }

        // ── 2. Check invoice — only cancel if seller hasn\'t approved yet ──
        const invoiceRes = await db.query(
            'SELECT id, approval_status FROM invoices WHERE order_id = $1 FOR UPDATE',
            [id]
        );
        if (invoiceRes.rows.length > 0) {
            const invoice = invoiceRes.rows[0];
            const cancellableStates = ['draft', 'pending_seller'];
            if (!cancellableStates.includes(invoice.approval_status)) {
                const err = new Error(
                    isArabic
                        ? 'لا يمكن الإلغاء بعد موافقة البائع. يرجى التواصل مع الإدارة.'
                        : 'Cannot cancel after seller approval. Please contact admin.'
                );
                err.statusCode = 422; throw err;
            }
            await db.query(
                `UPDATE invoices
                 SET approval_status = 'seller_rejected', rejection_reason = 'Cancelled by buyer', updated_at = NOW()
                 WHERE id = $1`,
                [invoice.id]
            );
        }

        // ── 3. Set order to rejected ──
        await db.query(
            "UPDATE orders SET status = 'rejected', updated_at = NOW() WHERE id = $1",
            [id]
        );

        await db.query('COMMIT');

        if (req.audit) await req.audit('cancel', 'order', id, { cancelled_by: userId });

        // ── 4. Notify seller ──
        try {
            const propertyTitle = isArabic ? order.title_ar : (order.title_en || order.title_ar);
            await createNotification(order.seller_id, 'order_cancelled', {
                title_ar: 'تم إلغاء طلب الشراء',
                title_en: 'Purchase Order Cancelled',
                message_ar: `قام المشتري بإلغاء طلب الشراء لعقارك "${propertyTitle}"`,
                message_en: `The buyer has cancelled their purchase order for "${propertyTitle}"`,
            }, 'order', id);
        } catch (notifyErr) {
            logger.error('Failed to notify seller of cancellation', { error: notifyErr.message });
        }

        res.json({
            success: true,
            message: isArabic ? 'تم إلغاء الطلب بنجاح' : 'Order cancelled successfully',
        });
    } catch (err) {
        await db.query('ROLLBACK').catch(() => {});
        next(err);
    } finally {
        db.release();
    }
};

// ─── Client / Seller: View my orders (scoped per role) ──────────────────────
exports.getMyOrders = async (req, res, next) => {
    try {
        const isArabic = req.language === 'ar';
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        const userId = req.user.id;

        const countResult = await pool.query(
            `SELECT COUNT(*)
             FROM orders o
             JOIN properties p ON o.property_id = p.id
             WHERE o.client_id = $1 OR p.user_id = $1`,
            [userId]
        );
        const totalCount = parseInt(countResult.rows[0].count);

        const result = await pool.query(
            `SELECT
                o.id, o.property_id, o.total_amount, o.status, o.notes, o.created_at, o.updated_at,
                p.title_ar, p.title_en, p.price, p.user_id AS seller_id,
                l.name_ar AS location_name_ar, l.name_en AS location_name_en,
                -- Buyer name exposed to seller only (not full PII)
                CASE WHEN p.user_id = $1 THEN u.first_name ELSE NULL END AS buyer_first_name,
                CASE WHEN p.user_id = $1 THEN u.last_name  ELSE NULL END AS buyer_last_name,
                CASE WHEN p.user_id = $1 THEN true ELSE false END AS is_seller,
                i.id AS invoice_id, i.status AS invoice_status, i.approval_status
             FROM orders o
             JOIN properties p ON o.property_id = p.id
             JOIN locations l ON p.location_id = l.id
             JOIN users u ON o.client_id = u.id
             LEFT JOIN invoices i ON i.order_id = o.id
             WHERE o.client_id = $1 OR p.user_id = $1
             ORDER BY o.created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        const data = result.rows.map(o => ({
            ...o,
            property_title: isArabic ? o.title_ar : (o.title_en || o.title_ar),
            location_name: isArabic ? o.location_name_ar : o.location_name_en,
            // Map internal states to user-friendly labels
            approval_status_display: mapApprovalStatusForDisplay(o.approval_status, o.is_seller),
        }));

        res.json(paginatedResponse(data, totalCount, { page, limit }));
    } catch (err) { next(err); }
};

// ─── Admin: View all orders ───────────────────────────────────────────────────
exports.getAllOrders = async (req, res, next) => {
    try {
        const isArabic = req.language === 'ar';
        const { status } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;

        const params = [];
        let paramIndex = 1;
        let whereClause = '';

        if (status) {
            whereClause = ` WHERE o.status = $${paramIndex++}`;
            params.push(status);
        }

        const countQuery = `SELECT COUNT(*) FROM orders o${whereClause}`;
        const countResult = await pool.query(countQuery, params);
        const totalCount = parseInt(countResult.rows[0].count);

        const query = `
            SELECT
                o.*,
                p.title_ar, p.title_en,
                u.first_name, u.last_name, u.email, u.phone_number,
                i.id AS invoice_id, i.status AS invoice_status, i.approval_status, i.total_with_fees
            FROM orders o
            JOIN properties p ON o.property_id = p.id
            JOIN users u ON o.client_id = u.id
            LEFT JOIN invoices i ON i.order_id = o.id
            ${whereClause}
            ORDER BY o.created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
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

// ─── Admin: Update order status (with invoice sync) ──────────────────────────
exports.updateOrderStatus = async (req, res, next) => {
    const db = await pool.connect();
    try {
        const { id } = req.params;
        const { error, value } = updateOrderStatusSchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        const { status } = value;
        const isArabic = req.language === 'ar';

        await db.query('BEGIN');

        const orderBefore = await db.query(
            `SELECT o.*, p.title_ar, p.title_en, u.id AS client_id, u.first_name, u.last_name
             FROM orders o
             JOIN properties p ON o.property_id = p.id
             JOIN users u ON o.client_id = u.id
             WHERE o.id = $1
             FOR UPDATE`,
            [id]
        );
        if (orderBefore.rows.length === 0) {
            const err = new Error(isArabic ? 'الطلب غير موجود' : 'Order not found');
            err.statusCode = 404; throw err;
        }

        const order = orderBefore.rows[0];
        const propertyTitle = isArabic ? order.title_ar : order.title_en;

        const result = await db.query(
            'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, id]
        );

        // Sync invoice approval_status when order is rejected by admin
        // Route through proper intermediate rejection states (respects state machine)
        if (status === 'rejected') {
            const invoiceRow = await db.query(
                'SELECT id, approval_status FROM invoices WHERE order_id = $1',
                [id]
            );
            if (invoiceRow.rows.length > 0) {
                const inv = invoiceRow.rows[0];
                const currentApproval = inv.approval_status;
                if (currentApproval !== 'voided' && currentApproval !== 'fully_approved') {
                    // Map to the correct rejection path based on current state
                    let rejectState;
                    if (['draft', 'pending_seller', 'seller_approved'].includes(currentApproval)) {
                        rejectState = 'seller_rejected';
                    } else {
                        rejectState = 'admin_rejected'; // pending_admin, blocked_pending_review
                    }
                    await db.query(
                        `UPDATE invoices
                         SET approval_status = $1, rejection_reason = 'Order rejected by admin', updated_at = NOW()
                         WHERE id = $2`,
                        [rejectState, inv.id]
                    );
                }
            }
        }

        await db.query('COMMIT');

        if (req.audit) await req.audit(status, 'order', id, { new_status: status });

        // Notify buyer (outside transaction)
        try {
            const notifications = {
                accepted: {
                    type: 'order_accepted',
                    title_ar: 'تم قبول طلبك ✓',
                    title_en: 'Your Order Accepted ✓',
                    message_ar: `تم قبول طلبك لشراء "${propertyTitle}" من الإدارة`,
                    message_en: `Your order for "${propertyTitle}" has been accepted`,
                },
                rejected: {
                    type: 'order_rejected',
                    title_ar: 'تم رفض طلبك',
                    title_en: 'Your Order Rejected',
                    message_ar: `تم رفض طلبك لشراء "${propertyTitle}"`,
                    message_en: `Your order for "${propertyTitle}" has been rejected`,
                },
                completed: {
                    type: 'order_completed',
                    title_ar: 'تم إكمال طلبك',
                    title_en: 'Your Order Completed',
                    message_ar: `تمت عملية شراء "${propertyTitle}" بنجاح`,
                    message_en: `Your purchase of "${propertyTitle}" completed successfully`,
                },
            };
            const n = notifications[status];
            if (n) {
                await createNotification(order.client_id, n.type, {
                    title_ar: n.title_ar, title_en: n.title_en,
                    message_ar: n.message_ar, message_en: n.message_en,
                }, 'order', id);
            }
        } catch (notifyErr) {
            logger.error('Failed to send order status notification', { orderId: id, status, error: notifyErr.message });
        }

        const messages = {
            accepted: isArabic ? 'تم قبول الطلب' : 'Order accepted',
            rejected: isArabic ? 'تم رفض الطلب' : 'Order rejected',
            completed: isArabic ? 'تم إتمام الطلب' : 'Order completed',
        };

        res.json({ success: true, message: messages[status], data: result.rows[0] });
    } catch (err) {
        await db.query('ROLLBACK').catch(() => {});
        next(err);
    } finally {
        db.release();
    }
};

// ─── Admin: Create a standalone invoice for an order ─────────────────────────
exports.createInvoice = async (req, res, next) => {
    const db = await pool.connect();
    try {
        const { error, value } = createInvoiceSchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        const { order_id, amount, due_date, payment_method } = value;
        const isArabic = req.language === 'ar';

        await db.query('BEGIN');

        // ── 1. Verify order exists + lock it ──
        const orderRes = await db.query(
            `SELECT o.*, p.price, p.area_sqm, p.down_payment, p.installment_years,
                    p.listing_type, p.legal_status, p.finishing_type, p.title_ar, p.title_en,
                    p.user_id AS seller_user_id,
                    l.name_ar AS loc_ar, l.name_en AS loc_en
             FROM orders o
             JOIN properties p ON o.property_id = p.id
             JOIN locations l ON p.location_id = l.id
             WHERE o.id = $1
             FOR UPDATE OF o`,
            [order_id]
        );
        if (orderRes.rows.length === 0) {
            const err = new Error(isArabic ? 'الطلب غير موجود' : 'Order not found');
            err.statusCode = 404; throw err;
        }
        const order = orderRes.rows[0];

        // ── 2. Check for existing invoice (unique constraint backup) ──
        const existingInv = await db.query(
            'SELECT id FROM invoices WHERE order_id = $1',
            [order_id]
        );
        if (existingInv.rows.length > 0) {
            const err = new Error(
                isArabic ? 'يوجد فاتورة بالفعل لهذا الطلب' : 'An invoice already exists for this order'
            );
            err.statusCode = 409; throw err;
        }

        // ── 3. Fetch buyer + seller details ──
        const [buyerRes, sellerRes] = await Promise.all([
            db.query('SELECT first_name, last_name, email, phone_number FROM users WHERE id = $1', [order.client_id]),
            db.query('SELECT first_name, last_name, email, phone_number FROM users WHERE id = $1', [order.seller_user_id]),
        ]);
        const buyer = buyerRes.rows[0];
        const seller = sellerRes.rows[0];

        // ── 4. Build full detailed invoice data ──
        const { detailedData, totalWithFees } = buildDetailedInvoice({
            invoiceDbId: null,
            order,
            property: order, // JOINed fields are on the same row
            buyer,
            seller,
            nationalId: null,
            address: null,
            paymentMethod: payment_method,
            isPreview: false,
        });

        // ── 5. Insert invoice ──
        const result = await db.query(
            `INSERT INTO invoices
                (order_id, amount, total_with_fees, due_date, payment_method, status, approval_status, detailed_data)
             VALUES ($1, $2, $3, $4, $5, 'unpaid', 'pending_seller', $6)
             RETURNING *`,
            [order_id, amount, totalWithFees, due_date, payment_method || null, detailedData]
        );
        const invoice = result.rows[0];

        // ── 6. Patch invoice_id inside JSON now that we have the DB ID ──
        const now = new Date();
        const invNum = `INV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(invoice.id).padStart(4,'0')}`;
        detailedData.invoice_metadata.invoice_id = invNum;
        await db.query('UPDATE invoices SET detailed_data = $1 WHERE id = $2', [detailedData, invoice.id]);

        await db.query('COMMIT');

        if (req.audit) await req.audit('create', 'invoice', invoice.id, { order_id, amount });

        // ── 7. Notify seller ──
        try {
            await createNotification(order.seller_user_id, 'invoice_created_by_admin', {
                title_ar: 'فاتورة جديدة بانتظار مراجعتك',
                title_en: 'New Invoice Awaiting Your Review',
                message_ar: 'أنشأت الإدارة فاتورة تحتاج موافقتك.',
                message_en: 'Admin created an invoice that requires your approval.',
            }, 'invoice', invoice.id);
        } catch (notifyErr) {
            logger.error('Failed to notify seller of admin-created invoice', { error: notifyErr.message });
        }

        res.status(201).json({
            success: true,
            message: isArabic ? 'تم إنشاء الفاتورة بنجاح' : 'Invoice created successfully',
            data: invoice,
        });
    } catch (err) {
        await db.query('ROLLBACK').catch(() => {});
        next(err);
    } finally {
        db.release();
    }
};

// ─── Admin: View all invoices ─────────────────────────────────────────────────
exports.getAllInvoices = async (req, res, next) => {
    try {
        const { status, approval_status } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;

        const params = [];
        let paramIndex = 1;
        const conditions = [];

        if (status) {
            conditions.push(`i.status = $${paramIndex++}`);
            params.push(status);
        }
        if (approval_status) {
            conditions.push(`i.approval_status = $${paramIndex++}`);
            params.push(approval_status);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countResult = await pool.query(`SELECT COUNT(*) FROM invoices i ${whereClause}`, params);
        const totalCount = parseInt(countResult.rows[0].count);

        const query = `
            SELECT
                i.id, i.order_id, i.amount, i.total_with_fees, i.due_date,
                i.status, i.approval_status, i.payment_method, i.version,
                i.seller_approved_at, i.admin_approved_at, i.rejection_reason,
                i.created_at, i.updated_at,
                o.client_id, o.property_id,
                u.first_name, u.last_name, u.email
            FROM invoices i
            JOIN orders o ON i.order_id = o.id
            JOIN users u ON o.client_id = u.id
            ${whereClause}
            ORDER BY i.due_date ASC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        const data = result.rows.map(inv => ({
            ...inv,
            client_name: `${inv.first_name} ${inv.last_name}`,
        }));

        res.json(paginatedResponse(data, totalCount, { page, limit }));
    } catch (err) { next(err); }
};

// ─── Admin: Update invoice payment status (state-machine guarded) ─────────────
exports.updateInvoiceStatus = async (req, res, next) => {
    const db = await pool.connect();
    try {
        const { id } = req.params;
        const { error, value } = updateInvoiceStatusSchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        const { status } = value;
        const isArabic = req.language === 'ar';

        await db.query('BEGIN');

        // Lock the row to prevent concurrent payment updates
        const current = await db.query(
            'SELECT id, status, approval_status FROM invoices WHERE id = $1 FOR UPDATE',
            [id]
        );
        if (current.rows.length === 0) {
            const err = new Error(isArabic ? 'الفاتورة غير موجودة' : 'Invoice not found');
            err.statusCode = 404; throw err;
        }

        const currentStatus = current.rows[0].status;
        const approvalStatus = current.rows[0].approval_status;

        // Guard: payment can only be confirmed on fully_approved invoices
        if (status === 'paid' && approvalStatus !== 'fully_approved') {
            const err = new Error(
                isArabic
                    ? 'لا يمكن تأكيد الدفع قبل الموافقة الكاملة على الفاتورة'
                    : 'Payment cannot be confirmed until the invoice is fully approved'
            );
            err.statusCode = 422; throw err;
        }

        // Enforce state machine for payment transitions
        const { valid, error: transitionError } = canTransitionPayment(currentStatus, status);
        if (!valid) {
            const err = new Error(transitionError);
            err.statusCode = 422; throw err;
        }

        const result = await db.query(
            'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, id]
        );

        // ── Auto-complete the parent order when payment is confirmed ──
        if (status === 'paid') {
            const inv = result.rows[0];
            await db.query(
                `UPDATE orders SET status = 'completed', updated_at = NOW()
                 WHERE id = $1 AND status != 'completed'`,
                [inv.order_id]
            );
        }

        await db.query('COMMIT');

        if (req.audit) await req.audit(status, 'invoice', id, { new_status: status, previous_status: currentStatus });

        // ── Notify buyer and seller on payment status change ──
        if (status === 'paid') {
            try {
                const inv = result.rows[0];
                const ownershipForPay = await fetchOrderOwnership(pool, inv.order_id);
                if (ownershipForPay) {
                    const payNotif = {
                        type: 'payment_confirmed',
                        title_ar: 'تم تأكيد الدفع ✅',
                        title_en: 'Payment Confirmed ✅',
                        message_ar: 'تم تأكيد الدفع لفاتورتك بنجاح. تم إكمال الطلب.',
                        message_en: 'Payment for your invoice has been confirmed. Your order is now complete.',
                    };
                    await createNotification(ownershipForPay.client_id, payNotif.type, {
                        title_ar: payNotif.title_ar, title_en: payNotif.title_en,
                        message_ar: payNotif.message_ar, message_en: payNotif.message_en,
                    }, 'invoice', inv.id);
                    await createNotification(ownershipForPay.seller_id, payNotif.type, {
                        title_ar: payNotif.title_ar, title_en: payNotif.title_en,
                        message_ar: payNotif.message_ar, message_en: payNotif.message_en,
                    }, 'invoice', inv.id);
                }
            } catch (notifyErr) {
                logger.error('Failed to notify parties of payment', { error: notifyErr.message });
            }
        }

        const messages = {
            paid: isArabic ? 'تم تأكيد الدفع' : 'Payment confirmed',
            overdue: isArabic ? 'تم تحديث الفاتورة كمتأخرة' : 'Invoice marked as overdue',
            cancelled: isArabic ? 'تم إلغاء الفاتورة' : 'Invoice cancelled',
        };

        res.json({ success: true, message: messages[status], data: result.rows[0] });
    } catch (err) {
        await db.query('ROLLBACK').catch(() => {});
        next(err);
    } finally {
        db.release();
    }
};

// ─── Shared: Get detailed invoice with role-scoped response ───────────────────
exports.getDetailedInvoice = async (req, res, next) => {
    try {
        const orderId = req.params.id;
        const isArabic = req.language === 'ar';

        // Resolve ownership before touching invoice data
        const ownership = await fetchOrderOwnership(pool, orderId);
        if (!ownership) {
            const err = new Error(isArabic ? 'الطلب غير موجود' : 'Order not found');
            err.statusCode = 404; throw err;
        }

        const viewerRole = resolveViewerRole(req.user, ownership);
        if (!viewerRole) {
            const err = new Error(isArabic ? 'غير مصرح لك' : 'Forbidden');
            err.statusCode = 403; throw err;
        }

        const invoiceRes = await pool.query(
            'SELECT * FROM invoices WHERE order_id = $1',
            [orderId]
        );
        if (invoiceRes.rows.length === 0) {
            const err = new Error(isArabic ? 'لم يتم إصدار فاتورة لهذا الطلب بعد' : 'No invoice has been issued for this order yet');
            err.statusCode = 404; throw err;
        }

        const invoice = invoiceRes.rows[0];
        const detailedData = invoice.detailed_data;

        if (!detailedData) {
            const err = new Error(isArabic ? 'بيانات الفاتورة التفصيلية غير متوفرة' : 'Detailed invoice data is not yet available');
            err.statusCode = 404; throw err;
        }

        // Apply role-based scoping — the most critical security step
        const scoped = scopeInvoiceForViewer(detailedData, viewerRole);

        res.json({
            success: true,
            data: scoped,
            meta: {
                invoice_id: invoice.id,
                approval_status: invoice.approval_status,
                payment_status: invoice.status,
                total_with_fees: invoice.total_with_fees,
                version: invoice.version,
            },
        });
    } catch (err) { next(err); }
};

// ─── Seller: Approve or Reject invoice (with locking) ────────────────────────
exports.sellerInvoiceApproval = async (req, res, next) => {
    const db = await pool.connect();
    try {
        const orderId = req.params.id;
        const { error, value } = sellerApprovalSchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        const { status, reason } = value;
        const isArabic = req.language === 'ar';

        await db.query('BEGIN');

        // ── Ownership check ──
        const ownership = await fetchOrderOwnership(db, orderId);
        if (!ownership) {
            const err = new Error('Order not found'); err.statusCode = 404; throw err;
        }
        if (req.user.id !== ownership.seller_id) {
            const err = new Error(isArabic ? 'غير مصرح لك' : 'Forbidden');
            err.statusCode = 403; throw err;
        }

        // ── Lock invoice row to prevent concurrent modifications ──
        const invoiceRes = await db.query(
            'SELECT * FROM invoices WHERE order_id = $1 FOR UPDATE',
            [orderId]
        );
        if (invoiceRes.rows.length === 0) {
            const err = new Error('Invoice not found'); err.statusCode = 404; throw err;
        }
        const invoice = invoiceRes.rows[0];

        // ── State machine guard ──
        if (invoice.approval_status !== SELLER_ACTION_REQUIRED_STATE) {
            const err = new Error(
                isArabic
                    ? `لا يمكن اتخاذ إجراء الآن. حالة الفاتورة الحالية: ${invoice.approval_status}`
                    : `Action not allowed. Current invoice approval status: "${invoice.approval_status}"`
            );
            err.statusCode = 422; throw err;
        }

        // ── Compute next state ──
        const nextApprovalStatus = sellerActionToStatus(status);
        const { valid, error: transitionError } = canTransitionApproval(invoice.approval_status, nextApprovalStatus);
        if (!valid) {
            const err = new Error(transitionError); err.statusCode = 422; throw err;
        }

        const now = new Date().toISOString();
        let detailedData = invoice.detailed_data || {};

        // Update JSON workflow section
        detailedData = {
            ...detailedData,
            approval_workflow: {
                ...detailedData.approval_workflow,
                seller_approval: {
                    status,
                    approved_at: status === 'APPROVED' ? now : null,
                    signature: null,
                },
                final_status: status === 'REJECTED' ? 'REJECTED' : detailedData.approval_workflow?.final_status || 'PENDING',
                rejection_reason: status === 'REJECTED' ? reason : (detailedData.approval_workflow?.rejection_reason || null),
            },
            audit_trail: {
                ...detailedData.audit_trail,
                last_modified_at: now,
                modification_history: [
                    ...(detailedData.audit_trail?.modification_history || []),
                    {
                        timestamp: now,
                        action: `Seller ${status}`,
                        by: `Seller ID: ${req.user.id}`,
                        details: reason || null,
                    },
                ],
            },
        };

        // ── Atomic update with version bump ──
        const updateResult = await db.query(
            `UPDATE invoices
             SET approval_status   = $1,
                 detailed_data     = $2,
                 version           = version + 1,
                 seller_approved_at = $3,
                 rejection_reason  = $4,
                 updated_at        = NOW()
             WHERE id = $5 AND version = $6
             RETURNING *`,
            [
                nextApprovalStatus,
                detailedData,
                status === 'APPROVED' ? now : null,
                status === 'REJECTED' ? reason : null,
                invoice.id,
                invoice.version,
            ]
        );

        if (updateResult.rowCount === 0) {
            // Another request modified this invoice between our SELECT and UPDATE
            const err = new Error(
                isArabic
                    ? 'تم تعديل الفاتورة في نفس الوقت. يرجى إعادة المحاولة.'
                    : 'Concurrent modification detected. Please retry.'
            );
            err.statusCode = 409; throw err;
        }

        await db.query('COMMIT');

        if (req.audit) await req.audit(`seller_${status.toLowerCase()}`, 'invoice', invoice.id, { orderId });

        // ── Notify buyer of seller decision ──
        try {
            const buyerNotif = status === 'APPROVED'
                ? {
                    type: 'seller_approved_invoice',
                    title_ar: 'البائع وافق على فاتورتك ✓',
                    title_en: 'Seller Approved Your Invoice ✓',
                    message_ar: 'وافق البائع على فاتورتك. هي الآن بانتظار مراجعة الإدارة.',
                    message_en: 'The seller approved your invoice. It is now pending admin review.',
                }
                : {
                    type: 'seller_rejected_invoice',
                    title_ar: 'البائع رفض الفاتورة',
                    title_en: 'Seller Rejected Your Invoice',
                    message_ar: `تم رفض فاتورتك من البائع. السبب: ${reason || 'غير محدد'}`,
                    message_en: `Your invoice was rejected by the seller. Reason: ${reason || 'Not specified'}`,
                };
            await createNotification(ownership.client_id, buyerNotif.type, {
                title_ar: buyerNotif.title_ar, title_en: buyerNotif.title_en,
                message_ar: buyerNotif.message_ar, message_en: buyerNotif.message_en,
            }, 'invoice', invoice.id);
        } catch (notifyErr) {
            logger.error('Failed to notify buyer of seller decision', { error: notifyErr.message });
        }

        // Return scoped data to the seller
        const scoped = scopeInvoiceForViewer(detailedData, 'seller');
        res.json({ success: true, data: scoped });
    } catch (err) {
        await db.query('ROLLBACK').catch(() => {});
        next(err);
    } finally {
        db.release();
    }
};

// ─── Admin: Approve, Reject, or Block invoice (with locking) ─────────────────
exports.adminInvoiceApproval = async (req, res, next) => {
    const db = await pool.connect();
    try {
        const orderId = req.params.id;
        const { error, value } = adminApprovalSchema.validate(req.body);
        if (error) { error.isJoi = true; throw error; }

        const { status, notes, reason, aml_check } = value;
        const isArabic = req.language === 'ar';

        await db.query('BEGIN');

        // Lock invoice row
        const invoiceRes = await db.query(
            'SELECT * FROM invoices WHERE order_id = $1 FOR UPDATE',
            [orderId]
        );
        if (invoiceRes.rows.length === 0) {
            const err = new Error('Invoice not found'); err.statusCode = 404; throw err;
        }
        const invoice = invoiceRes.rows[0];

        // ── State machine guard: admin can only act from allowed states ──
        if (!ADMIN_ACTION_REQUIRED_STATES.includes(invoice.approval_status)) {
            const err = new Error(
                isArabic
                    ? `لا يمكن اتخاذ إجراء الآن. حالة الفاتورة: ${invoice.approval_status}`
                    : `Action not allowed. Invoice approval status is "${invoice.approval_status}"`
            );
            err.statusCode = 422; throw err;
        }

        const nextApprovalStatus = adminActionToStatus(status);
        const { valid, error: transitionError } = canTransitionApproval(invoice.approval_status, nextApprovalStatus);
        if (!valid) {
            const err = new Error(transitionError); err.statusCode = 422; throw err;
        }

        const now = new Date().toISOString();
        let detailedData = invoice.detailed_data || {};

        const finalStatus = status === 'APPROVED' ? 'APPROVED'
            : status === 'REJECTED' ? 'REJECTED'
            : detailedData.approval_workflow?.final_status || 'PENDING';

        // Update JSON workflow section
        detailedData = {
            ...detailedData,
            approval_workflow: {
                ...detailedData.approval_workflow,
                admin_approval: {
                    status,
                    approved_at: status === 'APPROVED' ? now : null,
                    admin_id: req.user.id,
                    notes: notes || null,
                },
                final_status: finalStatus,
                rejection_reason: status === 'REJECTED'
                    ? (reason || notes)
                    : (detailedData.approval_workflow?.rejection_reason || null),
            },
            legal_compliance_flags: {
                ...detailedData.legal_compliance_flags,
                anti_money_laundering_check: aml_check || detailedData.legal_compliance_flags?.anti_money_laundering_check || 'pending',
                compliance_notes: notes || detailedData.legal_compliance_flags?.compliance_notes || null,
            },
            audit_trail: {
                ...detailedData.audit_trail,
                last_modified_at: now,
                modification_history: [
                    ...(detailedData.audit_trail?.modification_history || []),
                    {
                        timestamp: now,
                        action: `Admin ${status}`,
                        by: `Admin ID: ${req.user.id}`,
                        details: reason || notes || null,
                    },
                ],
            },
        };

        // ── Atomic update with version bump and optimistic lock ──
        const updateResult = await db.query(
            `UPDATE invoices
             SET approval_status       = $1,
                 detailed_data         = $2,
                 version               = version + 1,
                 admin_approved_at     = $3,
                 approved_by_admin_id  = $4,
                 rejection_reason      = $5,
                 updated_at            = NOW()
             WHERE id = $6 AND version = $7
             RETURNING *`,
            [
                nextApprovalStatus,
                detailedData,
                status === 'APPROVED' ? now : null,
                status === 'APPROVED' ? req.user.id : null,
                status === 'REJECTED' ? (reason || notes) : null,
                invoice.id,
                invoice.version,
            ]
        );

        if (updateResult.rowCount === 0) {
            const err = new Error(
                isArabic
                    ? 'تم تعديل الفاتورة في نفس الوقت. يرجى إعادة المحاولة.'
                    : 'Concurrent modification detected. Please retry.'
            );
            err.statusCode = 409; throw err;
        }

        await db.query('COMMIT');

        if (req.audit) await req.audit(`admin_${status.toLowerCase()}`, 'invoice', invoice.id, { orderId, notes });

        // ── Notify buyer AND seller of admin decision ──
        try {
            const ownershipForNotify = await fetchOrderOwnership(pool, orderId);
            if (ownershipForNotify) {
                const notifMap = {
                    APPROVED: {
                        type: 'invoice_fully_approved',
                        title_ar: 'تمت الموافقة الكاملة على الفاتورة ✅',
                        title_en: 'Invoice Fully Approved ✅',
                        message_ar: 'تمت الموافقة النهائية على فاتورتك. يمكنك المتابعة للدفع.',
                        message_en: 'Your invoice has been fully approved. You may proceed to payment.',
                    },
                    REJECTED: {
                        type: 'invoice_admin_rejected',
                        title_ar: 'تم رفض الفاتورة من الإدارة',
                        title_en: 'Invoice Rejected by Admin',
                        message_ar: `تم رفض الفاتورة. السبب: ${reason || notes || 'غير محدد'}`,
                        message_en: `Invoice rejected by admin. Reason: ${reason || notes || 'Not specified'}`,
                    },
                    BLOCKED_PENDING_REVIEW: {
                        type: 'invoice_blocked_review',
                        title_ar: 'الفاتورة محجوبة للمراجعة',
                        title_en: 'Invoice Blocked for Review',
                        message_ar: 'تم تعليق الفاتورة لمراجعة إضافية من الإدارة.',
                        message_en: 'Your invoice has been placed under additional admin review.',
                    },
                };
                const n = notifMap[status];
                if (n) {
                    await createNotification(ownershipForNotify.client_id, n.type, {
                        title_ar: n.title_ar, title_en: n.title_en,
                        message_ar: n.message_ar, message_en: n.message_en,
                    }, 'invoice', invoice.id);
                    await createNotification(ownershipForNotify.seller_id, n.type, {
                        title_ar: n.title_ar, title_en: n.title_en,
                        message_ar: n.message_ar, message_en: n.message_en,
                    }, 'invoice', invoice.id);
                }
            }
        } catch (notifyErr) {
            logger.error('Failed to notify parties of admin decision', { error: notifyErr.message });
        }

        // Admin always gets the full unscoped data back
        const scoped = scopeInvoiceForViewer(detailedData, 'admin');
        res.json({ success: true, data: scoped });
    } catch (err) {
        await db.query('ROLLBACK').catch(() => {});
        next(err);
    } finally {
        db.release();
    }
};
