/**
 * The deleted payment.test.js had a test called
 * "should check both is_premium and subscription_status". Its body was a
 * console.warn and `expect(true).toBe(true)`. It never called isPremium().
 *
 * This is that test, actually written. It matters because before lib/premium.js
 * existed there were four different answers to "is this user Pro?", and a comped
 * account (is_premium true, subscription_status inactive) was Pro on the
 * dashboard and free in transform-quest.
 */
const { isPremium, PREMIUM_COLUMNS } = require('@/lib/premium');

describe('isPremium', () => {
  test('the comped/founder shape is Pro: is_premium true, subscription inactive', () => {
    // This is the exact profile that used to resolve differently per call site.
    expect(isPremium({ is_premium: true, subscription_status: 'inactive' })).toBe(true);
  });

  test('a real Stripe subscriber is Pro even if is_premium was never written', () => {
    expect(isPremium({ is_premium: false, subscription_status: 'active' })).toBe(true);
  });

  test('neither signal means free', () => {
    expect(isPremium({ is_premium: false, subscription_status: 'inactive' })).toBe(false);
  });

  test('subscription_tier is NOT an entitlement', () => {
    // Nothing resets tier when a subscription lapses, so trusting it would keep
    // a cancelled subscriber Pro forever. Guarded here so nobody adds it back.
    expect(isPremium({ subscription_tier: 'pro' })).toBe(false);
    expect(isPremium({ subscription_tier: 'founder' })).toBe(false);
  });

  test('a missing or null profile is free, not a crash', () => {
    // The failure mode this prevents is a thrown TypeError inside a route that
    // then 500s, rather than a user simply being treated as free.
    expect(isPremium(null)).toBe(false);
    expect(isPremium(undefined)).toBe(false);
    expect(isPremium({})).toBe(false);
  });

  test('truthy-but-not-true is not Pro', () => {
    // A string 'false' out of a query param, or 1 out of a raw driver, must not
    // silently grant Pro. The check is === true deliberately.
    expect(isPremium({ is_premium: 'true' })).toBe(false);
    expect(isPremium({ is_premium: 1 })).toBe(false);
  });

  test('status must be exactly active', () => {
    expect(isPremium({ subscription_status: 'trialing' })).toBe(false);
    expect(isPremium({ subscription_status: 'past_due' })).toBe(false);
    expect(isPremium({ subscription_status: 'ACTIVE' })).toBe(false);
  });

  test('PREMIUM_COLUMNS names every column the function reads', () => {
    // If someone adds a third signal to isPremium and forgets this constant,
    // queries silently stop selecting the column and every user reads as free.
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../../lib/premium.js'),
      'utf8'
    );
    const body = src.slice(src.indexOf('export function isPremium'));
    const read = [...body.matchAll(/profile\.([a-z_]+)/g)].map((m) => m[1]);
    for (const col of new Set(read)) {
      expect(PREMIUM_COLUMNS).toContain(col);
    }
  });
});
