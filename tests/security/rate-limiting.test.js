/**
 * RATE LIMITING SECURITY TESTS
 *
 * Tests for:
 * - Request limits per endpoint
 * - Different limits for free vs premium
 * - Burst protection
 * - Proper 429 responses
 * - Reset timing
 */

const fetch = require('node-fetch');

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

// Helper to make multiple requests
async function makeRequests(endpoint, count, token, body) {
  const requests = [];
  for (let i = 0; i < count; i++) {
    requests.push(
      fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
    );
  }
  return Promise.all(requests);
}

describe('Rate Limiting', () => {
  let freeUserToken;
  let premiumUserToken;
  let testUserId;

  beforeAll(async () => {
    freeUserToken = process.env.TEST_USER_TOKEN;
    premiumUserToken = process.env.TEST_PREMIUM_USER_TOKEN;
    testUserId = process.env.TEST_USER_ID;
  });

  describe('Transform Quest Rate Limits', () => {
    test('should enforce rate limits on transform-quest endpoint', async () => {
      if (!freeUserToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      // Free users: 20 per day, 5 per minute burst
      // Try to exceed burst limit (6 requests in quick succession)
      const responses = await makeRequests(
        '/api/transform-quest',
        6,
        freeUserToken,
        {
          quest_text: 'Complete 30 minutes of meditation and breathing exercises',
          archetype: 'warrior'
        }
      );

      // At least one should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      // Check rate limit headers
      const limitedResponse = rateLimited[0];
      const data = await limitedResponse.json();
      expect(data.error).toBe('Rate limit exceeded');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('current');
      expect(data).toHaveProperty('reset_at');
      expect(data).toHaveProperty('retry_after');

      // Verify headers are set
      expect(limitedResponse.headers.get('X-RateLimit-Limit')).toBeTruthy();
      expect(limitedResponse.headers.get('X-RateLimit-Remaining')).toBeTruthy();
      expect(limitedResponse.headers.get('Retry-After')).toBeTruthy();
    }, 30000); // 30 second timeout for this test

    test('should have higher limits for premium users', async () => {
      if (!premiumUserToken) {
        console.warn('TEST_PREMIUM_USER_TOKEN not set, skipping test');
        return;
      }

      // Premium users: 200 per day, 5 per minute burst
      // Try 5 requests - should all succeed (unless already rate limited)
      const responses = await makeRequests(
        '/api/transform-quest',
        5,
        premiumUserToken,
        {
          quest_text: 'Complete 30 minutes of meditation and breathing exercises',
          archetype: 'warrior'
        }
      );

      // Count successful responses
      const successful = responses.filter(r => r.status === 200);

      // Premium users should have higher allowance
      // (May still hit burst protection, but should be more lenient)
      expect(successful.length).toBeGreaterThanOrEqual(3);
    }, 30000);
  });

  describe('Transform Journal Rate Limits', () => {
    test('should enforce stricter limits on journal transformation', async () => {
      if (!freeUserToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      // Free users: 5 per day, 3 per minute burst
      // Try to exceed burst limit (4 requests)
      const responses = await makeRequests(
        '/api/transform-journal',
        4,
        freeUserToken,
        {
          entry_text: 'Today was a challenging day. I struggled with focus and felt overwhelmed by my workload. But I managed to complete my meditation practice.',
          mood: 3,
          archetype: 'warrior'
        }
      );

      // At least one should be rate limited (stricter than quest transform)
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Rate Limit Response Format', () => {
    test('should return proper 429 response structure', async () => {
      if (!freeUserToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      // Make many requests to trigger rate limit
      const responses = await makeRequests(
        '/api/transform-quest',
        10,
        freeUserToken,
        {
          quest_text: 'Complete 30 minutes of meditation',
          archetype: 'warrior'
        }
      );

      const rateLimited = responses.find(r => r.status === 429);
      if (!rateLimited) {
        console.warn('Rate limit not triggered, skipping validation');
        return;
      }

      const data = await rateLimited.json();

      // Validate response structure
      expect(data).toMatchObject({
        error: 'Rate limit exceeded',
        message: expect.any(String),
        limit: expect.any(Number),
        current: expect.any(Number),
        reset_at: expect.any(String),
        retry_after: expect.any(Number)
      });

      // Validate headers
      expect(rateLimited.headers.get('Content-Type')).toBe('application/json');
      expect(rateLimited.headers.get('X-RateLimit-Limit')).toBeTruthy();
      expect(rateLimited.headers.get('X-RateLimit-Remaining')).toBeTruthy();
      expect(rateLimited.headers.get('X-RateLimit-Reset')).toBeTruthy();
      expect(rateLimited.headers.get('Retry-After')).toBeTruthy();

      // Validate retry_after is reasonable (not negative, not too far in future)
      expect(data.retry_after).toBeGreaterThan(0);
      expect(data.retry_after).toBeLessThan(86400); // Less than 1 day
    }, 30000);
  });

  describe('Admin Rate Limit Management', () => {
    test('should allow admins to clear rate limits', async () => {
      const adminToken = process.env.TEST_ADMIN_TOKEN;
      if (!adminToken || !testUserId) {
        console.warn('Admin credentials not set, skipping test');
        return;
      }

      const res = await fetch(`${API_BASE}/api/admin/clear-rate-limit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: testUserId,
          endpoint: 'transform-quest'
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.userId).toBe(testUserId);
      expect(data.endpoint).toBe('transform-quest');
    });

    test('should block non-admins from clearing rate limits', async () => {
      if (!freeUserToken || !testUserId) {
        console.warn('Test credentials not set, skipping test');
        return;
      }

      const res = await fetch(`${API_BASE}/api/admin/clear-rate-limit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${freeUserToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: testUserId,
          endpoint: 'transform-quest'
        })
      });

      expect(res.status).toBe(403);
    });
  });

  describe('Burst Protection', () => {
    test('should prevent burst attacks even within daily limit', async () => {
      if (!freeUserToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      // Try to send 10 requests simultaneously (well above burst limit)
      const start = Date.now();
      const responses = await makeRequests(
        '/api/transform-quest',
        10,
        freeUserToken,
        {
          quest_text: 'Complete 30 minutes of meditation',
          archetype: 'warrior'
        }
      );
      const duration = Date.now() - start;

      // Should have rate limited some requests
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      // Burst should be detected quickly (within 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Check that burst limit is indicated in response
      const limitedData = await rateLimited[0].json();
      // Message might indicate burst limit
      if (limitedData.message) {
        // Just verify we got a proper rate limit response
        expect(limitedData).toHaveProperty('retry_after');
      }
    }, 30000);
  });
});
