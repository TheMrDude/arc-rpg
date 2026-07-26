/**
 * The IP-trust decision on the one route where a stranger can spend money.
 *
 * /api/preview-quest is unauthenticated and calls a paid Anthropic API. Its old
 * limiter took `x-forwarded-for`'s FIRST entry as the identity. A client can send
 * that header; the platform appends rather than replaces, so entry [0] is
 * whatever the CALLER chose. Rotating a fake value per request gave a fresh
 * bucket every time -- unlimited calls, no concurrency required.
 *
 * These tests are the proof that the bypass is closed, written from the attacker's
 * side: each one is a spoof attempt that must not succeed.
 */
const { getTrustedClientIP, ipBucketKey, minutesUntilReset, ANON_LIMITS } =
  require('@/lib/anonRateLimit');

/** Minimal stand-in for the Headers/Request pair the route receives. */
const req = (headers) => ({
  headers: {
    get: (name) => {
      const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
      return key === undefined ? null : headers[key];
    },
  },
});

describe('getTrustedClientIP', () => {
  test('prefers the platform header over anything the client sent', () => {
    const ip = getTrustedClientIP(
      req({
        'x-forwarded-for': '1.1.1.1',
        'x-vercel-forwarded-for': '203.0.113.9',
        'x-real-ip': '198.51.100.4',
      })
    );
    expect(ip).toBe('203.0.113.9');
  });

  test('THE BYPASS: a spoofed x-forwarded-for prefix is ignored', () => {
    // The attacker prepends their own value; the platform appends the real one.
    // The old code returned '9.9.9.9' (attacker-chosen, rotatable). The last
    // entry is the hop closest to us, which the attacker cannot control.
    const ip = getTrustedClientIP(req({ 'x-forwarded-for': '9.9.9.9, 203.0.113.9' }));
    expect(ip).toBe('203.0.113.9');
    expect(ip).not.toBe('9.9.9.9');
  });

  test('THE BYPASS, harder: many spoofed hops still resolve to the trusted one', () => {
    const ip = getTrustedClientIP(
      req({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3, 203.0.113.9' })
    );
    expect(ip).toBe('203.0.113.9');
  });

  test('rotating a spoofed prefix does NOT produce a new bucket', () => {
    // This is the actual attack: a different fake IP per request. Every one must
    // land in the same bucket, or the limit means nothing.
    const keys = new Set(
      ['5.5.5.5', '6.6.6.6', '7.7.7.7', '8.8.8.8'].map((fake) =>
        ipBucketKey(getTrustedClientIP(req({ 'x-forwarded-for': `${fake}, 203.0.113.9` })))
      )
    );
    expect(keys.size).toBe(1);
  });

  test('falls back through the header order', () => {
    expect(getTrustedClientIP(req({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4');
    expect(getTrustedClientIP(req({ 'x-forwarded-for': '203.0.113.9' }))).toBe('203.0.113.9');
  });

  test('returns null when no header identifies the caller', () => {
    // Deliberately null rather than the old 'unknown' string. A shared bucket
    // lets one abuser exhaust every anonymous visitor's allowance at once; the
    // caller denies instead.
    expect(getTrustedClientIP(req({}))).toBeNull();
    expect(getTrustedClientIP(req({ 'x-forwarded-for': '' }))).toBeNull();
    expect(getTrustedClientIP(req({ 'x-forwarded-for': '   ' }))).toBeNull();
    expect(getTrustedClientIP(req({ 'x-real-ip': '  ' }))).toBeNull();
  });
});

describe('ipBucketKey', () => {
  test('never contains the address itself', () => {
    // These rows describe parents evaluating a children's app. Enforcing a
    // counter does not require storing where they live.
    const key = ipBucketKey('203.0.113.9');
    expect(key).not.toContain('203.0.113.9');
    expect(key).toMatch(/^ip:[0-9a-f]{32}$/);
  });

  test('is stable for one address and distinct across addresses', () => {
    expect(ipBucketKey('203.0.113.9')).toBe(ipBucketKey('203.0.113.9'));
    expect(ipBucketKey('203.0.113.9')).not.toBe(ipBucketKey('203.0.113.10'));
  });
});

describe('ANON_LIMITS', () => {
  test('preview-quest has both a per-IP and a global ceiling', () => {
    // The global one is the part that matters: no per-IP rule can stop a
    // distributed caller, and the thing being protected is a bill.
    const cfg = ANON_LIMITS['preview-quest'];
    expect(cfg.perIp.limit).toBeGreaterThan(0);
    expect(cfg.global.limit).toBeGreaterThan(cfg.perIp.limit);
    expect(cfg.global.windowMinutes).toBeGreaterThan(0);
  });
});

describe('minutesUntilReset', () => {
  test('reports whole minutes remaining', () => {
    expect(minutesUntilReset(new Date(Date.now() + 5 * 60_000).toISOString())).toBe(5);
  });

  test('never returns zero, a negative, or NaN', () => {
    // These go straight into copy a child reads ("try again in N minutes") and
    // into a Retry-After header some clients reject if it is negative.
    expect(minutesUntilReset(new Date(Date.now() - 60_000).toISOString())).toBe(1);
    expect(minutesUntilReset(null)).toBeGreaterThan(0);
    expect(minutesUntilReset('not a date')).toBeGreaterThan(0);
    expect(Number.isNaN(minutesUntilReset('not a date'))).toBe(false);
  });
});
