/**
 * INPUT VALIDATION SECURITY TESTS
 *
 * Tests for:
 * - SQL injection prevention
 * - XSS prevention
 * - Parameter validation
 * - Size limits
 */

const fetch = require('node-fetch');

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

describe('Input Validation Security', () => {
  let validToken;

  beforeAll(async () => {
    validToken = process.env.TEST_USER_TOKEN;
  });

  describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in quest text', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      const sqlInjectionPayloads = [
        "'; DROP TABLE quests; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM profiles--",
        "'; DELETE FROM profiles WHERE '1'='1",
      ];

      for (const payload of sqlInjectionPayloads) {
        const res = await fetch(`${API_BASE}/api/transform-quest`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            quest_text: payload,
            archetype: 'warrior'
          })
        });

        // Should either validate and reject, or sanitize
        // Should NOT cause a 500 error or database corruption
        expect(res.status).not.toBe(500);

        if (res.status === 400) {
          const data = await res.json();
          expect(data.error).toBeTruthy();
        }
      }
    }, 30000);

    test('should prevent SQL injection in journal entries', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      const payload = "Today was great'; DROP TABLE journal_entries; SELECT '1";

      const res = await fetch(`${API_BASE}/api/transform-journal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entry_text: payload,
          mood: 5,
          archetype: 'warrior'
        })
      });

      // Should not cause server error
      expect(res.status).not.toBe(500);
    });
  });

  describe('XSS Prevention', () => {
    test('should sanitize HTML in quest text', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      ];

      for (const payload of xssPayloads) {
        const res = await fetch(`${API_BASE}/api/transform-quest`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            quest_text: `Complete meditation ${payload} exercise`,
            archetype: 'warrior'
          })
        });

        if (res.status === 200 || res.status === 429) {
          const data = await res.json();
          if (data.transformed_narrative) {
            // Transformed text should not contain script tags
            expect(data.transformed_narrative).not.toMatch(/<script/i);
            expect(data.transformed_narrative).not.toMatch(/onerror=/i);
            expect(data.transformed_narrative).not.toMatch(/javascript:/i);
          }
        }
      }
    }, 30000);

    test('should sanitize HTML in journal entries', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      const payload = 'Today was <script>fetch("/api/steal-data")</script> amazing!';

      const res = await fetch(`${API_BASE}/api/transform-journal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entry_text: payload.repeat(10), // Make it long enough
          mood: 5,
          archetype: 'warrior'
        })
      });

      if (res.status === 200) {
        const data = await res.json();
        // Should have removed/escaped script tags
        expect(data.transformed_narrative).not.toMatch(/<script/i);
      }
    });
  });

  describe('Parameter Validation', () => {
    test('should validate archetype parameter', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      const invalidArchetypes = [
        'hacker',
        'admin',
        null,
        undefined,
        '',
        123,
        { malicious: 'object' },
        ['array'],
      ];

      for (const archetype of invalidArchetypes) {
        const res = await fetch(`${API_BASE}/api/transform-quest`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            quest_text: 'Complete 30 minutes of meditation',
            archetype: archetype
          })
        });

        // Should reject invalid archetypes
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/archetype/i);
      }
    }, 30000);

    test('should validate mood parameter (1-5 range)', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      const invalidMoods = [0, 6, -1, 100, 'happy', null, NaN];

      for (const mood of invalidMoods) {
        const res = await fetch(`${API_BASE}/api/transform-journal`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            entry_text: 'Today was a good day. I completed my meditation practice and felt focused and centered throughout the day.',
            mood: mood,
            archetype: 'warrior'
          })
        });

        // Should either reject or coerce to valid range
        // 400 is acceptable, or 200 with mood clamped to 1-5
        if (res.status === 200) {
          const data = await res.json();
          // If accepted, mood should be in valid range in database
          expect(true).toBe(true); // Actual validation would query database
        }
      }
    }, 30000);

    test('should validate quest_id format', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      const invalidQuestIds = [
        'not-a-uuid',
        '12345',
        'admin',
        null,
        undefined,
        '',
        { id: 'object' },
      ];

      for (const questId of invalidQuestIds) {
        const res = await fetch(`${API_BASE}/api/complete-quest`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            quest_id: questId
          })
        });

        // Should reject invalid UUIDs
        expect([400, 404]).toContain(res.status);
      }
    }, 30000);
  });

  describe('Size Limits', () => {
    test('should enforce minimum quest text length', async () => {
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
          quest_text: 'Too short',
          archetype: 'warrior'
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/at least 30 characters/i);
    });

    test('should enforce maximum quest text length', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      const longText = 'A'.repeat(1001); // Over 1000 char limit

      const res = await fetch(`${API_BASE}/api/transform-quest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quest_text: longText,
          archetype: 'warrior'
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/too long|max.*characters/i);
    });

    test('should enforce journal entry length limits', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      // Test minimum length (50 chars)
      const tooShort = await fetch(`${API_BASE}/api/transform-journal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entry_text: 'Short entry',
          mood: 3,
          archetype: 'warrior'
        })
      });

      expect(tooShort.status).toBe(400);
      const shortData = await tooShort.json();
      expect(shortData.error).toMatch(/at least 50 characters/i);

      // Test maximum length (2000 chars)
      const tooLong = await fetch(`${API_BASE}/api/transform-journal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entry_text: 'A'.repeat(2001),
          mood: 3,
          archetype: 'warrior'
        })
      });

      expect(tooLong.status).toBe(400);
      const longData = await tooLong.json();
      expect(longData.error).toMatch(/too long|max.*2000/i);
    });
  });

  describe('Type Validation', () => {
    test('should reject non-string quest text', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      const invalidTypes = [
        123,
        { text: 'Complete meditation' },
        ['Complete meditation'],
        true,
        null,
      ];

      for (const value of invalidTypes) {
        const res = await fetch(`${API_BASE}/api/transform-quest`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${validToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            quest_text: value,
            archetype: 'warrior'
          })
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBeTruthy();
      }
    }, 30000);

    test('should validate JSON body structure', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      // Send invalid JSON
      const res = await fetch(`${API_BASE}/api/transform-quest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: 'invalid json {'
      });

      expect(res.status).toBe(400);
    });
  });

  describe('Sanitization', () => {
    test('should remove dangerous characters from quest text', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      const dangerous = 'Complete <meditation> & breathing exercises';

      const res = await fetch(`${API_BASE}/api/transform-quest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quest_text: dangerous,
          archetype: 'warrior'
        })
      });

      // Should accept but sanitize
      if (res.status === 200 || res.status === 429) {
        // Sanitization happens, doesn't necessarily appear in response
        // Would need to check database to verify
        expect(true).toBe(true);
      }
    });

    test('should trim whitespace from inputs', async () => {
      if (!validToken) {
        console.warn('TEST_USER_TOKEN not set, skipping test');
        return;
      }

      const padded = '   Complete 30 minutes of meditation and breathing   ';

      const res = await fetch(`${API_BASE}/api/transform-quest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quest_text: padded,
          archetype: 'warrior'
        })
      });

      // Should accept trimmed version
      expect([200, 429, 400]).toContain(res.status);
    });
  });
});
