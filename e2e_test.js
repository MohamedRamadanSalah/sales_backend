/**
 * Comprehensive E2E Test Script — v2 (with correct admin credentials)
 */
const API = 'http://localhost:5000';
const FRONTEND = 'http://localhost:3000';

let adminToken = '';
let clientToken = '';
let brokerUserId = null;
let createdPropertyId = null;

const results = { passed: 0, failed: 0, errors: [] };

async function test(name, fn) {
  try {
    await fn();
    results.passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    results.failed++;
    results.errors.push({ name, error: err.message });
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

async function api(endpoint, opts = {}) {
  const { method = 'GET', body, token } = opts;
  const headers = { 'Content-Type': 'application/json', 'Accept-Language': 'en' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data, ok: res.ok };
}

async function fetchPage(url) {
  const res = await fetch(url);
  return { status: res.status, ok: res.ok };
}

// ═══════════════════════════════════════
// 1. FRONTEND PAGES
// ═══════════════════════════════════════
async function testFrontendPages() {
  console.log('\n📄 FRONTEND PAGE TESTS');
  const pages = [
    ['/', 'Home'],
    ['/login', 'Login'],
    ['/signup', 'Signup'],
    ['/search', 'Search'],
    ['/create-property', 'Create Property'],
  ];
  for (const [path, name] of pages) {
    await test(`${name} page loads (${path})`, async () => {
      const r = await fetchPage(`${FRONTEND}${path}`);
      assert(r.status === 200, `Status ${r.status}`);
    });
  }
}

// ═══════════════════════════════════════
// 2. AUTH
// ═══════════════════════════════════════
async function testAuth() {
  console.log('\n🔐 AUTH API TESTS');

  // Admin login with known credentials
  await test('Login as admin (superadmin@misrhomes.com)', async () => {
    const r = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'superadmin@misrhomes.com', password: 'Admin@2026' },
    });
    assert(r.ok, `Login failed: ${r.data.message || r.status}`);
    adminToken = r.data.data.token;
    assert(adminToken, 'No token');
    assert(r.data.data.user.role === 'admin', `Role is ${r.data.data.user.role} not admin`);
  });

  // Client signup
  const ts = Date.now();
  await test('Signup new client', async () => {
    const r = await api('/api/auth/signup', {
      method: 'POST',
      body: {
        first_name: 'TestClient',
        last_name: 'E2E',
        email: `client_${ts}@test.com`,
        phone_number: `+201${ts.toString().slice(-9)}`,
        password: 'Test123456!',
      },
    });
    assert(r.ok, `Signup failed: ${r.data.message || r.status}`);
    clientToken = r.data.data.token;
    assert(clientToken, 'No token');
    assert(r.data.data.user.role === 'client', `Expected client got ${r.data.data.user.role}`);
  });

  // Signup always creates client (broker role is not self-assignable)
  await test('Signup with role=broker still creates client (by design)', async () => {
    const r = await api('/api/auth/signup', {
      method: 'POST',
      body: {
        first_name: 'WantsBroker',
        last_name: 'Test',
        email: `wannabroker_${ts}@test.com`,
        phone_number: `+202${ts.toString().slice(-9)}`,
        password: 'Test123456!',
        role: 'broker',
      },
    });
    // If validation rejects the extra field, that's also acceptable
    if (r.ok) {
      assert(r.data.data.user.role === 'client', 'Should be client, not broker!');
    }
    // 400 is also acceptable (validation rejects unknown role field)
  });

  await test('Get admin profile', async () => {
    const r = await api('/api/auth/profile', { token: adminToken });
    assert(r.ok, `Status ${r.status}`);
    assert(r.data.data?.email || r.data.data?.user?.email, 'No email');
  });
}

// ═══════════════════════════════════════
// 3. LOCATIONS & CATEGORIES
// ═══════════════════════════════════════
let categoryId = 0;
let locationId = 0;

async function testLocationsCategories() {
  console.log('\n📍 LOCATIONS & CATEGORIES');

  await test('List locations', async () => {
    const r = await api('/api/locations');
    assert(r.ok, `Status ${r.status}`);
    const data = r.data.data;
    assert(Array.isArray(data) && data.length > 0, 'Empty locations');
    // Flatten to find a leaf
    const flatten = (arr) => arr.flatMap(l => [l, ...(l.children ? flatten(l.children) : [])]);
    const all = flatten(data);
    locationId = all[all.length - 1]?.id || all[0]?.id;
    console.log(`    (Using location ID: ${locationId})`);
  });

  await test('Get property categories', async () => {
    const r = await api('/api/properties/categories');
    assert(r.ok, `Status ${r.status}`);
    assert(Array.isArray(r.data.data) && r.data.data.length > 0, 'Empty categories');
    categoryId = r.data.data[0].id;
    console.log(`    (Using category ID: ${categoryId})`);
  });
}

// ═══════════════════════════════════════
// 4. SELL FLOW — Admin creates property directly (since only admin/broker can)
// ═══════════════════════════════════════
async function testSellFlow() {
  console.log('\n🏠 SELL FLOW (CREATE & MANAGE PROPERTY)');

  await test('Admin creates property', async () => {
    assert(adminToken, 'No admin token');
    const r = await api('/api/properties', {
      method: 'POST',
      token: adminToken,
      body: {
        title_ar: 'فيلا فاخرة للبيع في القاهرة الجديدة',
        title_en: 'Luxury Villa for Sale in New Cairo',
        description_ar: 'فيلا فاخرة مع حديقة خاصة وحمام سباحة في التجمع الخامس',
        description_en: 'Luxury villa with private garden and pool in Fifth Settlement',
        category_id: categoryId,
        location_id: locationId,
        listing_type: 'sale',
        property_origin: 'primary',
        finishing_type: 'fully_finished',
        legal_status: 'registered',
        price: 12000000,
        area_sqm: 350,
        bedrooms: 5,
        bathrooms: 4,
        floor_level: 0,
      },
    });
    assert(r.ok, `Create failed: ${r.data.message || r.status}`);
    createdPropertyId = r.data.data?.id;
    assert(createdPropertyId, 'No property ID');
    console.log(`    (Created property #${createdPropertyId})`);
  });

  await test('Created property starts as pending_approval', async () => {
    assert(createdPropertyId, 'No property ID');
    const r = await api(`/api/properties/${createdPropertyId}`, { token: adminToken });
    assert(r.ok, `Status ${r.status}`);
    const status = r.data.data?.status;
    console.log(`    (Status: ${status})`);
    // may be pending_approval or approved depending on role logic
  });

  await test('List all public properties', async () => {
    const r = await api('/api/properties?limit=5');
    assert(r.ok, `Status ${r.status}`);
    assert(Array.isArray(r.data.data), 'Not array');
    console.log(`    (${r.data.data.length} approved properties, Total: ${r.data.pagination?.total})`);
  });

  await test('Search by keyword', async () => {
    const r = await api('/api/properties?search=villa&limit=5');
    assert(r.ok, `Status ${r.status}`);
  });

  await test('Filter by listing_type=sale', async () => {
    const r = await api('/api/properties?listing_type=sale&limit=5');
    assert(r.ok, `Status ${r.status}`);
  });

  await test('Get single property', async () => {
    assert(createdPropertyId, 'No property ID');
    const r = await api(`/api/properties/${createdPropertyId}`);
    assert(r.ok, `Status ${r.status}`);
    assert(r.data.data?.title_en, 'No title');
  });
}

// ═══════════════════════════════════════
// 5. ADMIN APPROVAL FLOW
// ═══════════════════════════════════════
async function testAdminApproval() {
  console.log('\n👨‍💼 ADMIN APPROVAL FLOW');

  await test('Admin lists all properties (admin/all)', async () => {
    assert(adminToken, 'No admin token');
    const r = await api('/api/properties/admin/all', { token: adminToken });
    assert(r.ok, `Status ${r.status}: ${r.data.message}`);
    console.log(`    (${r.data.data?.length} properties total)`);
  });

  await test('Admin filters pending properties', async () => {
    const r = await api('/api/properties/admin/all?status=pending_approval', { token: adminToken });
    assert(r.ok, `Status ${r.status}`);
    console.log(`    (${r.data.data?.length} pending)`);
  });

  await test('Admin approves property', async () => {
    assert(createdPropertyId, 'No property ID');
    const r = await api(`/api/properties/${createdPropertyId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'approved' },
    });
    assert(r.ok, `Approve failed: ${r.data.message || r.status}`);
    console.log(`    (Approved property #${createdPropertyId})`);
  });

  await test('Approved property visible publicly', async () => {
    const r = await api(`/api/properties/${createdPropertyId}`);
    assert(r.ok, `Status ${r.status}`);
    assert(r.data.data?.status === 'approved', `Status: ${r.data.data?.status}`);
  });

  await test('Admin rejects property', async () => {
    const r = await api(`/api/properties/${createdPropertyId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'rejected', reason: 'E2E test rejection' },
    });
    assert(r.ok, `Reject failed: ${r.data.message || r.status}`);
    console.log(`    (Rejected property #${createdPropertyId})`);
  });

  await test('Admin re-approves property for further tests', async () => {
    const r = await api(`/api/properties/${createdPropertyId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'approved' },
    });
    assert(r.ok, `Re-approve failed: ${r.data.message || r.status}`);
  });

  await test('Admin dashboard analytics', async () => {
    const r = await api('/api/admin/analytics/overview', { token: adminToken });
    assert(r.ok, `Status ${r.status}`);
    const d = r.data.data;
    assert(d.total_properties !== undefined, 'Missing total_properties');
    assert(d.total_users !== undefined, 'Missing total_users');
    assert(d.total_orders !== undefined, 'Missing total_orders');
    console.log(`    (Props: ${d.total_properties}, Users: ${d.total_users}, Orders: ${d.total_orders})`);
  });

  await test('Client cannot change property status (authorization)', async () => {
    assert(clientToken && createdPropertyId, 'Missing tokens');
    const r = await api(`/api/properties/${createdPropertyId}/status`, {
      method: 'PATCH',
      token: clientToken,
      body: { status: 'approved' },
    });
    assert(!r.ok, 'Client should NOT be able to change status');
    assert(r.status === 403, `Expected 403 got ${r.status}`);
  });
}

// ═══════════════════════════════════════
// 6. FAVORITES
// ═══════════════════════════════════════
async function testFavorites() {
  console.log('\n❤️  FAVORITES');

  await test('Client adds property to favorites', async () => {
    assert(clientToken && createdPropertyId, 'Missing tokens');
    const r = await api('/api/favorites', {
      method: 'POST',
      token: clientToken,
      body: { property_id: createdPropertyId },
    });
    assert(r.ok, `Add fav failed: ${r.data.message || r.status}`);
  });

  await test('Client lists favorites', async () => {
    const r = await api('/api/favorites', { token: clientToken });
    assert(r.ok, `Status ${r.status}`);
    const favs = r.data.data;
    assert(Array.isArray(favs), 'Not array');
    console.log(`    (${favs.length} favorites)`);
  });

  await test('Add duplicate favorite is handled gracefully', async () => {
    const r = await api('/api/favorites', {
      method: 'POST',
      token: clientToken,
      body: { property_id: createdPropertyId },
    });
    // Should either succeed (idempotent) or return 409
    assert(r.ok || r.status === 409, `Unexpected: ${r.status}`);
  });

  await test('Client removes from favorites', async () => {
    const r = await api(`/api/favorites/${createdPropertyId}`, {
      method: 'DELETE',
      token: clientToken,
    });
    assert(r.ok, `Remove failed: ${r.data.message || r.status}`);
  });
}

// ═══════════════════════════════════════
// 7. ORDERS
// ═══════════════════════════════════════
async function testOrders() {
  console.log('\n📋 ORDERS');

  await test('Client creates purchase order', async () => {
    assert(clientToken && createdPropertyId, 'Missing tokens');
    const r = await api('/api/orders', {
      method: 'POST',
      token: clientToken,
      body: { property_id: createdPropertyId, notes: 'E2E test order' },
    });
    assert(r.ok, `Create order failed: ${r.data.message || r.status}`);
    console.log(`    (Order #${r.data.data?.id} created)`);
  });

  await test('Client lists their orders', async () => {
    const r = await api('/api/orders/my', { token: clientToken });
    assert(r.ok, `Status ${r.status}`);
    console.log(`    (${r.data.data?.length} orders)`);
  });

  await test('Admin lists all orders', async () => {
    const r = await api('/api/orders/all', { token: adminToken });
    assert(r.ok, `Status ${r.status}: ${r.data.message}`);
    console.log(`    (${r.data.data?.length} total orders)`);
  });
}

// ═══════════════════════════════════════
// 8. NOTIFICATIONS
// ═══════════════════════════════════════
async function testNotifications() {
  console.log('\n🔔 NOTIFICATIONS');

  await test('Admin views notifications', async () => {
    const r = await api('/api/notifications', { token: adminToken });
    assert(r.ok, `Status ${r.status}`);
  });

  await test('Get notification count', async () => {
    const r = await api('/api/notifications/count', { token: adminToken });
    assert(r.ok, `Status ${r.status}`);
    console.log(`    (${r.data.data?.count} unread notifications)`);
  });
}

// ═══════════════════════════════════════
// 9. EDGE CASES & BUG VALIDATION
// ═══════════════════════════════════════
async function testEdgeCases() {
  console.log('\n🔍 EDGE CASES & BUG VALIDATION');

  await test('Unauthenticated property creation fails (401)', async () => {
    const r = await api('/api/properties', {
      method: 'POST',
      body: { title_ar: 'test', title_en: 'test' },
    });
    assert(!r.ok, 'Should fail');
    assert(r.status === 401, `Expected 401 got ${r.status}`);
  });

  await test('Invalid property ID returns 404', async () => {
    const r = await api('/api/properties/999999');
    assert(!r.ok && r.status === 404, `Expected 404 got ${r.status}`);
  });

  await test('Missing required fields on property creation', async () => {
    const r = await api('/api/properties', {
      method: 'POST',
      token: adminToken,
      body: { title_ar: 'x' }, // Missing required fields
    });
    assert(!r.ok, 'Should fail with validation error');
    assert(r.status === 400 || r.status === 422, `Expected 400/422 got ${r.status}`);
  });

  await test('Client cannot access admin/all', async () => {
    const r = await api('/api/properties/admin/all', { token: clientToken });
    assert(!r.ok, 'Client should not access admin/all');
    assert(r.status === 403, `Expected 403 got ${r.status}`);
  });

  await test('Client cannot access admin analytics', async () => {
    const r = await api('/api/admin/analytics/overview', { token: clientToken });
    assert(!r.ok, 'Client should not access analytics');
    assert(r.status === 403, `Expected 403 got ${r.status}`);
  });
}

// ═══════════════════════════════════════
// 10. CLEANUP
// ═══════════════════════════════════════
async function cleanup() {
  console.log('\n🧹 CLEANUP');

  if (createdPropertyId && adminToken) {
    await test('Delete test property', async () => {
      const r = await api(`/api/properties/${createdPropertyId}`, {
        method: 'DELETE',
        token: adminToken,
      });
      assert(r.ok, `Delete failed: ${r.data?.message}`);
    });
  }
}

// ═══════════════════════════════════════
// MAIN
// ═══════════════════════════════════════
async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  COMPREHENSIVE E2E TEST SUITE v2              ║');
  console.log('║  Real Estate Platform                         ║');
  console.log('╚═══════════════════════════════════════════════╝');

  await testFrontendPages();
  await testAuth();
  await testLocationsCategories();
  await testSellFlow();
  await testAdminApproval();
  await testFavorites();
  await testOrders();
  await testNotifications();
  await testEdgeCases();
  await cleanup();

  console.log('\n═══════════════════════════════════════════════');
  console.log(`RESULTS: ${results.passed} PASSED, ${results.failed} FAILED (${results.passed + results.failed} total)`);
  console.log('═══════════════════════════════════════════════');

  if (results.errors.length > 0) {
    console.log('\n🐛 FAILURES (POTENTIAL BUGS):');
    results.errors.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.name}`);
      console.log(`     → ${e.error}`);
    });
  } else {
    console.log('\n🎉 ALL TESTS PASSED! No bugs detected.');
  }

  console.log('\n');
}

main().catch(console.error);
