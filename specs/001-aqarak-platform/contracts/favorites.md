# API Contracts: Favorites

**Base Path**: `/api/favorites`

## POST /api/favorites

Add property to favorites.

**Auth**: Required
**Rate Limit**: `apiLimiter`

**Request Body**:
```json
{ "property_id": "int (required)" }
```

**Success Response** `201`:
```json
{ "message": "Added to favorites" }
```

**Error**: `409` (already in favorites)

---

## GET /api/favorites

List user's favorite properties.

**Auth**: Required

**Success Response** `200`:
```json
{
  "favorites": [{ "id": 1, "property": { "..." }, "created_at": "..." }],
  "pagination": { "..." }
}
```

---

## DELETE /api/favorites/:propertyId

Remove property from favorites.

**Auth**: Required

**Success Response** `200`:
```json
{ "message": "Removed from favorites" }
```

**Error**: `404` (not in favorites)
