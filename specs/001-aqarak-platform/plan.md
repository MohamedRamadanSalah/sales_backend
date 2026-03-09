# Implementation Plan: عقارك (Aqarak) Real Estate Platform

**Branch**: `001-aqarak-platform` | **Date**: 2026-03-06 | **Spec**: [spec.md](file:///c:/Users/dell/Desktop/My_Enterprise_Projects/Sales_version(2)_backend/specs/001-aqarak-platform/spec.md)
**Input**: Feature specification from `/specs/001-aqarak-platform/spec.md`

## Summary

Build a bilingual (Arabic/English) real estate marketing platform with a
Node.js/Express 5 backend (PostgreSQL) and a React frontend. The platform
enables property browsing with advanced filters, user registration/auth,
property listing with admin approval workflow, purchase orders with
informational invoices (offline payment), favorites, in-app notifications,
and an admin analytics dashboard. The frontend uses full RTL layout for
Arabic and LTR for English.

## Technical Context

**Language/Version**: Node.js 20+ (backend), React 18+ (frontend)
**Primary Dependencies**: Express 5.x, pg, bcryptjs, jsonwebtoken, Joi, Multer, Nodemailer, Helmet, cors, morgan (backend); React, React Router, Axios, Chart.js, Leaflet.js (frontend)
**Storage**: PostgreSQL (relational), local filesystem (image uploads)
**Testing**: Jest 30.x + Supertest 7.x (backend); React Testing Library (frontend)
**Target Platform**: Web (browser), Node.js server
**Project Type**: Full-stack web application (REST API + SPA)
**Performance Goals**: All pages load within 3 seconds; 500 concurrent users
**Constraints**: Arabic RTL default; offline payments only; max 10MB per image upload request
**Scale/Scope**: Egyptian real estate market; ~500 concurrent users; bilingual AR/EN

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Bilingual-First | ✅ PASS | All entities have `_ar`/`_en` fields; i18n middleware; FR-001, FR-018 |
| II. Role-Based Access Control | ✅ PASS | Three roles defined; auth middleware on all protected routes; FR-005 |
| III. Admin-Gated Publishing | ✅ PASS | `pending_approval` default status; FR-002, FR-016, FR-019 |
| IV. Input Validation & Sanitization | ✅ PASS | Joi schemas for all routes; sanitize middleware; FR-013 |
| V. API Security & Rate Limiting | ✅ PASS | Helmet, CORS, rate limiters; bcrypt; FR-004, FR-012 |
| VI. Structured Error Handling & Logging | ✅ PASS | Global error handler; logger utility; audit middleware; FR-011 |
| VII. Test Coverage | ✅ PASS | 10 test files in `tests/`; Jest + Supertest; FR-011 |

**Gate Result**: ✅ ALL PASS — Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-aqarak-platform/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: technology decisions
├── data-model.md        # Phase 1: entity relationships
├── quickstart.md        # Phase 1: dev setup guide
├── contracts/           # Phase 1: API endpoint contracts
│   ├── auth.md
│   ├── properties.md
│   ├── orders.md
│   ├── favorites.md
│   ├── locations.md
│   ├── analytics.md
│   ├── images.md
│   └── notifications.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
# Backend (existing)
src/
├── app.js               # Express app setup
├── db.js                # PostgreSQL connection pool
├── controllers/         # Route handlers (8 files)
├── middlewares/          # Auth, i18n, rate limit, etc. (8 files)
├── routes/              # API route definitions (7 files)
├── utils/               # Logger, email, storage, etc. (5 files)
└── validations/         # Joi schemas (4 files)

tests/                   # Jest test suites (10 files + setup)

# Frontend (new — to be created)
frontend/
├── public/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── common/      # Buttons, inputs, cards, modals
│   │   ├── layout/      # Header, sidebar, footer, RTL wrapper
│   │   └── property/    # Property card, gallery, filters
│   ├── pages/           # Route-level page components
│   │   ├── Home/
│   │   ├── PropertyList/
│   │   ├── PropertyDetail/
│   │   ├── PropertyForm/
│   │   ├── Auth/
│   │   ├── Dashboard/
│   │   ├── Orders/
│   │   ├── Favorites/
│   │   ├── Notifications/
│   │   └── Admin/
│   ├── services/        # API client (axios wrappers)
│   ├── hooks/           # Custom React hooks
│   ├── context/         # Auth, Language, Notification contexts
│   ├── i18n/            # Translation files (ar.json, en.json)
│   ├── utils/           # Helpers, formatters, validators
│   ├── styles/          # Global CSS, RTL support, design tokens
│   ├── App.jsx
│   └── main.jsx
└── package.json
```

**Structure Decision**: Web application layout with existing backend at root
(`src/`) and new React frontend in `frontend/` directory. The backend already
exists and is functional — the plan focuses on extending the backend (new
notification system, property edit/deactivation endpoints) and building the
complete React frontend.

## Complexity Tracking

No constitution violations to justify.
