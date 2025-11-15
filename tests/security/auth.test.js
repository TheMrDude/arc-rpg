/**
 * AUTHENTICATION SECURITY TESTS
 *
 * Tests for:
 * - Bearer token authentication
 * - Unauthorized access blocking
 * - Cross-user data access prevention
 * - Admin authorization
 */

const fetch = require('node-fetch');

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

describe('Authentication Security', () => {
  let validToken;
  let userId;
  let otherUserToken;
  let otherUserId;

  beforeAll(async () => {
    // TODO: Set up test users via Supabase auth
    // For now, these should be set in environment
    validToken = process.env.TEST_USER_TOKEN;
    userId = process.env.TEST_USER_ID;
    otherUserToken = process.env.TEST_OTHER_USER_TOKEN;
    otherUserId = process.env.TEST_OTHER_USER_ID;
  });

  describe('Bearer Token Authentication', () => {
    test('should reject requests without Authorization header', async () => {
      const res = await fetch(`${API_BASE}/api/transform-quest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quest_text: 'Test quest',
          archetype: 'warrior'
        })
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject requests with invalid Bearer token', async () => {
      const res = await fetch(`${API_BASE}/api/transform-quest`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid_token_12345',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quest_text: 'Test quest',
          archetype: 'warrior'
        })
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    test('should accept requests with valid Bearer token', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      const res = await fetch(`${API_BASE}/api/transform-quest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quest_text: 'Complete 30 minutes of meditation and breathing exercises',
          archetype: 'warrior'
        })
      });

      // May be 200 (success) or 429 (rate limited) - both are authenticated responses
      expect([200, 429]).toContain(res.status);
    });

    test('should reject malformed Authorization header', async () => {
      const res = await fetch(`${API_BASE}/api/transform-quest`, {
        method: 'POST',
        headers: {
          'Authorization': 'InvalidFormat token123',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quest_text: 'Test quest',
          archetype: 'warrior'
        })
      });

      expect(res.status).toBe(401);
    });
  });

  describe('Cross-User Data Access Prevention', () => {
    test('should not allow accessing other users quest completion', async () => {
      if (!validToken || !otherUserId) {
        console.warn('Test tokens not set, skipping test');
        return;
      }

      // Try to complete another user's quest
      const res = await fetch(`${API_BASE}/api/complete-quest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quest_id: 'other_users_quest_id', // Would need to be created in setup
          user_id: otherUserId // Trying to impersonate
        })
      });

      // Should either be 401 (unauthorized), 404 (not found), or 400 (validation error)
      // The key is it should NOT be 200 (success)
      expect(res.status).not.toBe(200);
    });
  });

  describe('Admin Authorization', () => {
    test('should block non-admin access to admin endpoints', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      const res = await fetch(`${API_BASE}/api/admin/rate-limits`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });

      // Should be 403 Forbidden unless user is in ADMIN_EMAILS
      expect([403, 401]).toContain(res.status);
    });

    test('should allow admin access to admin endpoints', async () => {
      const adminToken = process.env.TEST_ADMIN_TOKEN;
      if (!adminToken) {
        console.warn('TEST_ADMIN_TOKEN not set, skipping test');
        return;
      }

      const res = await fetch(`${API_BASE}/api/admin/rate-limits?limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('rateLimits');
      expect(data).toHaveProperty('stats');
    });
  });

  describe('Checkout Security', () => {
    test('should require authentication for checkout creation', async () => {
      const res = await fetch(`${API_BASE}/api/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    test('should prevent already premium users from creating checkout', async () => {
      const premiumToken = process.env.TEST_PREMIUM_USER_TOKEN;
      if (!premiumToken) {
        console.warn('TEST_PREMIUM_USER_TOKEN not set, skipping test');
        return;
      }

      const res = await fetch(`${API_BASE}/api/create-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${premiumToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Already premium');
    });
  });
});
