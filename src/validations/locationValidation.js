const Joi = require('joi');

const createLocationSchema = Joi.object({
    name_ar: Joi.string().min(2).max(255).required(),
    name_en: Joi.string().min(2).max(255).required(),
    type: Joi.string().valid('governorate', 'city', 'neighborhood').required(),
    parent_id: Joi.number().integer().allow(null).optional(),
});

module.exports = {
    createLocationSchema,
};
