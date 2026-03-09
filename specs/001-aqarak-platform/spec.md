# Feature Specification: عقارك (Aqarak) Real Estate Platform

**Feature Branch**: `001-aqarak-platform`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "This is a real estate marketing platform called 'عقارك' (Aqarak). It has a Node.js/Express backend with PostgreSQL. Two user types: Admin (full analytics + property management) and Regular User (browse, buy, sell properties with admin approval). Frontend should be React, calm and professional design."

## Clarifications

### Session 2026-03-06

- Q: Who can trigger property status transitions beyond initial approval? → A: Seller can deactivate (→ inactive) but only admin can reactivate (→ approved).
- Q: How are users notified of status changes (approval, rejection, orders)? → A: In-app notification center (bell icon with unread count) for all status changes.
- Q: How is payment handled for accepted orders? → A: Invoices are informational only; payment happens offline (cash/bank transfer), admin marks order as completed.
- Q: Should the frontend use RTL layout for Arabic? → A: Full RTL layout when Arabic is active, auto-switch to LTR for English.
- Q: Can users edit properties after submission? → A: Users can edit, but edits to approved listings reset status to pending_approval for re-approval.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Property Browsing & Search (Priority: P1)

A visitor or registered user opens the Aqarak platform and browses available
approved properties. They can filter by location (governorate → city →
neighborhood), property type (apartment, villa, chalet, commercial), listing
type (sale/rent), price range, area, bedrooms, and finishing type. All content
is displayed in Arabic by default with an option to switch to English.

**Why this priority**: Browsing is the primary entry point for every user.
Without a functional, fast, and filterable property listing, no transaction
can occur. This is the core value proposition of the platform.

**Independent Test**: A user can open the platform, see a list of approved
properties, apply filters, view individual property details with images and
map location, and toggle between Arabic and English — all without being
logged in.

**Acceptance Scenarios**:

1. **Given** the platform has approved properties, **When** a visitor opens the
   homepage, **Then** they see a grid/list of approved properties with thumbnail
   images, title, price, location, and area.
2. **Given** the visitor selects "Cairo" as governorate and "Apartment" as type,
   **When** they apply the filter, **Then** only apartments in Cairo are displayed.
3. **Given** a property card is clicked, **When** the detail page loads, **Then**
   the user sees all images, full bilingual description, price details
   (down payment, installment years), amenities, map pin, and seller/developer info.
4. **Given** the user switches language to English, **When** the page reloads,
   **Then** all labels, property titles, and descriptions appear in English.

---

### User Story 2 — User Registration & Authentication (Priority: P1)

A new user registers with their name, email, phone number, and password.
After registration they can log in and access authenticated features. They
can reset their password via email if forgotten. Admins are created through
a separate administrative process.

**Why this priority**: Authentication gates all transactional features
(selling, buying, favorites). Without it, the platform cannot differentiate
between user roles or protect sensitive operations.

**Independent Test**: A user can register, receive confirmation, log in, view
their profile, log out, and reset a forgotten password via email.

**Acceptance Scenarios**:

1. **Given** a visitor provides valid name, email, phone, and password,
   **When** they submit the registration form, **Then** an account is created
   with the "client" role and they are logged in.
2. **Given** an existing user provides correct credentials, **When** they log in,
   **Then** they receive an authentication token and are redirected to the
   dashboard.
3. **Given** a user has forgotten their password, **When** they request a reset,
   **Then** they receive an email with a reset link that expires after 1 hour.
4. **Given** invalid input (duplicate email, weak password), **When** the user
   submits, **Then** they see a clear bilingual error message.

---

### User Story 3 — Property Listing (Sell/Rent) with Admin Approval (Priority: P2)

A registered user (client or broker) creates a property listing by providing
bilingual title and description, selecting a category, location, listing type
(sale/rent), pricing details (price, down payment, installment years,
maintenance deposit), physical specs (area, bedrooms, bathrooms, floor),
finishing type, legal status, property origin, and uploading images. The listing
enters "pending" status until an admin approves or rejects it.

**Why this priority**: Users must be able to list properties to create
marketplace supply. Admin approval ensures quality control before listings are
publicly visible.

**Independent Test**: A logged-in user can fill out the property form, upload
images, submit, and see the listing in their dashboard as "pending." An admin
can then approve or reject it.

**Acceptance Scenarios**:

1. **Given** a logged-in user fills all required fields (Arabic title,
   description, category, location, price, area, listing type, finishing,
   legal status, origin), **When** they submit, **Then** a property is created
   with status "pending_approval."
2. **Given** the user uploads up to 10 images, **When** submission completes,
   **Then** images are stored and linked to the property, with one marked
   as primary.
3. **Given** an admin views the pending listing, **When** they approve it,
   **Then** the property status changes to "approved" and it appears in
   public search results.
4. **Given** an admin rejects a listing, **When** the rejection is processed,
   **Then** the listing status becomes "rejected" and the owner is notified.
5. **Given** a seller has an approved listing, **When** they choose to
   deactivate it, **Then** the status changes to "inactive." Only an admin
   can reactivate it back to "approved."
6. **Given** a seller edits an approved listing, **When** they save changes,
   **Then** the listing status resets to "pending_approval" and must be
   re-approved by an admin before becoming publicly visible again.

---

### User Story 4 — Purchase Orders (Priority: P2)

A registered user who finds a property they want to buy submits a purchase
order (interest request). The order captures the property, client, total
amount, and optional notes. The property owner or admin can accept or reject
the order.

**Why this priority**: Monetization and the core business transaction depend
on the ordering system. Without orders, the platform is only a showcase.

**Independent Test**: A user can submit an order for an approved property,
see the order in their history, and the admin can accept or reject it.

**Acceptance Scenarios**:

1. **Given** a user is viewing an approved property, **When** they click
   "Submit Order" and confirm, **Then** an order is created with status
   "pending."
2. **Given** the admin views pending orders, **When** they accept an order,
   **Then** the order status changes to "accepted" and an invoice is generated.
3. **Given** a user has submitted orders, **When** they view their order
   history, **Then** they see all orders with statuses (pending, accepted,
   rejected, completed).

---

### User Story 5 — Favorites (Priority: P3)

A registered user can save properties to a personal favorites list for
quick access later. They can add and remove properties from favorites.

**Why this priority**: Favorites enhance user engagement and retention by
allowing users to bookmark interesting properties, but the platform is
functional without them.

**Independent Test**: A user can add a property to favorites, view their
favorites list, and remove a property from it.

**Acceptance Scenarios**:

1. **Given** a user is viewing an approved property, **When** they click the
   favorite icon, **Then** the property is added to their favorites list.
2. **Given** a user views their favorites, **When** the page loads, **Then**
   all saved properties are displayed with current details.
3. **Given** a property is in favorites, **When** the user clicks unfavorite,
   **Then** the property is removed from their list.

---

### User Story 6 — Admin Analytics Dashboard (Priority: P3)

An admin user accesses a dashboard showing platform-wide analytics: total
users, total properties (by status), orders summary, revenue metrics,
top locations, property type distribution, and time-series trends.

**Why this priority**: Analytics are essential for business decisions and
platform management but do not block any end-user functionality.

**Independent Test**: An admin logs in and sees a dashboard with charts and
KPI cards reflecting real platform data.

**Acceptance Scenarios**:

1. **Given** an admin is logged in, **When** they navigate to the analytics
   page, **Then** they see KPI cards for total users, properties, orders,
   and revenue.
2. **Given** analytics data exists, **When** the admin views charts, **Then**
   they see property distribution by type, location heatmap, and monthly
   trends.
3. **Given** a non-admin user, **When** they try to access the analytics
   endpoint, **Then** they receive a 403 Forbidden error.

---

### Edge Cases

- What happens when a user tries to order their own property?
  The system MUST prevent self-ordering.
- What happens when a property is deleted while it has pending orders?
  Orders remain with their current status; the property reference is preserved.
- How does the system handle concurrent orders for the same property?
  Multiple pending orders are allowed; acceptance of one does not
  automatically reject others (admin decides).
- What happens when an unauthenticated user tries to access protected routes?
  A 401 Unauthorized error is returned with a bilingual message.
- What if image upload fails mid-way?
  Successfully uploaded images are kept; the user is informed which
  uploads failed and can retry.
- What happens when a seller edits an approved listing that has pending orders?
  The listing status resets to pending_approval. Existing pending orders
  remain valid; the admin reviews the edited listing and orders together.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display all property listings in Arabic by default
  with English as an alternative language.
- **FR-002**: System MUST require admin approval before any property listing
  becomes publicly visible.
- **FR-003**: Users MUST be able to register with name, email, phone, and
  password; email and phone MUST be unique.
- **FR-004**: System MUST authenticate users via JWT tokens with bcrypt
  password hashing.
- **FR-005**: System MUST support three user roles: admin, client, and broker.
- **FR-006**: Users MUST be able to filter properties by location hierarchy
  (governorate → city → neighborhood), category, listing type, price range,
  area, bedrooms, and finishing type.
- **FR-007**: System MUST support property image uploads (up to 10 images
  per property, max 10MB per request) with one primary image.
- **FR-008**: System MUST generate informational invoices when purchase orders
  are accepted. Invoices serve as records only; actual payment happens
  offline (cash or bank transfer). Admin MUST be able to mark an order
  as "completed" after confirming offline payment.
- **FR-009**: System MUST provide analytics data (user counts, property
  statistics, order summaries, revenue tracking) restricted to admin users.
- **FR-010**: System MUST support password reset via email with time-limited
  tokens (1 hour expiry).
- **FR-011**: System MUST log all significant operations via audit middleware
  for traceability.
- **FR-012**: System MUST enforce rate limiting on all endpoints, with
  stricter limits on authentication and password reset routes.
- **FR-013**: System MUST validate all input using schema validation before
  processing.
- **FR-014**: System MUST support hierarchical locations: governorate →
  city → neighborhood.
- **FR-015**: System MUST store geolocation (latitude/longitude) per property
  for map display.
- **FR-016**: Property owners MUST be able to deactivate their own approved
  listings (status → inactive). Only admin MUST be able to reactivate an
  inactive listing (status → approved).
- **FR-017**: System MUST provide an in-app notification center (bell icon
  with unread count) that notifies users of all status changes including:
  property approval/rejection, order status updates, and listing
  reactivation by admin.
- **FR-018**: Frontend MUST render in full RTL (right-to-left) layout when
  Arabic is the active language, and switch to LTR (left-to-right) when
  English is active. Navigation, forms, cards, and all UI components
  MUST respect the active text direction.
- **FR-019**: Users MUST be able to edit their property listings at any
  status. Edits to an approved listing MUST reset its status to
  "pending_approval" requiring admin re-approval before becoming
  publicly visible again.

### Key Entities

- **User**: Represents platform participants (admin, client, broker) with
  profile information, authentication credentials, and language preference.
- **Property**: Core listing entity with bilingual content, pricing,
  physical specifications, legal status, finishing type, location,
  developer/project association, and approval workflow.
- **Order**: Purchase request linking a client to a property with amount,
  status tracking, and notes.
- **Invoice**: Billing record tied to an accepted order with amount, due
  date, payment status, and method.
- **Location**: Hierarchical geographic entity (governorate → city →
  neighborhood) with bilingual names.
- **Developer**: Real estate developer/company with bilingual profile and
  logo.
- **Project**: Compound or development by a developer in a specific
  location with bilingual descriptions.
- **Category**: Property classification (apartment, villa, chalet,
  commercial) with bilingual names and slugs.
- **Amenity**: Feature/facility (pool, gym, parking, etc.) linked to
  properties via junction table.
- **Favorite**: User-property bookmark for quick access.
- **Notification**: In-app alert tied to a user, containing event type,
  message (bilingual), read/unread status, and timestamp. Events include
  property approval/rejection, order status changes, and listing
  reactivation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find a property matching their criteria within
  3 filter interactions.
- **SC-002**: Property listing submission (including image uploads)
  completes within 2 minutes for a user with all information ready.
- **SC-003**: Admin can review and approve/reject a property within
  30 seconds per listing.
- **SC-004**: All pages load and display content within 3 seconds on a
  standard broadband connection.
- **SC-005**: The platform supports 500 concurrent users browsing and
  filtering without noticeable performance degradation.
- **SC-006**: 100% of user-facing text is available in both Arabic and
  English, with correct RTL/LTR layout direction per language.
- **SC-007**: Zero sensitive operations (login, order, property management)
  are accessible without valid authentication.
- **SC-008**: Users can successfully complete the registration-to-first-order
  flow in under 10 minutes.

## Assumptions

- Arabic is the primary language and default for all new users
  (`preferred_language = 'ar'`).
- Egyptian Pound (EGP) is the default and only supported currency at launch.
- Property images are stored locally on the server filesystem (not cloud
  storage) in the MVP.
- Email delivery for password reset relies on SMTP configuration via
  Nodemailer; email deliverability is assumed.
- The admin role is created via a separate script/process, not through
  public registration.
- The frontend will be a React SPA communicating with the backend via
  RESTful JSON APIs.
- The platform targets the Egyptian real estate market exclusively at
  launch.
- Broker users have similar listing capabilities as clients but with
  commission tracking; detailed broker features are deferred to a
  future iteration.
- No online payment gateway is integrated at launch; all payments
  (down payments, installments) happen offline via cash or bank transfer.
  The platform tracks invoice status for record-keeping only.
