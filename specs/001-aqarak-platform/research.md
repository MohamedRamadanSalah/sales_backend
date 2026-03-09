# Research: عقارك (Aqarak) Platform

**Phase 0 Output** | **Date**: 2026-03-06

## R1: React Frontend Framework Setup

**Decision**: Use Vite + React 18 with React Router v6 for the frontend SPA.

**Rationale**: Vite provides fast HMR and build times, React 18 has mature
RTL support via the `dir` attribute, and React Router v6 handles client-side
routing cleanly. The existing backend uses Express 5 with REST APIs, making
a separate React SPA the natural frontend choice.

**Alternatives considered**:
- Next.js — Too heavy for a SPA with a separate Express backend; SSR is
  unnecessary since the backend already serves JSON APIs.
- Create React App — Deprecated; Vite is the recommended successor.

## R2: RTL Layout Strategy

**Decision**: Use CSS logical properties (`margin-inline-start`, `padding-inline-end`)
combined with `dir="rtl"` on the root `<html>` element. The active language
context drives the direction switch.

**Rationale**: CSS logical properties automatically flip layouts for RTL
without maintaining separate stylesheets. This is the modern standard and
is well-supported across browsers.

**Alternatives considered**:
- RTLCSS (post-processing) — Adds build complexity and can break custom
  animations; logical properties are more maintainable.
- Separate RTL stylesheet — Doubles maintenance cost.

## R3: State Management

**Decision**: Use React Context API for global state (auth, language,
notifications) plus local component state. No external state library.

**Rationale**: The app has limited global state needs (auth token, language
preference, notification count). React Context avoids adding dependency
complexity. If state management grows, Zustand can be added incrementally.

**Alternatives considered**:
- Redux Toolkit — Overkill for 3 contexts; adds boilerplate.
- Zustand — Good option but unnecessary for initial scope.

## R4: Notification System Backend

**Decision**: Add a `notifications` table to PostgreSQL. Create notifications
via database triggers or explicit controller calls when status changes occur.
Frontend polls for unread count periodically (every 30 seconds).

**Rationale**: Polling is simpler than WebSockets for the MVP and avoids
additional infrastructure. The notification volume (property approvals,
order updates) is low enough that polling at 30-second intervals is adequate.

**Alternatives considered**:
- WebSockets (Socket.io) — Real-time but adds server complexity, connection
  management, and scaling concerns. Can be added in a future iteration.
- Server-Sent Events (SSE) — Good middle ground but less browser support
  and limited to one-directional.

## R5: Frontend Design System

**Decision**: Custom design system with CSS custom properties (design tokens),
calm professional palette inspired by modern real estate platforms. Use
Google Fonts (Cairo for Arabic, Inter for English). CSS-only approach with
no UI framework.

**Rationale**: The user explicitly requested "calm and professional design"
and the constitution requires vanilla CSS for maximum control. A custom
design system allows precise control over RTL layout, bilingual typography,
and the premium aesthetic.

**Alternatives considered**:
- Material UI / Ant Design — Pre-built but heavy, hard to customize for
  Arabic-first RTL, and conflict with "calm" design requirement.
- Tailwind CSS — Not requested; custom CSS provides more control for
  bilingual RTL layouts.

## R6: Image Handling Strategy

**Decision**: Keep existing Multer-based local file upload. Frontend uses
a multi-image uploader component with drag-and-drop, preview, primary image
selection, and progress indication.

**Rationale**: The existing backend already handles file uploads via Multer.
Local storage is explicitly stated in assumptions. Cloud migration can be
done later without changing the API contract.

**Alternatives considered**:
- Direct-to-cloud upload (S3/GCS) — Better for production but out of
  MVP scope per assumptions.

## R7: Map Integration

**Decision**: Use Leaflet.js with OpenStreetMap tiles for property location
display. Each property has lat/lng stored in the database.

**Rationale**: Leaflet is free, lightweight, and already present in the
project's prior frontend work. OpenStreetMap tiles require no API key.

**Alternatives considered**:
- Google Maps — Requires API key, billing account; adds cost.
- Mapbox — Better styling but requires API key.

## R8: Chart Library for Analytics

**Decision**: Use Chart.js for the admin analytics dashboard.

**Rationale**: Chart.js is already referenced in prior frontend work,
is lightweight, supports responsive charts, and covers all needed chart
types (bar, line, pie, doughnut).

**Alternatives considered**:
- D3.js — More powerful but much more complex for standard charts.
- Recharts — Good React wrapper but adds another dependency.
