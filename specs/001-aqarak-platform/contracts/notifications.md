# API Contracts: Notifications

**Base Path**: `/api/notifications`

**Note**: This is a NEW API that must be implemented.

## GET /api/notifications

List current user's notifications (newest first).

**Auth**: Required
**Rate Limit**: `apiLimiter`

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| page | int | Page number (default: 1) |
| limit | int | Items per page (default: 20) |
| unread_only | boolean | Filter unread only (default: false) |

**Success Response** `200`:
```json
{
  "notifications": [
    {
      "id": 1,
      "event_type": "property_approved",
      "title_ar": "تم قبول عقارك",
      "title_en": "Property Approved",
      "message_ar": "تم قبول عقارك \"شقة في التجمع\" من قبل الإدارة",
      "message_en": "Your property \"Apartment in Tagamoa\" has been approved",
      "reference_type": "property",
      "reference_id": 42,
      "is_read": false,
      "created_at": "2026-03-06T10:00:00Z"
    }
  ],
  "unread_count": 5,
  "pagination": { "page": 1, "limit": 20, "total": 12 }
}
```

---

## GET /api/notifications/count

Get unread notification count (for bell icon badge).

**Auth**: Required

**Success Response** `200`:
```json
{ "unread_count": 5 }
```

---

## PATCH /api/notifications/:id/read

Mark a single notification as read.

**Auth**: Required (notification owner)

**Success Response** `200`:
```json
{ "message": "Notification marked as read" }
```

---

## PATCH /api/notifications/read-all

Mark all notifications as read.

**Auth**: Required

**Success Response** `200`:
```json
{ "message": "All notifications marked as read" }
```
