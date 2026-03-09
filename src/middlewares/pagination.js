/**
 * Pagination Middleware
 * Parses ?page=1&limit=20 from query params and attaches to req.pagination
 */
const paginate = (defaultLimit = 20, maxLimit = 100) => {
    return (req, res, next) => {
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || defaultLimit;

        if (page < 1) page = 1;
        if (limit < 1) limit = defaultLimit;
        if (limit > maxLimit) limit = maxLimit;

        const offset = (page - 1) * limit;

        req.pagination = { page, limit, offset };
        next();
    };
};

/**
 * Helper to build paginated response
 */
const paginatedResponse = (data, totalCount, pagination) => {
    const totalPages = Math.ceil(totalCount / pagination.limit);
    return {
        success: true,
        count: data.length,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            totalCount,
            totalPages,
            hasNextPage: pagination.page < totalPages,
            hasPrevPage: pagination.page > 1,
        },
        data,
    };
};

module.exports = { paginate, paginatedResponse };
