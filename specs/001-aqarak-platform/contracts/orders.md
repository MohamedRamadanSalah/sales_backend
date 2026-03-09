# API Contracts: Orders

**Base Path**: `/api/orders`

## POST /api/orders

Submit a purchase order for a property.

**Auth**: Required (client)
**Rate Limit**: `apiLimiter`

**Validation**: Cannot order own property (client_id ≠ property.user_id)

**Request Body**:
```json
{
  "property_id": "int (required)",
  "total_amount": "decimal (required)",
  "notes": "string (optional)"
}
```

**Success Response** `201`:
```json
{
  "message": "Order submitted",
  "order": { "id": 1, "status": "pending", "..." }
}
```

**Error**: `400` (self-order), `404` (property not found/not approved)

---

## GET /api/orders

List orders. Clients see their own; admin sees all.

**Auth**: Required

**Success Response** `200`:
```json
{
  "orders": [{ "id": 1, "property": { "..." }, "status": "pending", "..." }],
  "pagination": { "..." }
}
```

---

## GET /api/orders/:id

Get single order with invoice details.

**Auth**: Required (owner or admin)

**Success Response** `200`:
```json
{
  "order": { "...all fields...", "invoice": { "..." } }
}
```

---

## PATCH /api/orders/:id/status

Admin: accept/reject/complete an order.

**Auth**: Required (admin only)

**Request Body**:
```json
{ "status": "accepted|rejected|completed" }
```

**Side Effects**:
- `accepted` → Invoice is auto-generated
- `completed` → Admin confirms offline payment received

**Success Response** `200`:
```json
{
  "message": "Order status updated",
  "order": { "id": 1, "status": "accepted" },
  "invoice": { "..." }
}
```
