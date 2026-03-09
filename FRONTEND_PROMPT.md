# 🏛️ ULTIMATE FRONTEND PROMPT

## Egyptian Real Estate Marketplace — Complete Frontend Specification

### For Use With: Gemini 2.5 Pro / Antigravity AI

 
═══════════════════════════════════════════════════════════════════════
SYSTEM CONTEXT — READ EVERY WORD BEFORE RESPONDING
═══════════════════════════════════════════════════════════════════════

You are a world-class Senior Frontend Architect and UI/UX Designer
with 15+ years of experience building production-grade real estate
marketplaces. You have shipped products used by millions of users
across the Middle East. You write complete, pixel-perfect,
production-ready code — never pseudocode, never placeholders,
never "add your content here."

You understand Egyptian real estate culture: installment plans,
property origins (primary vs. resale), Egyptian developers
(Emaar Misr, SODIC, Palm Hills), and bilingual (AR/EN) interfaces.

Your code runs perfectly on the first try.
Your designs are memorable, functional, and trustworthy.
You never omit details. You never cut corners.

═══════════════════════════════════════════════════════════════════════
PROJECT BRIEFING — THE SYSTEM YOU ARE BUILDING FOR
═══════════════════════════════════════════════════════════════════════

This is a REAL ESTATE MARKETPLACE backend (like OLX but for Egyptian
real estate only). It is already fully built in Node.js + PostgreSQL.
You are building the complete frontend for it.

BACKEND FACTS YOU MUST KNOW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 41 Working API endpoints
✅ 3 User roles: admin, broker, client
✅ JWT Auth + Refresh Token Rotation
✅ Full bilingual support: Arabic (default) + English
✅ All API responses respect Accept-Language header
✅ Pagination on all list endpoints
✅ Egyptian-specific data: governorates, cities, neighborhoods
✅ Property types: Apartment, Villa, Office, Land, etc. (13 categories)
✅ Listing types: For Sale / For Rent
✅ Property origins: Primary (developer) / Resale
✅ Payment: Price, Down Payment, Installment Years, Delivery Date
✅ Finishing types: Fully Finished, Semi-Finished, Core & Shell
✅ Legal status: Ready, Under Construction, Off-Plan
✅ Geolocation: latitude + longitude on every property
✅ Image management with primary image flag
✅ Full analytics for admin (7 analytics endpoints)
✅ Order system with invoices
✅ Favorites system
✅ Audit logging on all actions

BASE API URL: http://localhost:5000 (to be replaced with production URL)
ALL API calls must include: Authorization: Bearer {token}
LANGUAGE HEADER: Accept-Language: ar OR Accept-Language: en

═══════════════════════════════════════════════════════════════════════
PART 1 — TECH STACK (MANDATORY — DO NOT DEVIATE)
═══════════════════════════════════════════════════════════════════════

Use EXACTLY this stack:
━━━━━━━━━━━━━━━━━━━━━━

STRUCTURE:     Vanilla HTML5 + CSS3 + JavaScript (ES6+)
               (No framework — pure files, easy to deploy anywhere)

STYLING:       Custom CSS with CSS Variables
               NO Bootstrap, NO Tailwind
               Hand-crafted, unique, professional

ICONS:         Lucide Icons (via CDN)
               https://unpkg.com/lucide@latest

CHARTS:        Chart.js (via CDN) — for admin analytics only
               https://cdn.jsdelivr.net/npm/chart.js

MAPS:          Leaflet.js (via CDN) — for property location display
               https://unpkg.com/leaflet@1.9.4/dist/leaflet.js

FONTS:         Cairo (Arabic + Latin) — from Google Fonts
               Perfect for bilingual Arabic/English UI
               Weight: 300, 400, 600, 700, 900

STORAGE:       localStorage for: JWT token, refresh token,
               user info, language preference

FILE STRUCTURE:
━━━━━━━━━━━━━━
frontend/
├── index.html              ← Landing/Home page
├── search.html             ← Property search & browse
├── property.html           ← Property detail (single)
├── login.html              ← Login
├── signup.html             ← Register
├── forgot-password.html    ← Forgot password
├── reset-password.html     ← Reset password (with token)
├── profile.html            ← User profile (shared: all roles)
├── favorites.html          ← Client: saved properties
├── my-orders.html          ← Client: my purchase orders
├── my-listings.html        ← Broker: my properties
├── create-property.html    ← Broker: post new listing
├── edit-property.html      ← Broker: edit listing
├── admin/
│   ├── dashboard.html      ← Admin home + KPI overview
│   ├── properties.html     ← Admin: manage/approve listings
│   ├── orders.html         ← Admin: all orders + invoices
│   ├── locations.html      ← Admin: manage locations CRUD
│   ├── analytics.html      ← Admin: full analytics page
│   └── activity.html       ← Admin: audit log viewer
├── css/
│   ├── main.css            ← Global styles, variables, reset
│   ├── components.css      ← Reusable components
│   └── admin.css           ← Admin-specific styles
└── js/
    ├── api.js              ← ALL API calls in one file
    ├── auth.js             ← Auth logic (login, logout, token refresh)
    ├── utils.js            ← Helpers (format price, dates, etc.)
    └── [page].js           ← One JS file per page

═══════════════════════════════════════════════════════════════════════
PART 2 — DESIGN SYSTEM (MANDATORY — FOLLOW EXACTLY)
═══════════════════════════════════════════════════════════════════════

AESTHETIC DIRECTION:
━━━━━━━━━━━━━━━━━━━

Premium Egyptian Real Estate Marketplace.
Think: luxury + trust + clarity.
Inspired by: high-end Cairo property developments.
Feel: confident, modern, premium — NOT generic.

Color Palette (CSS Variables):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

:root {
  /* Brand */
  --color-primary:        #1B4332;  /* Deep forest green — trust, wealth */
  --color-primary-light:  #2D6A4F;
  --color-primary-dark:   #0F2419;
  --color-accent:         #D4A853;  /* Gold — luxury, Egyptian heritage */
  --color-accent-light:   #E8C97A;
  --color-accent-dark:    #B8892E;

  /* Neutrals */
  --color-white:          #FFFFFF;
  --color-bg:             #F8F6F1;  /* Warm off-white — paper feel */
  --color-bg-2:           #EFECE4;
  --color-surface:        #FFFFFF;
  --color-border:         #E2DDD4;
  --color-border-light:   #F0EDE6;

  /* Text */
  --color-text:           #1A1A1A;
  --color-text-secondary: #5C5C5C;
  --color-text-muted:     #9C9A94;
  --color-text-inverse:   #FFFFFF;

  /* Semantic */
  --color-success:        #2D6A4F;
  --color-success-light:  #D1FAE5;
  --color-warning:        #D97706;
  --color-warning-light:  #FEF3C7;
  --color-error:          #DC2626;
  --color-error-light:    #FEE2E2;
  --color-info:           #2563EB;
  --color-info-light:     #DBEAFE;

  /* Status Colors — Properties/Orders */
  --status-pending:       #D97706;
  --status-approved:      #059669;
  --status-rejected:      #DC2626;
  --status-sold:          #7C3AED;
  --status-rented:        #0891B2;
  --status-inactive:      #9CA3AF;

  /* Spacing */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;

  /* Typography */
  --font-family: 'Cairo', sans-serif;
  --font-xs:   12px;
  --font-sm:   14px;
  --font-base: 16px;
  --font-lg:   18px;
  --font-xl:   20px;
  --font-2xl:  24px;
  --font-3xl:  30px;
  --font-4xl:  36px;
  --font-5xl:  48px;
  --font-6xl:  64px;

  /* Borders */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-2xl:  24px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm:   0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md:   0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-lg:   0 10px 30px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04);
  --shadow-xl:   0 20px 60px rgba(0,0,0,0.12);
  --shadow-card: 0 2px 8px rgba(27,67,50,0.08);

  /* Transitions */
  --transition-fast:   all 0.15s ease;
  --transition-base:   all 0.25s ease;
  --transition-slow:   all 0.4s ease;

  /* Layout */
  --container-max: 1280px;
  --navbar-height: 70px;
  --sidebar-width: 260px;
}

/* RTL Support — MANDATORY */
[dir="rtl"] {
  /* All flex/margin/padding directions flip automatically */
  /* Test every layout in both LTR and RTL */
}

Typography Rules:
━━━━━━━━━━━━━━━━

- Font: Cairo (weights 300, 400, 600, 700, 900)
- Arabic text: always direction: rtl, text-align: right
- English text: direction: ltr, text-align: left
- Price always: font-weight: 700, color: var(--color-primary)
- Page titles: font-size: var(--font-4xl), font-weight: 700
- Section headers: font-size: var(--font-2xl), font-weight: 600
- Body text: font-size: var(--font-base), line-height: 1.7

═══════════════════════════════════════════════════════════════════════
PART 3 — COMPONENT SPECIFICATIONS (BUILD ALL OF THESE)
═══════════════════════════════════════════════════════════════════════

COMPONENT 1 — NAVBAR (appears on every page)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Desktop layout:
[LOGO] .................. [Search Bar] .. [AR/EN] [Login] [Post Property]

Mobile layout (hamburger menu):
[LOGO] ........................... [AR/EN] [☰]
[Dropdown: nav links + login + post property]

Behavior:
- Logo: site name in Arabic + English, green color
- Search bar: searches properties (redirects to search.html?q=...)
- Language toggle: AR / EN — switches ALL page text, stores in localStorage
- If logged in: show user avatar + dropdown (Profile, My Orders/Listings, Logout)
- "Post Property" button: gold color, only if logged in as broker/admin
- Sticky on scroll with subtle box-shadow appearing
- Transparent → solid white on scroll

COMPONENT 2 — PROPERTY CARD (used in all listing grids)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Layout:
┌─────────────────────────────────────────┐
│  [PRIMARY IMAGE - 16:9 ratio]           │
│  [BADGE: For Sale / For Rent]           │
│  [BADGE: Primary / Resale]  [❤ Save]   │
├─────────────────────────────────────────┤
│  [PRICE] EGP — [installment note]      │
│  [TITLE in current language]            │
│  📍 [Location: City, Governorate]       │
│  🛏 [beds] 🚿 [baths] 📐 [sqm]        │
│  [CATEGORY badge] [STATUS badge]        │
└─────────────────────────────────────────┘

Rules:
- Image: object-fit: cover, lazy loading
- Heart icon: filled if in favorites (requires auth check)
- Price format: toLocaleString('ar-EG') for Arabic, 'en-EG' for English
- "EGP X,XXX,XXX" format — never show raw numbers
- If installment_years > 0: show "قسط / Installment"
- Hover: lift shadow + scale(1.02) on image
- Status badge colors: use --status-* variables
- Click: navigate to property.html?id={id}

COMPONENT 3 — FILTER SIDEBAR (search.html)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Filters to include (matching EXACTLY the backend API params):
1. Listing Type: For Sale | For Rent (radio buttons)
2. Category: Dropdown (populated from API: GET /api/properties data)
3. Location: Dropdown (GET /api/locations)
4. Property Origin: Primary | Resale (radio)
5. Price Range: Min price + Max price (number inputs in EGP)
6. Bedrooms: 1 | 2 | 3 | 4 | 5+ (button group)
7. Search: Text input (searches title in Arabic/English)

Sort options (above results):
- Price: Low to High
- Price: High to Low
- Newest First
- Oldest First
- Area: Small to Large
- Bedrooms: Most

Mobile: filters in a slide-in drawer from bottom
Desktop: sticky sidebar 280px wide

Active filter pills: show applied filters as removable chips above results

COMPONENT 4 — IMAGE GALLERY (property.html)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Layout:
- Main image: large, 60% of viewport height
- Thumbnails row below: scrollable, click to switch
- Lightbox: opens on main image click, keyboard navigation (←→ Esc)
- "View All X Photos" button on mobile
- If no images: show elegant placeholder with icon

COMPONENT 5 — STATUS BADGE
━━━━━━━━━━━━━━━━━━━━━━━━━━

<span class="badge badge--{status}">
  Pending Review | Approved | Rejected | Sold | Rented | Inactive
  قيد المراجعة | موافق عليه | مرفوض | مباع | مؤجر | غير نشط
</span>

COMPONENT 6 — PAGINATION
━━━━━━━━━━━━━━━━━━━━━━━━━

[← Prev] [1] [2] [3] ... [12] [Next →]
Show: "Showing 1-20 of 150 results" / "عرض ١-٢٠ من ١٥٠ نتيجة"
Arabic: use Arabic numerals (١٢٣)
English: use Western numerals (123)

COMPONENT 7 — TOAST NOTIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Position: top-right (LTR) / top-left (RTL)
Types: success ✅ | error ❌ | warning ⚠️ | info ℹ️
Auto-dismiss: 4 seconds
Slide-in animation from edge
Stack multiple toasts vertically

COMPONENT 8 — CONFIRMATION MODAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For: delete property, reject order, approve listing
Shows: icon + message + [Cancel] [Confirm] buttons
Background: dark overlay blur
Animation: scale in from center

COMPONENT 9 — LOADING SKELETON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Show skeletons that match the layout of:
- Property card skeleton (for grid loading)
- Property detail skeleton
- Table row skeleton (for admin tables)
Animate with shimmer effect (CSS animation)

COMPONENT 10 — EMPTY STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━

For: no search results, no favorites, no orders
Show: SVG illustration + title + description + CTA button
Make it friendly and on-brand (green tones)

═══════════════════════════════════════════════════════════════════════
PART 4 — PAGE SPECIFICATIONS (BUILD ALL OF THESE PAGES)
═══════════════════════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 1: index.html — LANDING PAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 1 — HERO:
- Full-width, min-height: 90vh
- Background: deep green gradient with subtle geometric pattern
- Large headline in Arabic + English (bilingual)
  AR: "اعثر على منزل أحلامك في مصر"
  EN: "Find Your Dream Home in Egypt"
- Subtitle: brief description
- SEARCH BOX (large, prominent):
  [Dropdown: For Sale/Rent] [Location dropdown] [Search input] [🔍 Search]
- Stats bar below search:
  [X,XXX Properties] | [XX Cities] | [XX+ Developers] | [Trusted by Thousands]
  (These numbers: either hardcoded or fetched from analytics API)

SECTION 2 — BROWSE BY CATEGORY:
- API: GET /api/properties to extract unique categories OR use seeded list
- 13 category cards in responsive grid
- Each card: icon + name in current language + property count
- Clicking filters search page

SECTION 3 — FEATURED PROPERTIES:
- API: GET /api/properties?limit=8&sort_by=created_at&sort_order=desc
- Show 8 newest approved properties
- Property card grid (4 cols desktop, 2 tablet, 1 mobile)
- [View All Properties →] button

SECTION 4 — BROWSE BY LOCATION:
- API: GET /api/locations
- Show top governorates as cards
- Each: governorate name + city count + "Browse →"
- Horizontal scrollable on mobile

SECTION 5 — SEARCH BY TYPE:
- Two large cards side by side:
  [🏠 للبيع / For Sale] [🔑 للإيجار / For Rent]
  Each with background image, count, and link

SECTION 6 — WHY CHOOSE US:
- 4 feature cards: ✅ Verified Listings, 🔒 Secure Process,
  🗺️ All Egypt, 💼 Professional Brokers

SECTION 7 — CTA FOR BROKERS:
- "Are you a broker? Post your listings for free"
- [Register as Broker] button — gold accent

SECTION 8 — FOOTER:
- Logo + tagline
- Links: Home, Search, About, Contact
- Social media icons
- Copyright: "© 2025 [Site Name] — جميع الحقوق محفوظة"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 2: search.html — PROPERTY SEARCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API: GET /api/properties (with all filter params)
Layout: [Filter Sidebar | Results Grid]
Desktop: 280px sidebar + flex-fill grid
Mobile: filters in drawer, full-width grid

Results grid: 2 cols desktop, 1 col mobile
Results header: "[X] Properties Found" + Sort dropdown
URL params: update URL when filters change (for sharing/bookmarking)
Auto-apply filters as user changes them (500ms debounce)

Loading: show skeleton cards while fetching
Error: show error state with retry button
Empty: show empty state with "Try different filters" suggestion

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 3: property.html — PROPERTY DETAIL PAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API: GET /api/properties/:id (from URL param ?id=...)

Layout (Desktop): Main content (70%) | Sticky Sidebar (30%)
Layout (Mobile): Stacked, sidebar becomes bottom section

MAIN CONTENT:
1. Breadcrumb: Home > [Category] > [Location] > [Title]
2. Image Gallery (Component 4)
3. Title + Status badge
4. Price section:
   - Main price: "EGP 2,500,000" — large, bold, green
   - If installment: "Down: EGP 500,000 | X years installment"
   - Delivery date if exists
5. Key specs bar:
   🛏 X Beds | 🚿 X Baths | 📐 XXX m² | 🏢 Floor X | [Finishing] | [Legal Status]
6. Description (in current language)
7. Amenities grid: show all amenities as icon+name chips
8. Developer & Project info (if exists)
9. Location section:
   - Address: City, Governorate
   - Leaflet map showing pin at lat/lng
10. Related properties: GET /api/properties?location_id=X&limit=4

STICKY SIDEBAR:
1. "Request Purchase" button (requires login as client)
   → POST /api/orders {property_id, notes}
2. "Save to Favorites" button
   → POST/DELETE /api/favorites
3. Broker info card (if property has owner info — show generic for now)
4. Share buttons: copy link, WhatsApp, Facebook

ORDER FLOW:
- Click "Request Purchase" → if not logged in: redirect to login
- If logged in as client: show modal with notes input + confirm
- Show success toast + redirect to my-orders.html

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 4 & 5: login.html + signup.html
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LOGIN:
- Centered card on green gradient background
- Logo on top
- Fields: Email + Password (toggle visibility)
- [Login] button — loading state while API call
- [Forgot Password?] link
- [Create Account] link
- API: POST /api/auth/login
- On success: store token + user info in localStorage, redirect to home

SIGNUP:
- Same centered card design
- Fields (matching backend validation):
  First Name | Last Name
  Email | Phone Number
  Password (with strength indicator)
  Language Preference: [عربي / English] toggle
  Role: [أنا مشتري/مستأجر (Client)] [أنا وسيط عقاري (Broker)]
- API: POST /api/auth/signup
- Validation: show inline errors matching backend Joi rules

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 6 & 7: forgot-password.html + reset-password.html
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FORGOT PASSWORD:
- Simple centered form
- Email input
- Success message: "If this email is registered, you will receive a reset link"
- API: POST /api/auth/forgot-password

RESET PASSWORD:
- Read token from URL params: ?token=XXX
- If no token: show error, redirect to forgot password
- New password + confirm password fields
- API: POST /api/auth/reset-password {token, new_password}
- On success: redirect to login

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 8: profile.html — USER PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API: GET /api/auth/profile
Requires: auth

Layout: Sidebar navigation + content area
Sidebar tabs:
1. Profile Info (active)
2. Change Password
3. Language Preference

PROFILE INFO TAB:
- Shows: full name, email, phone, role, member since
- Inline edit: click Edit → form appears with prefilled values
- API: PUT /api/auth/profile {first_name, last_name, phone_number, preferred_language}

CHANGE PASSWORD TAB:
- Current Password | New Password | Confirm New Password
- API: POST /api/auth/change-password
- On success: logout and redirect to login (token invalidated)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 9: favorites.html — SAVED PROPERTIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API: GET /api/favorites
Requires: auth

- Header: "المفضلة / My Favorites (X)"
- Property card grid (same as search results)
- Each card: ❤ filled icon + "Remove" button
- Remove: DELETE /api/favorites/:propertyId
- Empty state: "لا يوجد عقارات محفوظة بعد / No saved properties yet"
  + [Browse Properties] button

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 10: my-orders.html — CLIENT ORDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API: GET /api/orders/my
Requires: auth

Table columns:
Property | Price | Status | Order Date | Actions

Status badges: pending / accepted / rejected / completed / cancelled
Actions: [View Details] button
Click row → show order detail in modal or expand

Empty state: "لا يوجد طلبات شراء بعد / No purchase requests yet"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 11: my-listings.html — BROKER PROPERTIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOTE: Use GET /api/properties/admin/all filtered by auth user
(or use GET /api/properties with additional broker filtering)
Requires: auth (broker/admin)

Header: "عقاراتي / My Listings" + [+ Add New Listing] button

Table view with columns:
Image | Title | Category | Price | Status | Views | Created | Actions

Actions per row: [Edit] [Manage Images] [Delete]
Grouped status filter tabs: All | Pending | Approved | Rejected | Sold

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 12: create-property.html — POST LISTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API: POST /api/properties
Requires: auth (broker/admin)

MULTI-STEP FORM (5 steps with progress bar):

STEP 1 — Basic Info:
- Title Arabic (title_ar) — REQUIRED
- Title English (title_en) — REQUIRED
- Description Arabic (description_ar)
- Description English (description_en)
- Category (dropdown: GET /api/locations for location list)
- Listing Type: For Sale / For Rent (radio)
- Property Origin: Primary / Resale (radio)

STEP 2 — Location & Details:
- Location (cascading: Governorate → City → Neighborhood)
  GET /api/locations → build 3-level cascade
- Latitude + Longitude (with map pin picker via Leaflet)
- Floor Level
- Area (sqm)
- Bedrooms | Bathrooms

STEP 3 — Financial:
- Price (EGP) — REQUIRED
- Currency (EGP default)
- Down Payment
- Installment Years
- Delivery Date (date picker)
- Maintenance Deposit
- Commission Percentage

STEP 4 — Property Status:
- Finishing Type: Fully Finished / Semi-Finished / Core & Shell (radio)
- Legal Status: Ready / Under Construction / Off-Plan (radio)
- Developer (optional text or ID)
- Project (optional)
- Amenities: multi-select checkbox grid

STEP 5 — Review & Submit:
- Summary of all entered info
- [Back] [Submit Listing] buttons
- On submit: POST /api/properties
- On success: redirect to image upload for the new property ID

FORM UX RULES:
- Validate each step before proceeding
- Show inline errors under each field
- Save progress in localStorage (don't lose data on accidental close)
- Progress bar at top showing steps (1-2-3-4-5)
- Step navigation: [← Back] [Next →] on each step

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 13 (ADMIN): admin/dashboard.html — ADMIN HOME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API: GET /api/admin/analytics/overview
Requires: auth (admin)

Layout: Admin sidebar (fixed left/right) + main content

ADMIN SIDEBAR:
- Logo
- Nav links with icons:
  📊 Dashboard | 🏢 Properties | 📋 Orders | 📄 Invoices |
  📍 Locations | 📈 Analytics | 📜 Activity Log

DASHBOARD CONTENT:
1. KPI CARDS ROW (4 cards):
   - Total Properties (with pending count badge)
   - Total Users (with new this month)
   - Total Orders (with pending count)
   - Total Revenue in EGP

2. PENDING ACTIONS section:
   - "X properties awaiting approval" → [Review Now] button
   - "X orders awaiting response" → [Review Now] button

3. QUICK CHARTS (2 side by side):
   - Properties by Status (Pie chart — Chart.js)
   - Revenue Last 6 Months (Line chart)
   API: GET /api/admin/analytics/overview + GET /api/admin/analytics/revenue

4. RECENT ACTIVITY FEED:
   - Last 10 actions from GET /api/admin/analytics/recent-activity
   - Each: [avatar] [user] did [action] on [entity] — [time ago]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 14 (ADMIN): admin/properties.html — MANAGE LISTINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API: GET /api/properties/admin/all
     PATCH /api/properties/:id/status
     DELETE /api/properties/:id

Advanced data table:
- Search input (filter by title)
- Status filter tabs: All | Pending | Approved | Rejected | Sold | Rented
- Table columns: #, Image, Title, Owner, Category, Price, Location, Status, Date, Actions
- Actions: [✅ Approve] [❌ Reject] [🔵 Mark Sold] [🗑 Delete]
- Approve/Reject: PATCH /api/properties/:id/status {status: 'approved'/'rejected'}
- Bulk select: checkbox on each row + [Bulk Approve] [Bulk Reject] buttons
- Pagination: 20 per page
- Click property title: opens property.html in new tab

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 15 (ADMIN): admin/orders.html — MANAGE ORDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API: GET /api/orders/all
     PATCH /api/orders/:id/status
     POST /api/orders/invoices
     GET /api/orders/invoices
     PATCH /api/orders/invoices/:id/status

TWO TABS: [Orders] [Invoices]

ORDERS TAB:
- Table: #, Property, Client, Amount, Status, Date, Actions
- Actions: [Accept] [Reject] [Complete] [Cancel] + [Create Invoice]
- Status filter: All | Pending | Accepted | Completed | Cancelled

INVOICES TAB:
- Table: #, Order, Amount, Due Date, Status, Actions
- Actions: [Mark Paid] [Mark Overdue] [Cancel]
- Create Invoice modal: amount, due_date fields

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 16 (ADMIN): admin/analytics.html — FULL ANALYTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

APIs:
- GET /api/admin/analytics/overview
- GET /api/admin/analytics/revenue
- GET /api/admin/analytics/properties
- GET /api/admin/analytics/users
- GET /api/admin/analytics/orders
- GET /api/admin/analytics/locations

Layout: Tab navigation: Overview | Revenue | Properties | Users | Orders | Locations

OVERVIEW TAB:
- 6 KPI cards
- Summary charts

REVENUE TAB:
- Monthly revenue line chart (Chart.js)
- Revenue summary table
- Financial stats cards

PROPERTIES TAB:
- By Status: Pie chart
- By Category: Bar chart (horizontal)
- By Location: Bar chart
- By Listing Type: Donut chart
- By Origin: Donut chart
- By Finishing: Bar chart

USERS TAB:
- User growth over time: Line chart
- By Role: Pie chart (admin/broker/client)
- Top listers table (most properties)
- Top buyers table (most orders)

ORDERS TAB:
- Orders by status: Donut chart
- Recent orders table
- Conversion metrics

LOCATIONS TAB:
- Table: Location | Property Count | Avg Price | Active Listings
- Most popular governorates: horizontal bar chart

CHART STYLING:
- All charts: use brand colors (green + gold palette)
- Responsive: resize on window resize
- Tooltips: show formatted EGP prices
- Animations: ease-in on load

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 17 (ADMIN): admin/locations.html — MANAGE LOCATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API: GET /api/locations
     POST /api/locations
     PUT /api/locations/:id
     DELETE /api/locations/:id

Hierarchical tree display:
▼ القاهرة (Cairo) [Edit] [Delete] [+ Add City]
  ▼ مدينة نصر (Nasr City) [Edit] [Delete] [+ Add Neighborhood]
    ● الحي العاشر [Edit] [Delete]

Inline add/edit modals:
- Name Arabic + Name English
- Parent location (dropdown)
- Location type: Governorate / City / Neighborhood

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 18 (ADMIN): admin/activity.html — AUDIT LOG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API: GET /api/admin/analytics/recent-activity?limit=100

Table columns: #, User, Action, Entity, Details, IP Address, Timestamp

Features:
- Filter by action type (dropdown)
- Search by user email
- Timestamp: relative ("2 hours ago") + full on hover tooltip
- Details: expandable JSON viewer
- Auto-refresh every 30 seconds
- Color-coded rows by action type:
  Green: create/approve | Red: delete/reject | Blue: update | Gray: view

═══════════════════════════════════════════════════════════════════════
PART 5 — JAVASCRIPT ARCHITECTURE (api.js — MANDATORY STRUCTURE)
═══════════════════════════════════════════════════════════════════════

// api.js — ALL API CALLS CENTRALIZED HERE

const API_BASE = 'http://localhost:5000';

// Token management
const auth = {
  getToken: () => localStorage.getItem('access_token'),
  setToken: (token) => localStorage.setItem('access_token', token),
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  setRefreshToken: (token) => localStorage.setItem('refresh_token', token),
  getUser: () => JSON.parse(localStorage.getItem('user') || 'null'),
  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  isLoggedIn: () => !!localStorage.getItem('access_token'),
  getRole: () => auth.getUser()?.role,
  getLanguage: () => localStorage.getItem('language') || 'ar',
  clear: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }
};

// Base fetch with auto token injection + auto refresh on 401
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept-Language': auth.getLanguage(),
    ...(auth.getToken() && { Authorization: `Bearer ${auth.getToken()}` }),
    ...options.headers
  };

  let response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  // Auto refresh token on 401
  if (response.status === 401 && auth.getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${auth.getToken()}`;
      response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    } else {
      auth.clear();
      window.location.href = '/login.html';
      return;
    }
  }

  const data = await response.json();
  if (!response.ok) throw { status: response.status, ...data };
  return data;
}

// IMPLEMENT ALL 41 ENDPOINTS AS NAMED FUNCTIONS:
// Example:
const API = {
  // Auth
  login: (email, password) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({email, password}) }),
  signup: (data) => apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => apiFetch('/api/auth/logout', { method: 'POST' }),
  getProfile: () => apiFetch('/api/auth/profile'),
  updateProfile: (data) => apiFetch('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data) => apiFetch('/api/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  forgotPassword: (email) => apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({email}) }),
  resetPassword: (data) => apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),

  // Properties
  getProperties: (params) => apiFetch('/api/properties?' + new URLSearchParams(params)),
  getProperty: (id) => apiFetch(`/api/properties/${id}`),
  createProperty: (data) => apiFetch('/api/properties', { method: 'POST', body: JSON.stringify(data) }),
  deleteProperty: (id) => apiFetch(`/api/properties/${id}`, { method: 'DELETE' }),
  updatePropertyStatus: (id, status, reason) => apiFetch(`/api/properties/${id}/status`, { method: 'PATCH', body: JSON.stringify({status, reason}) }),
  adminGetProperties: (params) => apiFetch('/api/properties/admin/all?' + new URLSearchParams(params)),

  // Images
  getPropertyImages: (id) => apiFetch(`/api/properties/${id}/images`),
  uploadImages: (id, formData) => apiFetch(`/api/properties/${id}/images`, { method: 'POST', body: formData, headers: {'Accept-Language': auth.getLanguage()} }),
  deleteImage: (imageId) => apiFetch(`/api/properties/images/${imageId}`, { method: 'DELETE' }),

  // Orders
  createOrder: (data) => apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
  getMyOrders: (params) => apiFetch('/api/orders/my?' + new URLSearchParams(params)),
  adminGetOrders: (params) => apiFetch('/api/orders/all?' + new URLSearchParams(params)),
  updateOrderStatus: (id, status) => apiFetch(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({status}) }),

  // Invoices
  createInvoice: (data) => apiFetch('/api/orders/invoices', { method: 'POST', body: JSON.stringify(data) }),
  getInvoices: (params) => apiFetch('/api/orders/invoices?' + new URLSearchParams(params)),
  updateInvoiceStatus: (id, status) => apiFetch(`/api/orders/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify({status}) }),

  // Favorites
  addFavorite: (propertyId) => apiFetch('/api/favorites', { method: 'POST', body: JSON.stringify({property_id: propertyId}) }),
  getFavorites: () => apiFetch('/api/favorites'),
  removeFavorite: (propertyId) => apiFetch(`/api/favorites/${propertyId}`, { method: 'DELETE' }),

  // Locations
  getLocations: () => apiFetch('/api/locations'),
  getLocation: (id) => apiFetch(`/api/locations/${id}`),
  createLocation: (data) => apiFetch('/api/locations', { method: 'POST', body: JSON.stringify(data) }),
  updateLocation: (id, data) => apiFetch(`/api/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLocation: (id) => apiFetch(`/api/locations/${id}`, { method: 'DELETE' }),

  // Analytics
  analyticsOverview: () => apiFetch('/api/admin/analytics/overview'),
  analyticsRevenue: () => apiFetch('/api/admin/analytics/revenue'),
  analyticsProperties: () => apiFetch('/api/admin/analytics/properties'),
  analyticsUsers: () => apiFetch('/api/admin/analytics/users'),
  analyticsOrders: () => apiFetch('/api/admin/analytics/orders'),
  analyticsLocations: () => apiFetch('/api/admin/analytics/locations'),
  recentActivity: (limit = 50) => apiFetch(`/api/admin/analytics/recent-activity?limit=${limit}`),
};

═══════════════════════════════════════════════════════════════════════
PART 6 — BILINGUAL (AR/EN) IMPLEMENTATION RULES
═══════════════════════════════════════════════════════════════════════

MANDATORY RULES — EVERY PAGE MUST FOLLOW:

1. HTML lang attribute: <html lang="ar" dir="rtl"> (default Arabic)
   Switch to: <html lang="en" dir="ltr"> on language change

2. All static text: use data-i18n attribute
   <h1 data-i18n="hero.title">اعثر على منزل أحلامك</h1>

3. JavaScript translations object:
   const translations = {
     ar: { 'hero.title': 'اعثر على منزل أحلامك في مصر', ... },
     en: { 'hero.title': 'Find Your Dream Home in Egypt', ... }
   };
   function t(key) { return translations[auth.getLanguage()][key] || key; }

4. Language toggle: saves to localStorage, reloads page (or switches all text dynamically)

5. API calls: always send Accept-Language: ar OR en

6. Property data: API returns title_ar/title_en — show based on current language

7. Date formatting:
   Arabic: use toLocaleDateString('ar-EG')
   English: use toLocaleDateString('en-EG')

8. Number formatting:
   Arabic: use toLocaleString('ar-EG') → ١٢٣٬٤٥٦
   English: use toLocaleString('en-EG') → 123,456

9. Currency display:
   Arabic: "جنيه" or "ج.م" after number
   English: "EGP" before number

10. All form placeholders + labels in current language

═══════════════════════════════════════════════════════════════════════
PART 7 — RESPONSIVE DESIGN RULES (EVERY PAGE)
═══════════════════════════════════════════════════════════════════════

BREAKPOINTS:
- Mobile:  < 640px
- Tablet:  640px — 1024px
- Desktop: > 1024px

MOBILE RULES (all pages):
- Font sizes reduced by ~15%
- All grids collapse to 1 column (cards)
- Admin tables: horizontal scroll with sticky first column
- Sidebar: becomes slide-in drawer (hamburger trigger)
- Filter sidebar: becomes bottom sheet with "Apply Filters" button
- Image gallery: swipe-enabled (touch events)
- Floating [+ Post Property] action button in bottom-right for brokers
- Bottom navigation bar for mobile: [🏠] [🔍] [❤] [👤]

TABLET RULES:
- 2-column property grid
- Sidebar collapsible
- Tables: some columns hidden (priority columns only)

DESKTOP RULES:
- 3-4 column property grid
- Sidebar always visible
- Full table with all columns

═══════════════════════════════════════════════════════════════════════
PART 8 — ACCESSIBILITY & PERFORMANCE RULES
═══════════════════════════════════════════════════════════════════════

ACCESSIBILITY:
- All images: descriptive alt attributes in current language
- All form inputs: paired with <label>
- Color contrast: minimum 4.5:1 for text
- All interactive elements: visible focus states
- Keyboard navigation: Tab through all interactive elements
- ARIA labels on icon-only buttons
- Error messages linked to inputs via aria-describedby

PERFORMANCE:
- All images: loading="lazy"
- CSS: no unused imports, no heavy frameworks
- JS: defer non-critical scripts
- API: implement request debouncing (search: 500ms delay)
- API: implement simple in-memory cache (property lists: 60s TTL)
- Fonts: preload Cairo from Google Fonts
- Avoid layout shifts: set image dimensions in CSS

═══════════════════════════════════════════════════════════════════════
PART 9 — SECURITY RULES
═══════════════════════════════════════════════════════════════════════

MANDATORY:
- Never expose tokens in URL params
- XSS prevention: always use textContent/innerText, never innerHTML for user data
- Admin pages: check role === 'admin' on page load, redirect if not admin
- Broker pages: check role === 'broker' OR 'admin', redirect otherwise
- If no token: redirect to login.html with returnUrl param
- After login: redirect back to returnUrl
- Logout: call POST /api/auth/logout + clear localStorage + redirect to home

═══════════════════════════════════════════════════════════════════════
PART 10 — DELIVERY INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════

WHAT TO BUILD FIRST (in this exact order):

PHASE 1 — FOUNDATION (Build these first, everything depends on them):
1. css/main.css       — Full design system (all variables + reset + base)
2. css/components.css — All reusable components
3. js/api.js          — All 41 API functions
4. js/auth.js         — Token management + login/logout flow
5. js/utils.js        — formatPrice(), formatDate(), showToast(), showModal()

PHASE 2 — PUBLIC PAGES:
6.  index.html        — Landing page
7.  search.html       — Property search
8.  property.html     — Property detail

PHASE 3 — AUTH PAGES:
9.  login.html
10. signup.html
11. forgot-password.html
12. reset-password.html

PHASE 4 — USER PAGES:
13. profile.html
14. favorites.html
15. my-orders.html

PHASE 5 — BROKER PAGES:
16. my-listings.html
17. create-property.html
18. edit-property.html

PHASE 6 — ADMIN PAGES:
19. admin/dashboard.html
20. admin/properties.html
21. admin/orders.html
22. admin/locations.html
23. admin/analytics.html
24. admin/activity.html

═══════════════════════════════════════════════════════════════════════
NOW BEGIN — START WITH PHASE 1
═══════════════════════════════════════════════════════════════════════

Start by building Phase 1 completely:
1. css/main.css
2. css/components.css
3. js/api.js
4. js/auth.js
5. js/utils.js

Then ask me: "Phase 1 complete. Ready for Phase 2?" and I will confirm.

RULES FOR YOUR OUTPUT:
- Write COMPLETE files — never truncate or use comments like "// rest of code..."
- No placeholder text — real Arabic + English content only
- All CSS must be production-ready — no lazy shortcuts
- Test your HTML mentally for RTL + LTR both
- Every function must handle errors gracefully
- Comments in code: write them in both Arabic and English

BEGIN NOW.
```

---

## 📋 HOW TO USE THIS PROMPT

### Step 1 — Open Antigravity AI

Open the app on your desktop and start a new chat.

### Step 2 — Select the Model

Choose: `Gemini 2.5 Pro` (or latest Pro version available)

### Step 3 — Paste & Send

Copy everything inside the ` ` block above and paste it directly.

### Step 4 — Work in Phases

Gemini will build Phase 1 first.
After each phase completes, say:

> "Phase X complete. Now build Phase X+1."

### Step 5 — Save Each File

As Gemini gives you each file, copy it and save it to your computer
in the exact folder structure shown in the prompt.

---

## ⚠️ IMPORTANT TIPS

| Situation                  | What to do                                                |
| -------------------------- | --------------------------------------------------------- |
| Response cut off mid-code  | Type: "continue exactly where you stopped"                |
| File looks incomplete      | Type: "write the complete file, nothing truncated"        |
| Want a specific page first | Type: "skip to Page X — build it now"                     |
| Something looks wrong      | Type: "fix the [component name], it should [description]" |
| Want dark mode added       | Type: "add dark mode toggle to the design"                |
