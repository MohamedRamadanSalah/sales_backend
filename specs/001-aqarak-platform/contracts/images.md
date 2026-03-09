# API Contracts: Images

**Base Path**: `/api/properties`

## POST /api/properties/:id/images

Upload images for a property.

**Auth**: Required (property owner or admin)
**Rate Limit**: `apiLimiter`
**Content-Type**: `multipart/form-data`
**Max**: 10 images per property, 10MB total per request

**Request**: Form data with `images` field (file array)

**Success Response** `201`:
```json
{
  "message": "Images uploaded",
  "images": [
    { "id": 1, "image_url": "/uploads/...", "is_primary": true }
  ]
}
```

**Error**: `400` (too many images, file too large), `403` (not owner)

---

## DELETE /api/properties/:propertyId/images/:imageId

Delete a property image.

**Auth**: Required (property owner or admin)

**Success Response** `200`:
```json
{ "message": "Image deleted" }
```

---

## PATCH /api/properties/:propertyId/images/:imageId/primary

Set an image as the primary image.

**Auth**: Required (property owner or admin)

**Success Response** `200`:
```json
{ "message": "Primary image updated" }
```
