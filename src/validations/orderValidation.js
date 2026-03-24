const Joi = require('joi');

const createOrderSchema = Joi.object({
    property_id: Joi.number().integer().required(),
    notes: Joi.string().allow('', null).optional(),
    national_id: Joi.string().allow('', null).optional(),
    address: Joi.string().allow('', null).optional(),
    payment_method: Joi.string().valid('bank_transfer', 'cash', 'credit_card', 'instapay', 'vodafone_cash').allow(null).optional(),
});

const updateOrderStatusSchema = Joi.object({
    status: Joi.string().valid('accepted', 'rejected', 'completed').required(),
});

const createInvoiceSchema = Joi.object({
    order_id: Joi.number().integer().required(),
    amount: Joi.number().positive().required(),
    due_date: Joi.date().required(),
    payment_method: Joi.string().valid('bank_transfer', 'cash', 'credit_card', 'instapay', 'vodafone_cash').allow(null).optional(),
});

const updateInvoiceStatusSchema = Joi.object({
    status: Joi.string().valid('paid', 'overdue', 'cancelled').required(),
});

module.exports = { createOrderSchema, updateOrderStatusSchema, createInvoiceSchema, updateInvoiceStatusSchema };
