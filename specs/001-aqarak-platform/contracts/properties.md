# API Contracts: Properties

**Base Path**: `/api/properties`

## GET /api/properties

List approved properties with filters and pagination.

**Auth**: Optional (public access)
**Rate Limit**: `apiLimiter`

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| page | int | Page number (default: 1) |
| limit | int | Items per page (default: 10, max: 50) |
| category_id | int | Filter by category |
| location_id | int | Filter by location |
| listing_type | string | `sale` or `rent` |
| min_price | decimal | Minimum price |
| max_price | decimal | Maximum price |
| min_area | decimal | Minimum area (sqm) |
| max_area | decimal | Maximum area (sqm) |
| bedrooms | int | Number of bedrooms |
| finishing_type | string | Finishing type filter |
| sort | string | Sort field (default: `created_at`) |
| order | string | `asc` or `desc` (default: `desc`) |

**Success Response** `200`:
```json
{
  "properties": [...],
  "pagination": { "page": 1, "limit": 10, "total": 150, "pages": 15 }
}
```

---

## GET /api/properties/:id

Get single property details with images and amenities.

**Auth**: Optional

**Success Response** `200`:
```json
{
  "property": { "...all fields...", "images": [...], "amenities": [...] }
}
```

**Error**: `404` (not found or not approved for non-admin)

---

## POST /api/properties

Create new property listing (status: pending_approval).

**Auth**: Required (client/broker)
**Content-Type**: `multipart/form-data` (for image uploads)

**Request Body**: All property fields + images (max 10 files, max 10MB total)

**Success Response** `201`:
```json
{
  "message": "Property submitted for approval",
  "property": { "id": 1, "status": "pending_approval", "..." }
}
```

---

## PUT /api/properties/:id

Update property listing. If property was approved, status resets to pending_approval.

**Auth**: Required (owner or admin)

**Success Response** `200`:
```json
{
  "message": "Property updated",
  "property": { "...updated fields...", "status": "pending_approval" }
}
```

**Error**: `403` (not owner), `404` (not found)

---

## PATCH /api/properties/:id/status

Admin: change property status. Owner: deactivate only.

**Auth**: Required (admin for all transitions; owner for deactivate only)

**Request Body**:
```json
{ "status": "approved|rejected|inactive|sold|rented" }
```

**Success Response** `200`:
```json
{
  "message": "Property status updated",
  "property": { "id": 1, "status": "approved" }
}
```

**Error**: `403` (unauthorized transition)

---

## GET /api/properties/my

List current user's own properties (all statuses).

**Auth**: Required

**Success Response** `200`:
```json
{
  "properties": [...],
  "pagination": { "..." }
}
```

---

## GET /api/properties/pending

Admin: list all pending properties.

**Auth**: Required (admin only)

**Success Response** `200`:
```json
{
  "properties": [{ "...with status pending_approval..." }],
  "pagination": { "..." }
}
```
