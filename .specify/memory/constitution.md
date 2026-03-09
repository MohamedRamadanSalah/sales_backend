<!--
Sync Impact Report
===========================
- Version change: 0.0.0 → 1.0.0
- Modified principles: N/A (initial creation)
- Added sections:
  - Core Principles (I–VII)
  - Technology Stack & Constraints
  - Development Workflow
  - Governance
- Removed sections: None
- Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ aligned (Constitution Check section present)
  - .specify/templates/spec-template.md — ✅ aligned (user stories, requirements, success criteria)
  - .specify/templates/tasks-template.md — ✅ aligned (phase structure, testing, observability)
- Follow-up TODOs: None
-->

# عقارك (Aqarak) Constitution

## Core Principles

### I. Bilingual-First

Every user-facing string, API response, and database record MUST support
both Arabic (ar) and English (en). Arabic is the default language.
All property titles, descriptions, location names, category names,
developer names, and error messages MUST have Arabic variants.
English variants are strongly recommended but not blocking for user
submissions. The `Accept-Language` header drives response language
selection via the i18n middleware.

**Rationale**: The platform targets the Egyptian real estate market where
Arabic is the primary language but international users and expats
require English support.

### II. Role-Based Access Control

The system recognizes exactly three roles: `admin`, `client`, and `broker`.

- **Admin**: Full analytics dashboard access, property approval/rejection,
  user management, order management, and system-wide CRUD operations.
- **Client**: Browse approved properties, submit purchase orders, manage
  favorites, and list properties for sale (subject to admin approval).
- **Broker**: List properties on behalf of clients with commission tracking.

Every API endpoint MUST enforce role checks via the `auth` middleware.
No endpoint may bypass authorization. The JWT-based auth token MUST
be validated on every protected request and blacklisted tokens MUST
be rejected.

**Rationale**: A marketplace with financial transactions requires strict
access control to prevent unauthorized operations and ensure trust.

### III. Admin-Gated Publishing

No property listing goes live without explicit admin approval. All
new property submissions MUST enter `pending_approval` status. Only
an admin may transition a property to `approved`, `rejected`, or
`inactive`. This applies equally to client and broker submissions.

**Rationale**: Quality control and fraud prevention are critical in
real estate. Every listing MUST be verified before public visibility.

### IV. Input Validation & Sanitization

All incoming request data MUST be validated using Joi schemas before
reaching any controller logic. The sanitization middleware MUST strip
potentially dangerous input (XSS, injection attempts) from every
request. No raw user input may be passed directly to SQL queries;
parameterized queries are mandatory.

**Rationale**: A platform handling financial transactions and personal
data MUST defend against injection attacks at every layer.

### V. API Security & Rate Limiting

All endpoints MUST be protected by appropriate rate limiters:
- `authLimiter` for authentication endpoints (login, register).
- `strictLimiter` for sensitive operations (password reset).
- `apiLimiter` for general data endpoints.

Helmet MUST be applied for HTTP security headers. CORS MUST restrict
origins to explicitly configured domains in production. Passwords
MUST be hashed with bcrypt; plaintext passwords are never stored or
logged.

**Rationale**: Public-facing APIs are attack surfaces. Rate limiting,
header hardening, and secure credential storage are non-negotiable.

### VI. Structured Error Handling & Logging

All errors MUST be caught by the global error handler middleware and
returned in a consistent JSON format with appropriate HTTP status codes.
The logger utility MUST be used for structured logging; `console.log`
is not permitted in production code. Audit middleware MUST record
significant operations (create, update, delete) for traceability.

**Rationale**: Consistent error responses simplify frontend integration
and debugging. Audit trails are essential for a financial platform.

### VII. Test Coverage

All core business logic (authentication, property CRUD, orders,
favorites, analytics) MUST have corresponding test files in the
`tests/` directory. Tests run via Jest with `cross-env NODE_ENV=test`.
New features MUST include tests before merging. Test files follow
the naming convention `<feature>.test.js`.

**Rationale**: A platform handling property transactions and financial
data cannot afford regressions. Automated tests are the safety net.

## Technology Stack & Constraints

- **Runtime**: Node.js with Express 5.x
- **Database**: PostgreSQL (via `pg` driver, connection pool)
- **Authentication**: JWT (jsonwebtoken) + bcryptjs for password hashing
- **Validation**: Joi 18.x for request schema validation
- **File Upload**: Multer 2.x (local storage in `uploads/` directory)
- **Email**: Nodemailer for password reset and notifications
- **Security**: Helmet, CORS, express-rate-limit, input sanitization
- **Testing**: Jest 30.x + Supertest 7.x
- **Frontend** (planned): React with calm, professional design aesthetic
- **Deployment**: Node.js server; PostgreSQL managed or self-hosted
- **Currency**: Egyptian Pound (EGP) as default
- **Geolocation**: Latitude/longitude stored per property for map display

### Constraints

- All API routes MUST be prefixed with `/api/`
- File uploads MUST NOT exceed 10MB per request
- Database schema changes MUST be managed via SQL migration files
  (`upgrade.sql`, `production_upgrade.sql`)
- Environment variables MUST be validated at startup via `validateEnv`
- The `.env` file MUST NEVER be committed to version control

## Development Workflow

### Branch Strategy

- `main` is the production-ready branch
- Feature work SHOULD use descriptive branches (e.g., `feature/add-search`)
- All code changes MUST be committed with descriptive messages

### Code Review Process

- All changes to controllers, routes, and middlewares MUST be reviewed
  for security implications
- Database schema changes MUST include both forward and rollback SQL
- New API endpoints MUST include corresponding validation schemas

### Quality Gates

1. **Validation gate**: All Joi schemas pass for the new feature
2. **Test gate**: `npm test` passes with no failures
3. **Security gate**: No raw SQL concatenation, no hardcoded secrets
4. **i18n gate**: All user-facing responses support Arabic and English

## Governance

This constitution is the authoritative reference for all development
decisions on the عقارك (Aqarak) platform. All code reviews, pull
requests, and architectural decisions MUST verify compliance with
these principles.

Amendments to this constitution require:
1. A documented proposal explaining the change and its rationale
2. Impact assessment on existing code and dependent templates
3. Version bump following semantic versioning (MAJOR.MINOR.PATCH)
4. Update to all dependent SpecKit templates if principle changes affect them

Complexity additions MUST be justified against the Simplicity principle:
if a simpler approach achieves the same goal, the simpler approach wins.

**Version**: 1.0.0 | **Ratified**: 2026-03-06 | **Last Amended**: 2026-03-06
