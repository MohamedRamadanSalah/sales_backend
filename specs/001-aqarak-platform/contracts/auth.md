# API Contracts: Authentication

**Base Path**: `/api/auth`

## POST /api/auth/register

Register a new user account.

**Rate Limit**: `authLimiter`

**Request Body**:
```json
{
  "first_name": "string (required, max 100)",
  "last_name": "string (required, max 100)",
  "email": "string (required, valid email, unique)",
  "phone_number": "string (required, unique)",
  "password": "string (required, min 8 chars)"
}
```

**Success Response** `201`:
```json
{
  "message": "Registration successful",
  "user": { "id": 1, "first_name": "...", "last_name": "...", "email": "...", "role": "client" },
  "token": "jwt-token"
}
```

**Error Responses**: `400` (validation), `409` (duplicate email/phone)

---

## POST /api/auth/login

Authenticate and receive JWT.

**Rate Limit**: `authLimiter`

**Request Body**:
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Success Response** `200`:
```json
{
  "message": "Login successful",
  "user": { "id": 1, "first_name": "...", "role": "client" },
  "token": "jwt-token"
}
```

**Error Responses**: `401` (invalid credentials)

---

## POST /api/auth/logout

Blacklist current JWT token.

**Headers**: `Authorization: Bearer <token>` (required)

**Success Response** `200`:
```json
{ "message": "Logged out successfully" }
```

---

## POST /api/auth/forgot-password

Request password reset email.

**Rate Limit**: `strictLimiter`

**Request Body**:
```json
{ "email": "string (required)" }
```

**Success Response** `200`:
```json
{ "message": "Reset email sent if account exists" }
```

---

## POST /api/auth/reset-password

Reset password with token from email.

**Rate Limit**: `strictLimiter`

**Request Body**:
```json
{
  "token": "string (required)",
  "password": "string (required, min 8 chars)"
}
```

**Success Response** `200`:
```json
{ "message": "Password reset successful" }
```

**Error Responses**: `400` (invalid/expired token)
