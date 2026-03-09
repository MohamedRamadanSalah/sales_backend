# API Contracts: Analytics

**Base Path**: `/api/admin/analytics`

## GET /api/admin/analytics/overview

Get platform-wide KPIs.

**Auth**: Required (admin only)
**Rate Limit**: `apiLimiter`

**Success Response** `200`:
```json
{
  "total_users": 1500,
  "total_properties": 800,
  "properties_by_status": {
    "approved": 500, "pending_approval": 150, "rejected": 50,
    "sold": 60, "rented": 30, "inactive": 10
  },
  "total_orders": 200,
  "orders_by_status": {
    "pending": 50, "accepted": 80, "rejected": 30, "completed": 40
  },
  "total_revenue": 15000000.00
}
```

**Error**: `403` (non-admin)

---

## GET /api/admin/analytics/trends

Get time-series data for charts.

**Auth**: Required (admin only)

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| period | string | `daily`, `weekly`, `monthly` (default: `monthly`) |
| months | int | Number of months back (default: 12) |

**Success Response** `200`:
```json
{
  "property_trends": [{ "date": "2026-01", "count": 45 }],
  "order_trends": [{ "date": "2026-01", "count": 20 }],
  "user_trends": [{ "date": "2026-01", "count": 100 }]
}
```

---

## GET /api/admin/analytics/top-locations

Get most popular locations by property count.

**Auth**: Required (admin only)

**Success Response** `200`:
```json
{
  "locations": [
    { "id": 1, "name_ar": "القاهرة", "name_en": "Cairo", "property_count": 200 }
  ]
}
```
