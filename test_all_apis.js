const BASE_URL = 'http://localhost:3000';
const ADMIN_SUB = 'admin-123';

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'x-admin-sub': ADMIN_SUB,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const status = response.status;
  let data = null;
  try {
    data = await response.json();
  } catch (e) {}
  return { status, data };
}

async function runTests() {
  console.log('--- Starting API Tests ---');

  // 1. System
  const health = await api('/health');
  console.log(`[GET /health] Status: ${health.status}, OK: ${health.data?.status === 'ok'}`);

  const ready = await api('/ready');
  console.log(`[GET /ready] Status: ${ready.status}, Ready: ${ready.data?.status === 'ready'}`);

  // 2. Admin - Users
  console.log('\n--- Admin: Users ---');
  const createUser = await api('/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: `test-${Date.now()}@example.com`,
      password: 'Password123!',
      name: 'Test User',
      email_verified: true
    })
  });
  console.log(`[POST /admin/users] Status: ${createUser.status}`);
  const userSub = createUser.data?.data?.sub;

  if (userSub) {
    const getUser = await api(`/admin/users/${userSub}`);
    console.log(`[GET /admin/users/:sub] Status: ${getUser.status}, Email: ${getUser.data?.data?.email}`);

    const updateProfile = await api(`/admin/users/${userSub}/profile`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Name' })
    });
    console.log(`[PATCH /admin/users/:sub/profile] Status: ${updateProfile.status}, Name: ${updateProfile.data?.data?.name}`);

    const disableUser = await api(`/admin/users/${userSub}/disable`, { method: 'POST' });
    console.log(`[POST /admin/users/:sub/disable] Status: ${disableUser.status}, Status: ${disableUser.data?.data?.status}`);

    const enableUser = await api(`/admin/users/${userSub}/enable`, { method: 'POST' });
    console.log(`[POST /admin/users/:sub/enable] Status: ${enableUser.status}, Status: ${enableUser.data?.data?.status}`);
  }

  // 3. Admin - Clients
  console.log('\n--- Admin: Clients ---');
  const createClient = await api('/admin/clients', {
    method: 'POST',
    body: JSON.stringify({
      name: `Test Client ${Date.now()}`,
      redirectUris: ['http://localhost:4000/callback'],
      allowedScopes: ['openid', 'profile', 'email'],
      grantTypes: ['authorization_code', 'refresh_token'],
      responseTypes: ['code']
    })
  });
  console.log(`[POST /admin/clients] Status: ${createClient.status}`);
  const clientId = createClient.data?.data?.client?.clientId;

  if (clientId) {
    const listClients = await api('/admin/clients');
    console.log(`[GET /admin/clients] Status: ${listClients.status}, Count: ${listClients.data?.data?.length}`);

    const getClient = await api(`/admin/clients/${clientId}`);
    console.log(`[GET /admin/clients/:id] Status: ${getClient.status}, ID: ${getClient.data?.data?.clientId}`);

    const rotateSecret = await api(`/admin/clients/${clientId}/rotate-secret`, { method: 'POST' });
    console.log(`[POST /admin/clients/:id/rotate-secret] Status: ${rotateSecret.status}, Secret Updated: ${!!rotateSecret.data?.data?.clientSecret}`);

    const disableClient = await api(`/admin/clients/${clientId}/disable`, { method: 'POST' });
    console.log(`[POST /admin/clients/:id/disable] Status: ${disableClient.status}`);
  }

  // 4. OIDC
  console.log('\n--- OIDC ---');
  const jwks = await api('/jwks');
  console.log(`[GET /jwks] Status: ${jwks.status}, Keys: ${jwks.data?.keys?.length}`);

  console.log('\n--- Tests Completed ---');
}

runTests().catch(console.error);
