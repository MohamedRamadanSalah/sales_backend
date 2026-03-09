# API Contracts: Locations

**Base Path**: `/api/locations`

## GET /api/locations

List locations by type or parent hierarchy.

**Auth**: Optional (public)
**Rate Limit**: `apiLimiter`

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| type | string | `governorate`, `city`, or `neighborhood` |
| parent_id | int | Filter children of a parent location |

**Success Response** `200`:
```json
{
  "locations": [
    { "id": 1, "name_ar": "القاهرة", "name_en": "Cairo", "type": "governorate", "parent_id": null }
  ]
}
```

---

## GET /api/locations/:id

Get single location with parent chain.

**Auth**: Optional

**Success Response** `200`:
```json
{
  "location": { "id": 3, "name_ar": "...", "type": "neighborhood", "parent": { "..." } }
}
```

---

## POST /api/locations

Admin: create new location.

**Auth**: Required (admin only)

**Request Body**:
```json
{
  "name_ar": "string (required)",
  "name_en": "string (required)",
  "type": "governorate|city|neighborhood (required)",
  "parent_id": "int (required for city/neighborhood)"
}
```

**Success Response** `201`:
```json
{ "message": "Location created", "location": { "..." } }
```
