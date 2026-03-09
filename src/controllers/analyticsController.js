const { pool } = require('../db');

// ─── OVERVIEW: Key metrics at a glance ───
exports.getOverview = async (req, res, next) => {
    try {
        const [users, properties, orders, invoices, revenue, activeListings] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM users WHERE deleted_at IS NULL'),
            pool.query('SELECT COUNT(*) FROM properties WHERE deleted_at IS NULL'),
            pool.query('SELECT COUNT(*) FROM orders'),
            pool.query('SELECT COUNT(*) FROM invoices'),
            pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM invoices WHERE status = 'paid'"),
            pool.query("SELECT COUNT(*) FROM properties WHERE status = 'approved' AND deleted_at IS NULL"),
        ]);

        const pendingApproval = await pool.query("SELECT COUNT(*) FROM properties WHERE status = 'pending_approval' AND deleted_at IS NULL");
        const pendingOrders = await pool.query("SELECT COUNT(*) FROM orders WHERE status = 'pending'");
        const overdueInvoices = await pool.query("SELECT COUNT(*) FROM invoices WHERE status = 'overdue'");

        const isArabic = req.language === 'ar';
        res.json({
            success: true,
            message: isArabic ? 'نظرة عامة على النظام' : 'System Overview',
            data: {
                total_users: parseInt(users.rows[0].count),
                total_properties: parseInt(properties.rows[0].count),
                total_orders: parseInt(orders.rows[0].count),
                total_invoices: parseInt(invoices.rows[0].count),
                total_revenue: parseFloat(revenue.rows[0].total),
                active_listings: parseInt(activeListings.rows[0].count),
                pending_approval: parseInt(pendingApproval.rows[0].count),
                pending_orders: parseInt(pendingOrders.rows[0].count),
                overdue_invoices: parseInt(overdueInvoices.rows[0].count),
            }
        });
    } catch (err) { next(err); }
};

// ─── REVENUE: Financial analytics ───
exports.getRevenueAnalytics = async (req, res, next) => {
    try {
        // Revenue by month (last 12 months)
        const monthlyRevenue = await pool.query(`
            SELECT
                TO_CHAR(DATE_TRUNC('month', i.created_at), 'YYYY-MM') AS month,
                COUNT(*) AS invoice_count,
                SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END) AS collected,
                SUM(CASE WHEN i.status IN ('unpaid', 'overdue') THEN i.amount ELSE 0 END) AS pending
            FROM invoices i
            WHERE i.created_at >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', i.created_at)
            ORDER BY month DESC
        `);

        // Overall financial summary
        const financials = await pool.query(`
            SELECT
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS total_collected,
                COALESCE(SUM(CASE WHEN status IN ('unpaid','overdue') THEN amount ELSE 0 END), 0) AS total_pending,
                COALESCE(SUM(amount), 0) AS total_billed,
                COUNT(*) AS total_invoices
            FROM invoices
        `);

        // Average property price
        const avgPrice = await pool.query(`
            SELECT
                COALESCE(AVG(price), 0) AS avg_price,
                COALESCE(MIN(price), 0) AS min_price,
                COALESCE(MAX(price), 0) AS max_price
            FROM properties WHERE deleted_at IS NULL
        `);

        res.json({
            success: true,
            data: {
                monthly_revenue: monthlyRevenue.rows.map(r => ({
                    month: r.month,
                    invoice_count: parseInt(r.invoice_count),
                    collected: parseFloat(r.collected),
                    pending: parseFloat(r.pending),
                })),
                financial_summary: {
                    total_collected: parseFloat(financials.rows[0].total_collected),
                    total_pending: parseFloat(financials.rows[0].total_pending),
                    total_billed: parseFloat(financials.rows[0].total_billed),
                    total_invoices: parseInt(financials.rows[0].total_invoices),
                },
                property_pricing: {
                    average_price: parseFloat(avgPrice.rows[0].avg_price),
                    min_price: parseFloat(avgPrice.rows[0].min_price),
                    max_price: parseFloat(avgPrice.rows[0].max_price),
                },
            }
        });
    } catch (err) { next(err); }
};

// ─── PROPERTIES: Breakdown by status, category, location, type ───
exports.getPropertyAnalytics = async (req, res, next) => {
    try {
        const [byStatus, byCategory, byLocation, byListingType, byOrigin, byFinishing] = await Promise.all([
            pool.query(`
                SELECT status, COUNT(*) AS count
                FROM properties WHERE deleted_at IS NULL
                GROUP BY status ORDER BY count DESC
            `),
            pool.query(`
                SELECT c.name_en AS category, c.name_ar AS category_ar, COUNT(*) AS count
                FROM properties p
                JOIN categories c ON p.category_id = c.id
                WHERE p.deleted_at IS NULL
                GROUP BY c.name_en, c.name_ar ORDER BY count DESC
            `),
            pool.query(`
                SELECT l.name_en AS location, l.name_ar AS location_ar, l.type AS location_type, COUNT(*) AS count,
                       ROUND(AVG(p.price)::numeric, 2) AS avg_price
                FROM properties p
                JOIN locations l ON p.location_id = l.id
                WHERE p.deleted_at IS NULL
                GROUP BY l.name_en, l.name_ar, l.type ORDER BY count DESC
                LIMIT 20
            `),
            pool.query(`
                SELECT listing_type, COUNT(*) AS count
                FROM properties WHERE deleted_at IS NULL
                GROUP BY listing_type
            `),
            pool.query(`
                SELECT property_origin, COUNT(*) AS count
                FROM properties WHERE deleted_at IS NULL
                GROUP BY property_origin
            `),
            pool.query(`
                SELECT finishing_type, COUNT(*) AS count
                FROM properties WHERE deleted_at IS NULL
                GROUP BY finishing_type ORDER BY count DESC
            `),
        ]);

        const isArabic = req.language === 'ar';
        res.json({
            success: true,
            data: {
                by_status: byStatus.rows.map(r => ({ status: r.status, count: parseInt(r.count) })),
                by_category: byCategory.rows.map(r => ({
                    category: isArabic ? r.category_ar : r.category,
                    count: parseInt(r.count),
                })),
                by_location: byLocation.rows.map(r => ({
                    location: isArabic ? r.location_ar : r.location,
                    location_type: r.location_type,
                    count: parseInt(r.count),
                    avg_price: parseFloat(r.avg_price),
                })),
                by_listing_type: byListingType.rows.map(r => ({ type: r.listing_type, count: parseInt(r.count) })),
                by_origin: byOrigin.rows.map(r => ({ origin: r.property_origin, count: parseInt(r.count) })),
                by_finishing: byFinishing.rows.map(r => ({ finishing: r.finishing_type, count: parseInt(r.count) })),
            }
        });
    } catch (err) { next(err); }
};

// ─── USERS: Growth and activity analytics ───
exports.getUserAnalytics = async (req, res, next) => {
    try {
        // User growth by month (last 12 months)
        const userGrowth = await pool.query(`
            SELECT
                TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
                COUNT(*) AS new_users
            FROM users
            WHERE created_at >= NOW() - INTERVAL '12 months' AND deleted_at IS NULL
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC
        `);

        // Users by role
        const byRole = await pool.query(`
            SELECT role, COUNT(*) AS count
            FROM users WHERE deleted_at IS NULL
            GROUP BY role ORDER BY count DESC
        `);

        // Most active users (most property listings)
        const topListers = await pool.query(`
            SELECT u.id, u.first_name, u.last_name, u.email, u.role,
                   COUNT(p.id) AS property_count
            FROM users u
            LEFT JOIN properties p ON u.id = p.user_id AND p.deleted_at IS NULL
            WHERE u.deleted_at IS NULL
            GROUP BY u.id, u.first_name, u.last_name, u.email, u.role
            ORDER BY property_count DESC
            LIMIT 10
        `);

        // Top buyers (most orders)
        const topBuyers = await pool.query(`
            SELECT u.id, u.first_name, u.last_name, u.email,
                   COUNT(o.id) AS order_count,
                   COALESCE(SUM(o.total_amount), 0) AS total_spent
            FROM users u
            LEFT JOIN orders o ON u.id = o.client_id
            WHERE u.deleted_at IS NULL
            GROUP BY u.id, u.first_name, u.last_name, u.email
            HAVING COUNT(o.id) > 0
            ORDER BY total_spent DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                user_growth: userGrowth.rows.map(r => ({
                    month: r.month,
                    new_users: parseInt(r.new_users),
                })),
                by_role: byRole.rows.map(r => ({ role: r.role, count: parseInt(r.count) })),
                top_listers: topListers.rows.map(r => ({
                    id: r.id,
                    name: `${r.first_name} ${r.last_name}`,
                    email: r.email,
                    role: r.role,
                    property_count: parseInt(r.property_count),
                })),
                top_buyers: topBuyers.rows.map(r => ({
                    id: r.id,
                    name: `${r.first_name} ${r.last_name}`,
                    email: r.email,
                    order_count: parseInt(r.order_count),
                    total_spent: parseFloat(r.total_spent),
                })),
            }
        });
    } catch (err) { next(err); }
};

// ─── ORDERS: Order analytics ───
exports.getOrderAnalytics = async (req, res, next) => {
    try {
        const [byStatus, recentOrders, conversionRate] = await Promise.all([
            pool.query(`
                SELECT status, COUNT(*) AS count
                FROM orders GROUP BY status ORDER BY count DESC
            `),
            pool.query(`
                SELECT o.id, o.status, o.total_amount, o.created_at,
                       u.first_name, u.last_name, u.email,
                       p.title_ar, p.title_en
                FROM orders o
                JOIN users u ON o.client_id = u.id
                JOIN properties p ON o.property_id = p.id
                ORDER BY o.created_at DESC LIMIT 20
            `),
            pool.query(`
                SELECT
                    COUNT(*) AS total_orders,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_orders,
                    ROUND(
                        COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100,
                        2
                    ) AS conversion_rate_pct
                FROM orders
            `),
        ]);

        const isArabic = req.language === 'ar';
        res.json({
            success: true,
            data: {
                by_status: byStatus.rows.map(r => ({ status: r.status, count: parseInt(r.count) })),
                recent_orders: recentOrders.rows.map(r => ({
                    id: r.id,
                    status: r.status,
                    total_amount: parseFloat(r.total_amount),
                    created_at: r.created_at,
                    client_name: `${r.first_name} ${r.last_name}`,
                    property_title: isArabic ? r.title_ar : (r.title_en || r.title_ar),
                })),
                conversion: {
                    total_orders: parseInt(conversionRate.rows[0].total_orders),
                    completed_orders: parseInt(conversionRate.rows[0].completed_orders),
                    conversion_rate_pct: parseFloat(conversionRate.rows[0].conversion_rate_pct || 0),
                },
            }
        });
    } catch (err) { next(err); }
};

// ─── LOCATIONS: Location-based analytics ───
exports.getLocationAnalytics = async (req, res, next) => {
    try {
        const isArabic = req.language === 'ar';

        // Properties per location with pricing
        const locationStats = await pool.query(`
            SELECT l.id, l.name_ar, l.name_en, l.type,
                   COUNT(p.id) AS property_count,
                   ROUND(AVG(p.price)::numeric, 2) AS avg_price,
                   ROUND(MIN(p.price)::numeric, 2) AS min_price,
                   ROUND(MAX(p.price)::numeric, 2) AS max_price,
                   COUNT(CASE WHEN p.status = 'approved' THEN 1 END) AS active_listings
            FROM locations l
            LEFT JOIN properties p ON l.id = p.location_id AND p.deleted_at IS NULL
            GROUP BY l.id, l.name_ar, l.name_en, l.type
            HAVING COUNT(p.id) > 0
            ORDER BY property_count DESC
            LIMIT 30
        `);

        // Most popular governorates (by order count)
        const popularGovernorates = await pool.query(`
            SELECT l.name_ar, l.name_en,
                   COUNT(o.id) AS order_count,
                   COALESCE(SUM(o.total_amount), 0) AS total_revenue
            FROM locations l
            JOIN properties p ON l.id = p.location_id
            JOIN orders o ON p.id = o.property_id
            WHERE l.type = 'governorate' OR l.parent_id IS NULL
            GROUP BY l.name_ar, l.name_en
            ORDER BY order_count DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                location_stats: locationStats.rows.map(r => ({
                    id: r.id,
                    name: isArabic ? r.name_ar : r.name_en,
                    type: r.type,
                    property_count: parseInt(r.property_count),
                    active_listings: parseInt(r.active_listings),
                    avg_price: parseFloat(r.avg_price || 0),
                    min_price: parseFloat(r.min_price || 0),
                    max_price: parseFloat(r.max_price || 0),
                })),
                popular_areas: popularGovernorates.rows.map(r => ({
                    name: isArabic ? r.name_ar : r.name_en,
                    order_count: parseInt(r.order_count),
                    total_revenue: parseFloat(r.total_revenue),
                })),
            }
        });
    } catch (err) { next(err); }
};

// ─── RECENT ACTIVITY: Audit log feed ───
exports.getRecentActivity = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        const result = await pool.query(`
            SELECT al.*,
                   u.first_name, u.last_name, u.email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT $1
        `, [Math.min(limit, 200)]);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows.map(r => ({
                id: r.id,
                action: r.action,
                entity: r.entity,
                entity_id: r.entity_id,
                details: r.details,
                ip_address: r.ip_address,
                user: r.first_name ? {
                    id: r.user_id,
                    name: `${r.first_name} ${r.last_name}`,
                    email: r.email,
                } : null,
                created_at: r.created_at,
            })),
        });
    } catch (err) { next(err); }
};
