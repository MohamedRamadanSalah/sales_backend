# Tasks: عقارك (Aqarak) Real Estate Platform

**Input**: Design documents from `/specs/001-aqarak-platform/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Exact file paths included in descriptions

---

## Phase 1: Setup

**Purpose**: Project initialization and frontend scaffolding

- [x] T001 Initialize React frontend with Vite in `frontend/` using `npx create-vite@latest frontend --template react`
- [x] T002 [P] Install frontend dependencies: react-router-dom, axios, chart.js, react-chartjs-2, leaflet, react-leaflet in `frontend/package.json`
- [x] T003 [P] Create design system CSS with custom properties (colors, spacing, typography, RTL support) in `frontend/src/styles/design-tokens.css`
- [x] T004 [P] Create global styles and RTL layout support in `frontend/src/styles/global.css`
- [x] T005 [P] Create i18n translation files in `frontend/src/i18n/ar.json` and `frontend/src/i18n/en.json`
- [x] T006 [P] Create API service base configuration (axios instance with interceptors) in `frontend/src/services/api.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Run notifications table migration on PostgreSQL database using SQL from `specs/001-aqarak-platform/data-model.md`
- [x] T008 [P] Create notification controller in `src/controllers/notificationController.js` (list, count, markRead, markAllRead)
- [x] T009 [P] Create notification routes in `src/routes/notificationRoutes.js` (GET /, GET /count, PATCH /:id/read, PATCH /read-all)
- [x] T010 [P] Create notification utility helper in `src/utils/notify.js` (createNotification function for reuse across controllers)
- [x] T011 Register notification routes in `src/app.js` under `/api/notifications` with `apiLimiter`
- [x] T012 [P] Update `src/controllers/propertyController.js` to add deactivation endpoint (owner sets status → inactive)
- [x] T013 [P] Update `src/controllers/propertyController.js` to reset status to pending_approval when owner edits an approved listing
- [x] T014 [P] Add notification triggers in `src/controllers/propertyController.js` (on approve, reject, reactivate)
- [x] T015 [P] Add notification triggers in `src/controllers/orderController.js` (on order received, accepted, rejected, completed)
- [x] T016 Create AuthContext provider in `frontend/src/context/AuthContext.jsx` (login, logout, register, token management)
- [x] T017 [P] Create LanguageContext provider in `frontend/src/context/LanguageContext.jsx` (AR/EN toggle, RTL/LTR direction switch)
- [x] T018 [P] Create NotificationContext provider in `frontend/src/context/NotificationContext.jsx` (unread count polling every 30s)
- [x] T019 Create RTL-aware Layout component in `frontend/src/components/layout/Layout.jsx` (header, sidebar, footer, dir attribute)
- [x] T020 [P] Create Header component in `frontend/src/components/layout/Header.jsx` (logo, nav, language toggle, notification bell, auth buttons)
- [x] T021 [P] Create Footer component in `frontend/src/components/layout/Footer.jsx`
- [x] T022 Create App component with React Router setup in `frontend/src/App.jsx` (all route definitions, context providers, layout wrapper)

**Checkpoint**: Foundation ready — backend notifications system works, frontend shell with routing, auth context, language context, and RTL layout are functional.

---

## Phase 3: User Story 1 — Property Browsing & Search (Priority: P1) 🎯 MVP

**Goal**: Visitors can browse, filter, and view approved property listings in AR/EN

**Independent Test**: Open homepage → see property grid → apply filters → click property → see detail page with images, map, amenities → switch language

### Implementation for User Story 1

- [x] T023 [P] [US1] Create property API service in `frontend/src/services/propertyService.js` (getAll, getById, getFilters)
- [x] T024 [P] [US1] Create location API service in `frontend/src/services/locationService.js` (getByType, getChildren)
- [x] T025 [P] [US1] Create PropertyCard component in `frontend/src/components/property/PropertyCard.jsx` (thumbnail, title, price, location, area, favorite icon)
- [x] T026 [P] [US1] Create PropertyFilters component in `frontend/src/components/property/PropertyFilters.jsx` (location hierarchy, category, listing type, price range, area, bedrooms, finishing)
- [x] T027 [US1] Create PropertyList page in `frontend/src/pages/PropertyList/PropertyList.jsx` (grid layout, filters sidebar, pagination, empty state)
- [x] T028 [P] [US1] Create ImageGallery component in `frontend/src/components/property/ImageGallery.jsx` (carousel with thumbnails, fullscreen view)
- [x] T029 [P] [US1] Create PropertyMap component in `frontend/src/components/property/PropertyMap.jsx` (Leaflet map with pin)
- [x] T030 [US1] Create PropertyDetail page in `frontend/src/pages/PropertyDetail/PropertyDetail.jsx` (gallery, description, pricing, amenities, map, seller info, order button)
- [x] T031 [US1] Create Home page in `frontend/src/pages/Home/Home.jsx` (hero section, featured properties, search bar, categories, statistics)
- [x] T032 [US1] Add styles for property components in `frontend/src/styles/property.css`

**Checkpoint**: User Story 1 complete — visitors can browse, filter, and view properties in AR/EN with RTL support.

---

## Phase 4: User Story 2 — Registration & Authentication (Priority: P1)

**Goal**: Users can register, login, logout, and reset passwords

**Independent Test**: Register → login → see authenticated dashboard → logout → forgot password → reset via email → login with new password

### Implementation for User Story 2

- [x] T033 [P] [US2] Create auth API service in `frontend/src/services/authService.js` (register, login, logout, forgotPassword, resetPassword)
- [x] T034 [P] [US2] Create form input components in `frontend/src/components/common/Input.jsx` and `frontend/src/components/common/Button.jsx`
- [x] T035 [US2] Create LoginPage in `frontend/src/pages/Auth/LoginPage.jsx` (email, password, forgot password link, register link)
- [x] T036 [P] [US2] Create RegisterPage in `frontend/src/pages/Auth/RegisterPage.jsx` (name, email, phone, password, validation)
- [x] T037 [P] [US2] Create ForgotPasswordPage in `frontend/src/pages/Auth/ForgotPasswordPage.jsx` (email input, submit)
- [x] T038 [P] [US2] Create ResetPasswordPage in `frontend/src/pages/Auth/ResetPasswordPage.jsx` (token extraction, new password)
- [x] T039 [US2] Create UserDashboard page in `frontend/src/pages/Dashboard/Dashboard.jsx` (overview cards: my properties, my orders, my favorites)
- [x] T040 [US2] Add protected route wrapper in `frontend/src/components/common/ProtectedRoute.jsx` (redirect unauthenticated to login)
- [x] T041 [US2] Add styles for auth pages in `frontend/src/styles/auth.css`

**Checkpoint**: User Story 2 complete — full auth flow works with protected routes.

---

## Phase 5: User Story 3 — Property Listing with Admin Approval (Priority: P2)

**Goal**: Users create property listings (pending), admin approves/rejects, owners can edit/deactivate

**Independent Test**: Login → create listing with images → see pending status → admin approves → listing appears in search → owner edits → status resets to pending → owner deactivates → listing hidden

### Implementation for User Story 3

- [ ] T042 [P] [US3] Create property management API service in `frontend/src/services/propertyManagementService.js` (create, update, deactivate, uploadImages, getMyProperties)
- [ ] T043 [P] [US3] Create ImageUploader component in `frontend/src/components/property/ImageUploader.jsx` (drag-and-drop, preview, primary selection, progress, max 10)
- [ ] T044 [US3] Create PropertyForm page in `frontend/src/pages/PropertyForm/PropertyForm.jsx` (all fields, bilingual inputs, location hierarchy selects, image uploader)
- [ ] T045 [US3] Create MyProperties page in `frontend/src/pages/Dashboard/MyProperties.jsx` (list with status badges, edit/deactivate actions)
- [ ] T046 [P] [US3] Create admin property management API service in `frontend/src/services/adminService.js` (getPending, approve, reject, getAnalytics)
- [ ] T047 [US3] Create AdminPendingProperties page in `frontend/src/pages/Admin/PendingProperties.jsx` (pending list, approve/reject buttons, detail preview)
- [ ] T048 [US3] Add styles for property form and admin pages in `frontend/src/styles/forms.css` and `frontend/src/styles/admin.css`

**Checkpoint**: User Story 3 complete — full property lifecycle (create → pending → approve/reject → edit → deactivate) works.

---

## Phase 6: User Story 4 — Purchase Orders (Priority: P2)

**Goal**: Users submit purchase orders, admin manages them, invoices generated on acceptance

**Independent Test**: Find property → submit order → see in order history → admin accepts → invoice generated → admin marks completed

### Implementation for User Story 4

- [ ] T049 [P] [US4] Create order API service in `frontend/src/services/orderService.js` (create, getMyOrders, getOrderById)
- [ ] T050 [US4] Create OrderSubmitModal component in `frontend/src/components/common/OrderModal.jsx` (property summary, total amount, notes, confirm)
- [ ] T051 [US4] Wire order button in PropertyDetail page to OrderSubmitModal in `frontend/src/pages/PropertyDetail/PropertyDetail.jsx`
- [ ] T052 [US4] Create MyOrders page in `frontend/src/pages/Dashboard/MyOrders.jsx` (order list with status badges, invoice details)
- [ ] T053 [US4] Create AdminOrders page in `frontend/src/pages/Admin/Orders.jsx` (all orders, accept/reject/complete actions, invoice view)
- [ ] T054 [US4] Add styles for order pages in `frontend/src/styles/orders.css`

**Checkpoint**: User Story 4 complete — order flow with invoices works end-to-end.

---

## Phase 7: User Story 5 — Favorites (Priority: P3)

**Goal**: Users save/remove properties from a personal favorites list

**Independent Test**: Browse properties → click favorite icon → property saved → view favorites page → remove from favorites

### Implementation for User Story 5

- [ ] T055 [P] [US5] Create favorites API service in `frontend/src/services/favoritesService.js` (add, remove, getMyFavorites)
- [ ] T056 [US5] Create FavoriteButton component in `frontend/src/components/property/FavoriteButton.jsx` (toggle icon, auth check)
- [ ] T057 [US5] Wire FavoriteButton into PropertyCard and PropertyDetail in `frontend/src/components/property/PropertyCard.jsx` and `frontend/src/pages/PropertyDetail/PropertyDetail.jsx`
- [ ] T058 [US5] Create FavoritesPage in `frontend/src/pages/Dashboard/Favorites.jsx` (grid of favorited properties with remove action)
- [ ] T059 [US5] Add styles for favorites in `frontend/src/styles/favorites.css`

**Checkpoint**: User Story 5 complete — favorites system works with toggle UI.

---

## Phase 8: User Story 6 — Admin Analytics Dashboard (Priority: P3)

**Goal**: Admin sees KPI cards, charts, and trends for platform management

**Independent Test**: Admin login → navigate to analytics → see KPI cards (users, properties, orders, revenue) → view charts (trends, distribution, top locations)

### Implementation for User Story 6

- [ ] T060 [P] [US6] Create analytics API service in `frontend/src/services/analyticsService.js` (getOverview, getTrends, getTopLocations)
- [ ] T061 [P] [US6] Create KPICard component in `frontend/src/components/admin/KPICard.jsx` (icon, label, value, trend indicator)
- [ ] T062 [P] [US6] Create chart components in `frontend/src/components/admin/PropertyChart.jsx`, `frontend/src/components/admin/TrendsChart.jsx`, `frontend/src/components/admin/LocationsChart.jsx`
- [ ] T063 [US6] Create AdminDashboard page in `frontend/src/pages/Admin/Dashboard.jsx` (KPI cards grid, charts layout, date range selector)
- [ ] T064 [US6] Add styles for analytics dashboard in `frontend/src/styles/analytics.css`

**Checkpoint**: User Story 6 complete — admin has full analytics visibility.

---

## Phase 9: Notifications UI

**Goal**: In-app notification center with bell icon and unread count

- [ ] T065 Create NotificationBell component in `frontend/src/components/layout/NotificationBell.jsx` (bell icon, unread badge, dropdown)
- [ ] T066 Create NotificationDropdown component in `frontend/src/components/layout/NotificationDropdown.jsx` (notification list, mark read, mark all read, link to reference)
- [ ] T067 Create NotificationsPage in `frontend/src/pages/Dashboard/Notifications.jsx` (full notification history with pagination, filters)
- [ ] T068 Wire NotificationBell into Header component in `frontend/src/components/layout/Header.jsx`
- [ ] T069 Add styles for notifications in `frontend/src/styles/notifications.css`

**Checkpoint**: Notification system fully functional end-to-end.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T070 [P] Add loading skeletons and empty state components in `frontend/src/components/common/Skeleton.jsx` and `frontend/src/components/common/EmptyState.jsx`
- [ ] T071 [P] Add toast notification component for success/error feedback in `frontend/src/components/common/Toast.jsx`
- [ ] T072 [P] Add 404 Not Found page in `frontend/src/pages/NotFound.jsx`
- [ ] T073 [P] Add responsive design breakpoints and mobile navigation in `frontend/src/styles/responsive.css`
- [ ] T074 [P] Add SEO meta tags (title, description) per page using document.title updates
- [ ] T075 Add error boundary component in `frontend/src/components/common/ErrorBoundary.jsx`
- [ ] T076 Review and polish all RTL layout edge cases across all pages
- [ ] T077 Run full backend test suite with `npm test` and fix any failing tests
- [ ] T078 Add `notification.test.js` in `tests/notification.test.js` for the new notification endpoints
- [ ] T079 Update `README.md` at repo root with project overview, setup instructions, and API documentation links

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–8)**: All depend on Foundational phase completion
  - US1 (P1) and US2 (P1) can proceed in parallel
  - US3 (P2) can start after US2 (needs auth)
  - US4 (P2) can start after US1 + US2 (needs property detail + auth)
  - US5 (P3) can start after US1 + US2 (needs property cards + auth)
  - US6 (P3) can start after US2 (needs admin auth)
- **Notifications UI (Phase 9)**: Depends on Phase 2 (backend) + US2 (auth)
- **Polish (Phase 10)**: Depends on all user stories being complete

### Within Each User Story

- API services before page components
- Reusable components before pages that use them
- Pages before styles (or in parallel)
- Each story independently testable after its checkpoint

### Parallel Opportunities

```text
# Phase 1 — All setup tasks can run in parallel:
T002, T003, T004, T005, T006 (after T001)

# Phase 2 — Backend tasks in parallel:
T008, T009, T010 (after T007)
T012, T013, T014, T015 (after T011)
T016, T017, T018 (frontend contexts)
T019, T020, T021 (layout components)

# Phase 3 (US1) — API + components in parallel:
T023, T024, T025, T026 → then T027, T028, T029 → then T030, T031

# Phase 4 (US2) — Auth pages in parallel:
T035, T036, T037, T038 (after T033, T034)

# User stories after foundation:
US1 ‖ US2 → US3 ‖ US5 ‖ US6 → US4
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: Property Browsing (US1)
4. Complete Phase 4: Authentication (US2)
5. **STOP and VALIDATE**: Browse properties, register, login — core platform works
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (Browsing) + US2 (Auth) → Test independently → **MVP!**
3. US3 (Property Listing) → Test listing + approval flow
4. US4 (Orders) → Test purchase flow
5. US5 (Favorites) → Test bookmarking
6. US6 (Analytics) → Test admin dashboard
7. Notifications UI → Test bell + dropdown
8. Polish → Final QA pass

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The backend already exists — most tasks are frontend React components
- New backend work: notifications system (T007–T015), property edit/deactivate behavior (T012–T013)
