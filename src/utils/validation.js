const Joi = require('joi');

const validateUser = (data) => Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
}).unknown(true).validate(data);

const validateCompany = (data) => Joi.object({
    name: Joi.string().required(),
}).unknown(true).validate(data);

const validateCategory = (data) => Joi.object({
    name: Joi.string().required(),
}).unknown(true).validate(data);

const validateJob = (data) => Joi.object({
    company_id: Joi.string().required(),
    category_id: Joi.string().required(),
    title: Joi.string().required(),
    description: Joi.string().required(),
    location: Joi.string().required(),
}).unknown(true).validate(data);

module.exports = { validateUser, validateCompany, validateCategory, validateJob };