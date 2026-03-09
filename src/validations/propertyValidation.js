const Joi = require('joi');

const createPropertySchema = Joi.object({
    category_id: Joi.number().integer().required(),
    location_id: Joi.number().integer().required(),
    project_id: Joi.number().integer().allow(null).optional(),
    developer_id: Joi.number().integer().allow(null).optional(),

    // Bilingual titles (Arabic required, English strongly recommended)
    title_ar: Joi.string().min(5).max(255).required(),
    title_en: Joi.string().min(5).max(255).allow('', null).optional(),
    description_ar: Joi.string().min(10).required(),
    description_en: Joi.string().min(10).allow('', null).optional(),

    // Real estate specs
    listing_type: Joi.string().valid('sale', 'rent').required(),
    property_origin: Joi.string().valid('primary', 'resale').required(),
    finishing_type: Joi.string().valid('core_and_shell', 'semi_finished', 'fully_finished', 'furnished').required(),
    legal_status: Joi.string().valid('registered', 'primary_contract', 'unregistered').required(),

    // Pricing
    price: Joi.number().positive().required(),
    currency: Joi.string().default('EGP'),
    down_payment: Joi.number().min(0).allow(null).optional(),
    installment_years: Joi.number().integer().min(0).default(0),
    delivery_date: Joi.date().allow(null).optional(),
    maintenance_deposit: Joi.number().min(0).allow(null).optional(),
    commission_percentage: Joi.number().min(0).max(100).default(0),

    // Physical specs
    area_sqm: Joi.number().positive().required(),
    bedrooms: Joi.number().integer().min(0).allow(null).optional(),
    bathrooms: Joi.number().integer().min(0).allow(null).optional(),
    floor_level: Joi.number().integer().allow(null).optional(),

    // Geolocation
    latitude: Joi.number().min(-90).max(90).allow(null).optional(),
    longitude: Joi.number().min(-180).max(180).allow(null).optional(),

    // Amenities (Array of amenity IDs)
    amenity_ids: Joi.array().items(Joi.number().integer()).optional(),
});

const updatePropertySchema = Joi.object({
    category_id: Joi.number().integer().optional(),
    location_id: Joi.number().integer().optional(),
    project_id: Joi.number().integer().allow(null).optional(),
    developer_id: Joi.number().integer().allow(null).optional(),
    title_ar: Joi.string().min(5).max(255).optional(),
    title_en: Joi.string().min(5).max(255).allow('', null).optional(),
    description_ar: Joi.string().min(10).optional(),
    description_en: Joi.string().min(10).allow('', null).optional(),
    listing_type: Joi.string().valid('sale', 'rent').optional(),
    property_origin: Joi.string().valid('primary', 'resale').optional(),
    finishing_type: Joi.string().valid('core_and_shell', 'semi_finished', 'fully_finished', 'furnished').optional(),
    legal_status: Joi.string().valid('registered', 'primary_contract', 'unregistered').optional(),
    price: Joi.number().positive().optional(),
    currency: Joi.string().optional(),
    down_payment: Joi.number().min(0).allow(null).optional(),
    installment_years: Joi.number().integer().min(0).optional(),
    delivery_date: Joi.date().allow(null).optional(),
    maintenance_deposit: Joi.number().min(0).allow(null).optional(),
    commission_percentage: Joi.number().min(0).max(100).optional(),
    area_sqm: Joi.number().positive().optional(),
    bedrooms: Joi.number().integer().min(0).allow(null).optional(),
    bathrooms: Joi.number().integer().min(0).allow(null).optional(),
    floor_level: Joi.number().integer().allow(null).optional(),
    latitude: Joi.number().min(-90).max(90).allow(null).optional(),
    longitude: Joi.number().min(-180).max(180).allow(null).optional(),
    amenity_ids: Joi.array().items(Joi.number().integer()).optional(),
}).min(1);

const updatePropertyStatusSchema = Joi.object({
    status: Joi.string().valid('approved', 'rejected', 'sold', 'rented', 'inactive').required(),
    reason: Joi.string().max(500).allow('', null).optional(),
});

module.exports = {
    createPropertySchema,
    updatePropertySchema,
    updatePropertyStatusSchema,
};
