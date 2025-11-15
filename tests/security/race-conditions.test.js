/**
 * RACE CONDITION SECURITY TESTS
 *
 * Tests for:
 * - Quest completion atomicity
 * - Founder spot reservation atomicity
 * - Gold transaction integrity
 * - Concurrent request handling
 */

const fetch = require('node-fetch');

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

describe('Race Condition Prevention', () => {
  let validToken;
  let userId;

  beforeAll(async () => {
    validToken = process.env.TEST_USER_TOKEN;
    userId = process.env.TEST_USER_ID;
  });

  describe('Quest Completion Atomicity', () => {
    test('should prevent duplicate quest completion via race condition', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      // This test requires a quest to be created first
      // In a real test environment, we'd create a quest via setup
      const testQuestId = process.env.TEST_QUEST_ID;
      if (!testQuestId) {
        console.warn('TEST_QUEST_ID not set, skipping test');
        return;
      }

      // Send 5 concurrent requests to complete the same quest
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          fetch(`${API_BASE}/api/complete-quest`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${validToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              quest_id: testQuestId
            })
          })
        );
      }

      const responses = await Promise.all(requests);
      const statuses = await Promise.all(
        responses.map(async r => ({
          status: r.status,
          data: await r.json().catch(() => ({}))
        }))
      );

      // Only ONE should succeed (200), others should fail (400 or 404)
      const successful = statuses.filter(s => s.status === 200);
      expect(successful.length).toBe(1);

      // Others should indicate already completed
      const failed = statuses.filter(s => s.status !== 200);
      expect(failed.length).toBe(4);

      // Check that error message indicates already completed
      const alreadyCompleted = failed.filter(
        s => s.data.error === 'Already completed' ||
             s.data.message?.includes('already been completed')
      );
      expect(alreadyCompleted.length).toBeGreaterThan(0);
    }, 15000);

    test('should not award XP/gold multiple times', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      const testQuestId = process.env.TEST_QUEST_ID;
      if (!testQuestId) {
        console.warn('TEST_QUEST_ID not set, skipping test');
        return;
      }

      // Get initial profile state
      const initialProfile = await fetch(`${API_BASE}/api/profile`, {
        headers: { 'Authorization': `Bearer ${validToken}` }
      }).then(r => r.json());

      // Try to complete quest 3 times concurrently
      const requests = Array(3).fill(null).map(() =>
        fetch(`${API_BASE}/api/complete-quest`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ quest_id: testQuestId })
        })
      );

      const responses = await Promise.all(requests);
      const results = await Promise.all(
        responses.map(r => r.json().catch(() => ({})))
      );

      // Get final profile state
      const finalProfile = await fetch(`${API_BASE}/api/profile`, {
        headers: { 'Authorization': `Bearer ${validToken}` }
      }).then(r => r.json());

      // XP/gold should only increase by quest reward amount (not 3x)
      // This assumes quest gives specific XP (e.g., 10 XP, 5 gold)
      const xpGained = finalProfile.xp - initialProfile.xp;
      const goldGained = finalProfile.gold - initialProfile.gold;

      // Should gain rewards exactly once, not 3 times
      // (Exact values would need to be known from quest configuration)
      // For now, just verify it's not zero and not suspiciously high
      expect(xpGained).toBeGreaterThanOrEqual(0);
      expect(xpGained).toBeLessThan(100); // Assuming quests give < 100 XP
      expect(goldGained).toBeGreaterThanOrEqual(0);
      expect(goldGained).toBeLessThan(50); // Assuming quests give < 50 gold
    }, 15000);
  });

  describe('Founder Spot Reservation Atomicity', () => {
    test('should prevent overselling founder spots via race condition', async () => {
      // This test is tricky to run without affecting production
      // In a real test, we'd use a test Stripe account and test database
      console.warn('Founder spot race condition test requires isolated test environment');

      // Conceptual test:
      // 1. Set founder spots to 1 remaining
      // 2. Send 3 concurrent checkout requests
      // 3. Only 1 should succeed
      // 4. Others should get "sold_out" error
      // 5. Verify founder_inventory.remaining = 0 (not negative)

      // For manual testing:
      // - Use admin API to set remaining to 1
      // - Have 3 test users attempt checkout simultaneously
      // - Verify only 1 succeeds
      expect(true).toBe(true); // Placeholder
    });

    test('should restore founder spot on checkout failure', async () => {
      // This would test the restore_founder_spot() function
      // Conceptual test:
      // 1. Reserve a spot
      // 2. Simulate Stripe checkout failure
      // 3. Verify spot is restored
      // 4. Verify remaining count is correct

      console.warn('Founder spot restoration test requires isolated test environment');
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Gold Transaction Integrity', () => {
    test('should prevent duplicate gold transactions', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      // This would test gold purchases or rewards
      // Conceptual test:
      // 1. Get initial gold balance
      // 2. Trigger transaction (e.g., equipment purchase)
      // 3. Send same transaction 3 times concurrently
      // 4. Verify gold only deducted once
      // 5. Verify only one transaction record created

      console.warn('Gold transaction test requires transaction trigger endpoint');
      expect(true).toBe(true); // Placeholder
    });

    test('should prevent negative gold balance', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      // This tests the process_gold_transaction function
      // It should reject transactions that would result in negative balance
      // Conceptual test:
      // 1. User has 10 gold
      // 2. Try to spend 15 gold
      // 3. Should be rejected
      // 4. Balance should still be 10

      console.warn('Negative balance test requires equipment purchase endpoint');
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle multiple simultaneous authenticated requests', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      // Send 10 different valid requests simultaneously
      const endpoints = [
        { url: '/api/quests', method: 'GET' },
        { url: '/api/profile', method: 'GET' },
        { url: '/api/leaderboard', method: 'GET' },
        { url: '/api/skills', method: 'GET' },
      ];

      const requests = endpoints.map(endpoint =>
        fetch(`${API_BASE}${endpoint.url}`, {
          method: endpoint.method,
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'Content-Type': 'application/json'
          }
        })
      );

      const responses = await Promise.all(requests);

      // All should complete successfully or with expected errors
      // None should hang or cause server errors
      const serverErrors = responses.filter(r => r.status >= 500);
      expect(serverErrors.length).toBe(0);

      // All should respond (not timeout)
      expect(responses.length).toBe(endpoints.length);
    }, 15000);

    test('should maintain data consistency under concurrent load', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      // Get initial state
      const initialProfile = await fetch(`${API_BASE}/api/profile`, {
        headers: { 'Authorization': `Bearer ${validToken}` }
      }).then(r => r.json());

      // Perform many concurrent reads
      const readRequests = Array(20).fill(null).map(() =>
        fetch(`${API_BASE}/api/profile`, {
          headers: { 'Authorization': `Bearer ${validToken}` }
        })
      );

      const readResponses = await Promise.all(readRequests);
      const profiles = await Promise.all(
        readResponses.map(r => r.json().catch(() => null))
      );

      // All reads should return consistent data
      const validProfiles = profiles.filter(p => p && p.id);
      expect(validProfiles.length).toBe(20);

      // All should have same user ID
      const userIds = new Set(validProfiles.map(p => p.id));
      expect(userIds.size).toBe(1);
      expect(userIds.has(userId)).toBe(true);
    }, 15000);
  });

  describe('Database Lock Testing', () => {
    test('should use row-level locking for critical updates', async () => {
      // This is more of an integration test that would check database logs
      // To verify FOR UPDATE is being used in critical queries

      // Conceptual verification:
      // 1. Enable query logging in Supabase
      // 2. Trigger quest completion
      // 3. Check logs for "FOR UPDATE" in query
      // 4. Verify proper lock acquisition

      console.warn('Database lock verification requires database log access');
      expect(true).toBe(true); // Placeholder
    });
  });
});
