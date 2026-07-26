/**
 * Stripe webhook signature verification.
 *
 * The deleted payment.test.js contained a test named "should validate Stripe
 * signature on webhook". It POSTed to http://localhost:3000 with no server
 * running, so it had never executed once — while sitting in a file whose name
 * implied the payment flow was covered. This is the single place where a missing
 * check costs real money: a forged webhook that passes verification grants
 * premium, or revokes it, for free.
 *
 * These tests use the REAL Stripe SDK against the REAL route handlers. Signatures
 * are constructed with the same HMAC-SHA256 scheme Stripe uses
 * (`t=<ts>,v1=<hex>` over `<ts>.<raw body>`), so a pass means
 * stripe.webhooks.constructEvent genuinely accepted or rejected the payload — not
 * that a mock said it did.
 *
 * There are TWO live webhook routes and both take payments, so both are covered:
 *   app/api/webhooks/stripe/route.ts  — subscriptions (pro upgrade / cancel)
 *   app/api/stripe-webhook/route.js   — gold purchases and checkout completion
 * A test that covered only one would leave a paid path unverified.
 */
const crypto = require('crypto');

const SECRET = 'whsec_testsecretusedonlyinthisfile';

// Set before the routes are imported: they read these at call time, but the
// Supabase client is constructed during the request, so it needs to be valid.
process.env.STRIPE_WEBHOOK_SECRET = SECRET;
process.env.STRIPE_SECRET_KEY = 'sk_test_notarealkey';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role-key';

/** Stripe's scheme: HMAC-SHA256 over "<timestamp>.<raw body>", hex. */
function signPayload(rawBody, secret = SECRET, timestamp = Math.floor(Date.now() / 1000)) {
  const mac = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex');
  return `t=${timestamp},v1=${mac}`;
}

const post = (rawBody, signature) =>
  new Request('https://habitquest.dev/api/webhook', {
    method: 'POST',
    headers: signature
      ? { 'stripe-signature': signature, 'content-type': 'application/json' }
      : { 'content-type': 'application/json' },
    body: rawBody,
  });

// An event type neither handler acts on, so a VALID signature exercises
// verification and then falls straight through to `{ received: true }` without
// touching the database. That keeps these tests hermetic while still proving the
// accept path really accepts.
const inertEvent = JSON.stringify({
  id: 'evt_test_inert',
  object: 'event',
  type: 'payment_intent.created',
  data: { object: { id: 'pi_test' } },
});

const ROUTES = [
  { name: 'webhooks/stripe (subscriptions)', load: () => require('@/app/api/webhooks/stripe/route') },
  { name: 'stripe-webhook (gold + checkout)', load: () => require('@/app/api/stripe-webhook/route') },
];

describe.each(ROUTES)('$name', ({ load }) => {
  let POST;
  beforeAll(() => {
    POST = load().POST;
  });

  test('REJECTS a request with no stripe-signature header', async () => {
    // The forgery attempt in its simplest form: just POST the JSON.
    const res = await POST(post(inertEvent, null));
    expect(res.status).toBe(400);
  });

  test('REJECTS a garbage signature header', async () => {
    const res = await POST(post(inertEvent, 'not-a-signature'));
    expect(res.status).toBe(400);
  });

  test('REJECTS a well-formed signature computed with the WRONG secret', async () => {
    // An attacker who knows the scheme but not the secret. This is the case that
    // matters: the header parses, the shape is right, the HMAC is wrong.
    const res = await POST(post(inertEvent, signPayload(inertEvent, 'whsec_attackerguess')));
    expect(res.status).toBe(400);
  });

  test('REJECTS a valid signature replayed against a TAMPERED body', async () => {
    // Capture a real signature, then change the payload — e.g. swap in your own
    // email so the upgrade lands on your account. The signature covers the body,
    // so this must fail.
    const signature = signPayload(inertEvent);
    const tampered = JSON.stringify({
      id: 'evt_test_inert',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test',
          mode: 'subscription',
          customer_details: { email: 'attacker@example.com' },
        },
      },
    });
    const res = await POST(post(tampered, signature));
    expect(res.status).toBe(400);
  });

  test('REJECTS a signature whose timestamp is outside the tolerance window', async () => {
    // Replay protection. An old-but-genuine event captured from a log must not be
    // replayable days later.
    const stale = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 2;
    const res = await POST(post(inertEvent, signPayload(inertEvent, SECRET, stale)));
    expect(res.status).toBe(400);
  });

  test('REJECTS a body that is byte-different from the signed one, even if equal as JSON', async () => {
    // Verification must run on the RAW body. If a handler ever parsed the JSON
    // and re-serialised it before verifying, this semantically identical payload
    // with different whitespace would pass — and the check would be worthless.
    const signature = signPayload(inertEvent);
    const reformatted = JSON.stringify(JSON.parse(inertEvent), null, 2);
    expect(reformatted).not.toBe(inertEvent);
    expect(JSON.parse(reformatted)).toEqual(JSON.parse(inertEvent));
    const res = await POST(post(reformatted, signature));
    expect(res.status).toBe(400);
  });

  test('ACCEPTS a correctly signed payload', async () => {
    // Without this the six rejections above would pass just as well if the route
    // rejected everything unconditionally.
    const res = await POST(post(inertEvent, signPayload(inertEvent)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(expect.objectContaining({ received: true }));
  });

  test('a missing STRIPE_WEBHOOK_SECRET does not turn into an accept', async () => {
    // The failure mode that would silently disable the whole control: no secret
    // configured, constructEvent throws, and a `catch` that returned 200 would
    // make every forged event succeed. Must stay a rejection.
    const saved = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    try {
      const res = await POST(post(inertEvent, signPayload(inertEvent)));
      expect(res.status).toBeGreaterThanOrEqual(400);
    } finally {
      process.env.STRIPE_WEBHOOK_SECRET = saved;
    }
  });
});
