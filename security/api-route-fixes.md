# API Route Security Fixes Checklist

**Priority:** CRITICAL - Deploy within 24-48 hours
**Test Environment:** Stage all changes before production deployment

---

## CRITICAL FIX #1: `/app/api/create-checkout/route.js`

**Priority:** IMMEDIATE (4 hours)
**Severity:** CRITICAL - No authentication, payment fraud risk

### Current Issues:
- ✗ No authentication check
- ✗ No validation that userId belongs to requester
- ✗ No check if user is already premium
- ✗ No founder spot reservation before checkout
- ✗ Metadata mismatch with webhook

### Required Changes:

**Replace entire file with:**
```javascript
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  console.log('=== CREATE CHECKOUT STARTED ===');

  try {
    // SECURITY FIX: Authenticate user
    const { user, error: authError } = await authenticateRequest(request);

    if (authError || !user) {
      console.error('Checkout: Unauthorized attempt', {
        hasAuth: !!authError,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY FIX: Use authenticated user ID (don't trust client)
    const userId = user.id;

    // Check Stripe configuration
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not configured');
      return NextResponse.json({
        error: 'Payment system unavailable'
      }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabaseAdmin = getSupabaseAdminClient();

    console.log('Creating checkout for user:', userId);

    // SECURITY FIX: Check if user is already premium
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, subscription_status')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Failed to fetch profile:', profileError);
      return NextResponse.json({
        error: 'Unable to verify account status'
      }, { status: 500 });
    }

    if (profile?.is_premium || profile?.subscription_status === 'active') {
      console.log('User already has premium access:', userId);
      return NextResponse.json({
        error: 'Already premium',
        message: 'You already have premium access'
      }, { status: 400 });
    }

    // SECURITY FIX: Reserve founder spot BEFORE creating Stripe session
    const { data: reservation, error: reservationError } = await supabaseAdmin
      .rpc('claim_founder_spot', { user_id_param: userId });

    if (reservationError) {
      console.error('Founder spot claim failed:', reservationError);
      return NextResponse.json({
        error: 'Unable to reserve founder spot'
      }, { status: 500 });
    }

    const reservationResult = reservation?.[0];

    if (!reservationResult?.success) {
      const reason = reservationResult?.failure_reason || 'unknown';

      if (reason === 'sold_out') {
        console.log('Founder spots sold out');
        return NextResponse.json({
          error: 'Sold out',
          message: 'All 25 founder spots have been claimed'
        }, { status: 410 });
      }

      if (reason === 'already_premium') {
        console.log('User already premium (race condition)');
        return NextResponse.json({
          error: 'Already premium',
          message: 'You already have premium access'
        }, { status: 400 });
      }

      console.error('Unknown founder spot claim failure:', reason);
      return NextResponse.json({
        error: 'Unable to reserve founder spot'
      }, { status: 500 });
    }

    console.log('Founder spot reserved, remaining:', reservationResult.remaining);

    // Get origin from headers
    const origin = request.headers.get('origin') || 'https://habitquest.dev';

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'HabitQuest Founder Access',
              description: `Lifetime premium access. ${reservationResult.remaining} of 25 spots remaining.`,
            },
            unit_amount: 4700, // $47.00 - server-side only!
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: userId,
      metadata: {
        supabase_user_id: userId,  // FIX: Match webhook expectation
        transaction_type: 'premium_subscription',
        spots_remaining: reservationResult.remaining,
      },
      // Expire session after 30 minutes
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
    });

    // Log successful checkout creation
    console.log('Stripe session created:', {
      sessionId: session.id,
      userId,
      spotsRemaining: reservationResult.remaining,
      timestamp: new Date().toISOString()
    });

    // Optional: Create audit log
    try {
      await supabaseAdmin.rpc('create_audit_log', {
        p_user_id: userId,
        p_event_type: 'checkout_created',
        p_event_data: {
          session_id: session.id,
          amount: 4700,
          spots_remaining: reservationResult.remaining
        }
      });
    } catch (auditError) {
      // Don't fail checkout if audit logging fails
      console.error('Audit log failed:', auditError);
    }

    return NextResponse.json({
      url: session.url,
      spots_remaining: reservationResult.remaining
    }, { status: 200 });

  } catch (error) {
    console.error('=== STRIPE CHECKOUT ERROR ===');
    console.error('Error:', error);

    // If Stripe session creation failed, restore the founder spot
    try {
      const supabaseAdmin = getSupabaseAdminClient();
      await supabaseAdmin.rpc('restore_founder_spot');
      console.log('Founder spot restored after error');
    } catch (restoreError) {
      console.error('Failed to restore founder spot:', restoreError);
      // This is serious - manual intervention may be needed
    }

    return NextResponse.json({
      error: 'Unable to create checkout session',
      message: 'Please try again later'
    }, { status: 500 });
  }
}
```

### Testing:
```bash
# Test 1: Unauthenticated request (should fail)
curl -X POST https://habitquest.dev/api/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"userId": "test"}' \
# Expected: 401 Unauthorized

# Test 2: Authenticated but already premium (should fail)
# (Use token from premium user)
# Expected: 400 Already premium

# Test 3: Valid request (should succeed)
# (Use token from free user)
# Expected: 200 with Stripe URL and spots_remaining
```

---

## CRITICAL FIX #2: `/app/api/transform-quest/route.js`

**Priority:** IMMEDIATE (24 hours)
**Severity:** CRITICAL - Unlimited API costs

### Required Changes:

**Add rate limiting at the top of the POST function:**
```javascript
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limiter'; // NEW IMPORT

export async function POST(request) {
  try {
    // Existing authentication code...
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // NEW: Check rate limit BEFORE expensive AI call
    const rateLimit = await checkRateLimit(user.id, 'transform-quest');

    if (!rateLimit.allowed) {
      console.warn('Rate limit exceeded:', {
        userId: user.id,
        endpoint: 'transform-quest',
        count: rateLimit.current,
        limit: rateLimit.limit,
        resetAt: rateLimit.reset_at
      });

      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: `You've reached your daily transformation limit (${rateLimit.limit}). Resets at ${new Date(rateLimit.reset_at).toLocaleTimeString()}.`,
        limit: rateLimit.limit,
        current: rateLimit.current,
        reset_at: rateLimit.reset_at
      }, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': Math.max(0, rateLimit.limit - rateLimit.current).toString(),
          'X-RateLimit-Reset': rateLimit.reset_at,
          'Retry-After': Math.ceil((new Date(rateLimit.reset_at) - new Date()) / 1000).toString()
        }
      });
    }

    // Existing code continues...
    const { questText, archetype, difficulty } = await request.json();

    // ... rest of existing code ...
  } catch (error) {
    // Existing error handling...
  }
}
```

### Configuration:
See `security/rate-limiting.ts` for full implementation.

### Testing:
```bash
# Test rate limiting
for i in {1..25}; do
  curl -X POST https://habitquest.dev/api/transform-quest \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"questText":"test","archetype":"warrior","difficulty":"easy"}' \
    && echo "Request $i succeeded"
done
# Expected: First 20 succeed (free tier), then 429 Rate Limit Exceeded
```

---

## CRITICAL FIX #3: `/app/api/setup-database/route.js`

**Priority:** IMMEDIATE (4 hours)
**Severity:** CRITICAL - Arbitrary SQL execution

### Recommended Fix: DELETE THE FILE

```bash
rm /home/user/arc-rpg/app/api/setup-database/route.js
```

**Rationale:**
- Database setup should NEVER be done via API endpoint
- Use Supabase Dashboard SQL Editor instead
- Or use migration files in `/supabase/migrations/`
- This endpoint is a massive security hole

### Alternative (if you insist on keeping it):

**Option A: Localhost only**
```javascript
export async function POST(request) {
  // Only allow from localhost
  const forwardedFor = request.headers.get('x-forwarded-for');
  const host = request.headers.get('host');

  if (!host?.includes('localhost') &&
      !host?.includes('127.0.0.1') &&
      forwardedFor !== '127.0.0.1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Rest of code...
}
```

**Option B: Multi-factor authentication**
```javascript
export async function POST(request) {
  const secret1 = request.headers.get('x-admin-secret-1');
  const secret2 = request.headers.get('x-admin-secret-2');
  const timestamp = request.headers.get('x-timestamp');

  // Validate timestamp is within 60 seconds
  const now = Date.now();
  const requestTime = parseInt(timestamp);
  if (!timestamp || Math.abs(now - requestTime) > 60000) {
    return NextResponse.json({ error: 'Request expired' }, { status: 401 });
  }

  // Validate both secrets
  if (secret1 !== process.env.ADMIN_SECRET_1 ||
      secret2 !== process.env.ADMIN_SECRET_2) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Secrets must be different
  if (secret1 === secret2) {
    return NextResponse.json({ error: 'Invalid secrets' }, { status: 401 });
  }

  // Rest of code...
}
```

**Still Recommended:** Just delete it.

---

## HIGH PRIORITY FIX #4: `/app/api/complete-quest/route.js`

**Priority:** HIGH (72 hours)
**Severity:** HIGH - Race condition, XP duplication

### Required Changes:

**Replace quest completion logic (lines 106-148):**
```javascript
// SECURITY FIX: Use atomic operation to prevent race conditions

// First, mark quest as completed ATOMICALLY
// This prevents duplicate completions
const { data: updatedQuest, error: updateError } = await supabaseAdmin
  .from('quests')
  .update({
    completed: true,
    completed_at: new Date().toISOString(),
  })
  .eq('id', quest_id)
  .eq('user_id', user.id)
  .eq('completed', false)  // CRITICAL: Only update if not already completed
  .select()
  .single();

if (updateError || !updatedQuest) {
  // Quest was already completed by another request
  console.warn('Quest already completed or not found:', {
    questId: quest_id,
    userId: user.id,
    error: updateError,
    timestamp: new Date().toISOString()
  });

  return NextResponse.json({
    error: 'Quest already completed',
    message: 'This quest has already been completed'
  }, { status: 400 });
}

// Quest is now locked as completed - safe to award rewards

// Calculate XP multiplier from equipped items
let xpMultiplier = 1.0;
if (profile.equipped_weapon_item) {
  xpMultiplier += (parseFloat(profile.equipped_weapon_item.xp_multiplier) - 1.0);
}
if (profile.equipped_armor_item) {
  xpMultiplier += (parseFloat(profile.equipped_armor_item.xp_multiplier) - 1.0);
}
if (profile.equipped_accessory_item) {
  xpMultiplier += (parseFloat(profile.equipped_accessory_item.xp_multiplier) - 1.0);
}

// Calculate comeback bonus
const comebackBonus = checkComebackBonus(profile.last_quest_date);
const bonusXP = comebackBonus ? 20 : 0;

// Calculate total XP
const baseXP = quest.xp_value + bonusXP;
const totalXP = Math.floor(baseXP * xpMultiplier);
const equipmentBonus = totalXP - baseXP;

// Calculate new level and streak
const newXP = profile.xp + totalXP;
const newLevel = Math.floor(newXP / 100) + 1;
const newStreak = calculateStreak(profile.last_quest_date, profile.current_streak);

// Calculate gold reward (server-side only!)
const goldReward = GOLD_REWARDS[quest.difficulty] || 50;

// Update profile with rewards
await supabaseAdmin
  .from('profiles')
  .update({
    xp: newXP,
    level: newLevel,
    current_streak: newStreak,
    longest_streak: Math.max(newStreak, profile.longest_streak || 0),
    last_quest_date: new Date().toISOString(),
  })
  .eq('id', user.id);

// Award gold using atomic transaction
const { data: goldTransaction, error: goldError } = await supabaseAdmin
  .rpc('process_gold_transaction', {
    p_user_id: user.id,
    p_amount: goldReward,
    p_transaction_type: 'quest_reward',
    p_reference_id: quest_id,
    p_metadata: {
      quest_difficulty: quest.difficulty,
      quest_text: quest.transformed_text,
      xp_earned: totalXP,
    }
  });

// Rest of code unchanged...
```

### Testing:
```bash
# Test race condition (should only award once)
quest_id="YOUR_QUEST_ID"
token="YOUR_TOKEN"

# Send two simultaneous requests
curl -X POST https://habitquest.dev/api/complete-quest \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d "{\"quest_id\":\"$quest_id\"}" &

curl -X POST https://habitquest.dev/api/complete-quest \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d "{\"quest_id\":\"$quest_id\"}" &

wait
# Expected: One 200 success, one 400 "already completed"
```

---

## MEDIUM PRIORITY FIX #5: `/app/api/transform-journal/route.js`

**Priority:** MEDIUM (1 week)
**Severity:** MEDIUM - Prompt injection, rate limit needed

### Required Changes:

**Add at the top of POST function:**
```javascript
export async function POST(request) {
  try {
    // Authentication (should already exist)
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // NEW: Rate limit journal transforms
    const rateLimit = await checkRateLimit(user.id, 'transform-journal');
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: `Daily journal transform limit reached (${rateLimit.limit}). Resets at ${new Date(rateLimit.reset_at).toLocaleTimeString()}.`
      }, { status: 429 });
    }

    const { entryText, mood, transform } = await request.json();

    // NEW: Validate input length (DB constraint is 50-2000)
    if (!entryText || typeof entryText !== 'string') {
      return NextResponse.json({
        error: 'Invalid entry text'
      }, { status: 400 });
    }

    if (entryText.length < 50 || entryText.length > 2000) {
      return NextResponse.json({
        error: 'Journal entry must be between 50 and 2000 characters'
      }, { status: 400 });
    }

    // NEW: Sanitize for prompt injection
    const sanitized = entryText
      .replace(/[<>]/g, '')  // Remove HTML
      .replace(/\{.*?system.*?\}/gi, '')  // Remove "system:" injection attempts
      .replace(/\[INST\].*?\[\/INST\]/gi, '')  // Remove instruction tags
      .trim();

    if (sanitized.length < 50) {
      return NextResponse.json({
        error: 'Entry too short after sanitization'
      }, { status: 400 });
    }

    // Rest of existing code...
    // Use 'sanitized' instead of 'entryText' in AI prompt
  } catch (error) {
    // Existing error handling...
  }
}
```

---

## Environment Variables Checklist

**Verify these are set correctly:**

```bash
# Server-side ONLY (never NEXT_PUBLIC_)
✓ SUPABASE_SERVICE_ROLE_KEY=...
✓ STRIPE_SECRET_KEY=sk_...
✓ STRIPE_WEBHOOK_SECRET=whsec_...
✓ ANTHROPIC_API_KEY=sk-ant-...

# Client-safe (NEXT_PUBLIC_ prefix OK)
✓ NEXT_PUBLIC_SUPABASE_URL=https://...
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Optional security secrets
✓ ADMIN_SECRET_1=... (for setup endpoint, if keeping it)
✓ ADMIN_SECRET_2=... (for setup endpoint, if keeping it)

# NEVER set these (security check will fail):
✗ NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY (Don't set!)
✗ NEXT_PUBLIC_STRIPE_SECRET_KEY (Don't set!)
✗ NEXT_PUBLIC_ANTHROPIC_API_KEY (Don't set!)
```

---

## Deployment Checklist

### Before Deployment:
- [ ] Run all fixes in staging environment first
- [ ] Test authentication on all modified routes
- [ ] Verify rate limiting works (try exceeding limits)
- [ ] Test race condition fix (simultaneous requests)
- [ ] Check database functions updated correctly
- [ ] Verify environment variables are set
- [ ] Review all console.log for sensitive data leaks

### During Deployment:
- [ ] Deploy database fixes first (`database-fixes.sql`)
- [ ] Deploy `rate-limiting.ts` library
- [ ] Deploy API route fixes one at a time
- [ ] Monitor error logs in real-time
- [ ] Keep rollback scripts ready

### After Deployment:
- [ ] Run penetration tests (see `penetration-test-plan.md`)
- [ ] Monitor API costs for 48 hours
- [ ] Check rate limit logs
- [ ] Verify no duplicate quest completions
- [ ] Test checkout flow end-to-end
- [ ] Monitor Stripe dashboard for issues

---

## Rollback Plan

If deployment causes issues:

### Quick Rollback:
```bash
# Revert to previous deployment
git revert [commit-hash]
git push origin main

# Or use Vercel rollback
vercel rollback
```

### Database Rollback:
Run the rollback section from `database-fixes.sql`

### Individual Route Rollback:
```bash
git checkout [previous-commit] -- app/api/[route-name]/route.js
git commit -m "Rollback [route-name]"
git push
```

---

## Monitoring After Deployment

**Watch these metrics for 48 hours:**
1. Anthropic API costs (should decrease or stay same)
2. Stripe checkout success rate (should stay same or improve)
3. Error rate in logs (should not increase)
4. Quest completion success rate (should stay same)
5. User complaints about rate limiting (tune limits if needed)

**Alert if:**
- Anthropic costs spike (rate limiting not working)
- Stripe checkout failures increase (auth too strict)
- Quest completion errors increase (race condition fix broke something)
- Users complain about hitting rate limits constantly (limits too low)

---

## Success Criteria

After deployment, you should see:
- ✓ Zero unauthorized checkout creations
- ✓ Anthropic API costs stable or decreasing
- ✓ No duplicate quest completions
- ✓ Founder spot count accurate
- ✓ All premium upgrades working correctly
- ✓ No XSS vulnerabilities in testing
- ✓ Rate limits preventing abuse
- ✓ Audit logs capturing all sensitive operations

If all success criteria met, security posture significantly improved!
