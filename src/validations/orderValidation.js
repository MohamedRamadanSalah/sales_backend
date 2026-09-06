const Joi = require('joi');

// ─── Order Creation ───────────────────────────────────────────────────────────
const createOrderSchema = Joi.object({
    property_id:    Joi.number().integer().required(),
    notes:          Joi.string().allow('', null).optional(),
    national_id:    Joi.string().min(5).max(30).required().messages({
        'any.required': 'National ID is required',
        'string.min': 'National ID must be at least 5 characters',
        'string.max': 'National ID must be at most 30 characters',
    }),
    address:        Joi.string().min(5).max(500).required().messages({
        'any.required': 'Address is required',
        'string.min': 'Address must be at least 5 characters',
    }),
    payment_method: Joi.string()
        .valid('bank_transfer', 'cash', 'credit_card', 'instapay', 'vodafone_cash')
        .allow(null)
        .optional(),
});

// ─── Admin: Update Order Status ───────────────────────────────────────────────
const updateOrderStatusSchema = Joi.object({
    status: Joi.string().valid('accepted', 'rejected', 'completed').required(),
});

// ─── Admin: Create a standalone Invoice ──────────────────────────────────────
const createInvoiceSchema = Joi.object({
    order_id:       Joi.number().integer().required(),
    amount:         Joi.number().positive().required(),
    due_date:       Joi.date().required(),
    payment_method: Joi.string()
        .valid('bank_transfer', 'cash', 'credit_card', 'instapay', 'vodafone_cash')
        .allow(null)
        .optional(),
});

// ─── Admin: Update Invoice Payment Status ────────────────────────────────────
const updateInvoiceStatusSchema = Joi.object({
    status: Joi.string().valid('paid', 'overdue', 'cancelled').required(),
});

// ─── Seller: Approve or Reject an Invoice ────────────────────────────────────
const sellerApprovalSchema = Joi.object({
    status: Joi.string().valid('APPROVED', 'REJECTED').required(),
    reason: Joi.string().min(20).when('status', {
        is: 'REJECTED',
        then: Joi.required().messages({
            'any.required': 'A rejection reason of at least 20 characters is required.',
            'string.min': 'Rejection reason must be at least 20 characters.',
        }),
        otherwise: Joi.optional(),
    }),
});

// ─── Admin: Approve, Reject, or Block an Invoice ─────────────────────────────
const adminApprovalSchema = Joi.object({
    status: Joi.string()
        .valid('APPROVED', 'REJECTED', 'BLOCKED_PENDING_REVIEW')
        .required(),
    notes: Joi.string().allow('', null).optional(),
    reason: Joi.string().when('status', {
        is: 'REJECTED',
        then: Joi.required().messages({
            'any.required': 'A rejection reason is required.',
        }),
        otherwise: Joi.optional(),
    }),
    aml_check: Joi.string().valid('passed', 'pending', 'flagged').optional(),
});

module.exports = {
    createOrderSchema,
    updateOrderStatusSchema,
    createInvoiceSchema,
    updateInvoiceStatusSchema,
    sellerApprovalSchema,
    adminApprovalSchema,
};
