const Joi = require('joi');

const signupSchema = Joi.object({
    first_name: Joi.string().min(2).max(100).required(),
    last_name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone_number: Joi.string().min(10).max(50).required(),
    password: Joi.string().min(6).max(128).required(),
    preferred_language: Joi.string().valid('ar', 'en').default('ar'),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

module.exports = { signupSchema, loginSchema };
