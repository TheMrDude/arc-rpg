# CLAUDE.md - AI Assistant Guidelines for HabitQuest (Arc RPG)

## Project Overview

**HabitQuest** is a gamification-based habit tracking application that transforms mundane tasks into epic RPG quests using AI. Users complete real-world tasks framed as RPG adventures, earning XP, gold, achievements, and equipment.

### Key Features
- **AI Quest Transformation**: Tasks are transformed into epic RPG narratives using Claude API
- **Progression System**: XP, levels, streaks, and achievements
- **Equipment & Gold**: In-game economy for cosmetics and equipment
- **Journaling**: AI-powered reflections on daily journal entries
- **Premium Features**: Founder spots, subscription benefits
- **Referral System**: User acquisition through referral codes

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15.5.9 (App Router) |
| Frontend | React 19, TailwindCSS 3.4 |
| State | Zustand 5.0.8 |
| Database | Supabase (PostgreSQL + Auth) |
| AI | Anthropic Claude API (@anthropic-ai/sdk) |
| Payments | Stripe 14.0.0 |
| Animation | Framer Motion 12.23, Lottie React |
| Analytics | PostHog |
| Testing | Jest 29.7 |

## Project Structure

```
arc-rpg/
├── app/                          # Next.js App Router
│   ├── api/                      # 48 API routes
│   │   ├── admin/                # Admin-only endpoints
│   │   ├── transform-quest/      # AI quest transformation
│   │   ├── complete-quest/       # Quest completion + rewards
│   │   ├── stripe-webhook/       # Payment webhooks
│   │   ├── journals/             # Journal CRUD
│   │   └── ...
│   ├── dashboard/                # Main user dashboard
│   ├── skills/                   # Skill tree page
│   ├── equipment/                # Inventory management
│   ├── shop/                     # Equipment/gold store
│   ├── journal/                  # Journal entries
│   ├── auth/                     # Auth callbacks
│   ├── onboarding/               # First-time user flow
│   ├── pricing/                  # Premium plans
│   ├── layout.js                 # Root layout
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── LoginTransition/          # Login animations
│   └── PricingSection.tsx        # Pricing UI
├── lib/                          # Core business logic
│   ├── supabase-server.js        # Server Supabase clients
│   ├── supabase-client.js        # Client Supabase
│   ├── api-auth.js               # Hybrid auth (Bearer + cookies)
│   ├── admin-auth.js             # Admin authorization
│   ├── rate-limiter.js           # Database-backed rate limiting
│   ├── achievements.ts           # Achievement system
│   ├── streaks.ts                # Streak calculations
│   ├── referrals.ts              # Referral system
│   └── ...
├── middleware.js                 # Auth + rate limiting
├── tests/security/               # Security test suites
├── supabase-migrations.sql       # DB migrations
└── public/                       # Static assets (images, sounds, PWA)
```

## Development Commands

```bash
npm run dev              # Start development server
npm run build            # Production build
npm start                # Start production server
npm run lint             # ESLint check

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:security    # Security tests only
npm run test:auth        # Authentication tests
npm run test:rate-limits # Rate limiting tests
npm run test:payment     # Payment tests
```

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # SERVER ONLY - Never expose

# Stripe (Required for payments)
STRIPE_SECRET_KEY=                # SERVER ONLY
STRIPE_WEBHOOK_SECRET=            # SERVER ONLY

# Anthropic Claude API (Required for AI features)
ANTHROPIC_API_KEY=                # SERVER ONLY

# Admin (Optional)
ADMIN_EMAILS=admin@example.com
```

**Security Rules:**
- `NEXT_PUBLIC_` prefix = exposed to client (safe for public keys only)
- Never prefix sensitive keys with `NEXT_PUBLIC_`
- Service role key grants FULL database access - never expose

## Code Conventions

### API Routes

API routes follow this pattern:

```javascript
import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // 1. Authenticate
    const { user, error: authError } = await authenticateRequest(request);
    if (authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limit check (BEFORE expensive operations)
    const rateLimit = await checkRateLimit(user.id, 'endpoint-name');
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    // 3. Parse and validate input
    const { field } = await request.json();
    if (!field || typeof field !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // 4. Business logic
    // ...

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Authentication

Two authentication methods are supported (see `lib/api-auth.js`):

1. **Bearer Token**: `Authorization: Bearer <token>` (mobile/API clients)
2. **HttpOnly Cookies**: Automatic from SSR/browser sessions

```javascript
import { authenticateRequest } from '@/lib/api-auth';

const { user, error } = await authenticateRequest(request);
```

### Supabase Clients

```javascript
// Server-side with admin privileges
import { getSupabaseAdminClient } from '@/lib/supabase-server';
const supabaseAdmin = getSupabaseAdminClient();

// Server-side with anon key (for JWT verification)
import { getSupabaseAnonClient } from '@/lib/supabase-server';
const supabaseAnon = getSupabaseAnonClient();
```

### Input Validation

Always validate and sanitize user input:

```javascript
// Length limits
if (questText.length > 500) {
  return NextResponse.json({ error: 'Quest text too long' }, { status: 400 });
}

// Enum validation
const validDifficulties = ['easy', 'medium', 'hard'];
if (!validDifficulties.includes(difficulty)) {
  return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
}

// Sanitize HTML
const sanitized = userInput.replace(/[<>]/g, '').trim();
```

### Path Aliases

Use `@/` for imports from the project root:

```javascript
import { something } from '@/lib/something';
import Component from '@/components/Component';
```

## Database Schema

### Key Tables

**profiles** - User data and stats
- `id` (uuid, PK) - matches auth.users.id
- `archetype` (warrior/builder/shadow/sage/seeker)
- `level`, `xp`, `gold`
- `current_streak`, `longest_streak`
- `is_premium`, `subscription_status`
- `is_admin`

**quests** - Task/quest records
- `id` (uuid, PK)
- `user_id` (FK to profiles)
- `original_task`, `epic_task`
- `difficulty` (easy/medium/hard)
- `xp_reward`, `completed`

**achievements** - Achievement definitions
- `key` (unique identifier)
- `category` (quests/streaks/social/levels/special)
- `rarity` (common/rare/epic/legendary)

**journal_entries** - User journals
- `content`, `mood`, `tags`
- `ai_reflection`

**equipment_catalog** - Equipment shop items
- `type` (weapon/armor/accessory)
- `stats` (jsonb), `price_gold`
- `rarity`

### Row-Level Security (RLS)

All tables use RLS. Users can only access their own data:
```sql
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);
```

## Key Business Logic

### Archetypes
- **Warrior**: Bold, action-oriented quests
- **Builder**: Construction/creation projects
- **Shadow**: Stealth missions, strategy
- **Sage**: Knowledge/wisdom quests
- **Seeker**: Exploration/discovery

### Difficulty & XP
- Easy: 10 XP
- Medium: 25 XP
- Hard: 50 XP

### Streaks
Milestone rewards at 7, 14, 30, 60, 90, 365 days

### Rate Limiting
- AI endpoints: 10 requests/hour (free), 50/hour (premium)
- General API: 30 requests/minute per IP

## Security Checklist

When modifying code, ensure:

1. **Authentication**: All protected endpoints use `authenticateRequest()`
2. **Authorization**: Admin routes check `is_admin` flag
3. **Rate Limiting**: Expensive operations check rate limits BEFORE execution
4. **Input Validation**: Validate type, length, and allowed values
5. **SQL Injection**: Use parameterized queries (Supabase handles this)
6. **XSS**: Sanitize user input before display/storage
7. **Secret Keys**: Never log or expose service role keys

## Testing

Security tests are in `tests/security/`:
- `auth.test.js` - Authentication/authorization
- `rate-limiting.test.js` - Rate limit enforcement
- `race-conditions.test.js` - Concurrent request handling
- `input-validation.test.js` - XSS, SQL injection, validation
- `payment.test.js` - Stripe webhook security

Run before deploying:
```bash
npm run test:security
```

## Common Tasks

### Adding a New API Route

1. Create `app/api/your-route/route.js`
2. Add authentication with `authenticateRequest()`
3. Add rate limiting for expensive operations
4. Validate all inputs
5. Add to middleware if route needs protection
6. Write tests in `tests/security/`

### Adding an Achievement

1. Insert into `achievements` table with unique `key`
2. Add unlock logic in `lib/achievements.ts`
3. Call `checkAndUnlockAchievements()` at appropriate trigger points

### Modifying Premium Features

1. Check `profile.subscription_status === 'active'`
2. Or use `checkPremiumStatus(userId)` from `lib/api-auth.js`

## Deployment

- **Platform**: Vercel
- **Database**: Supabase (managed PostgreSQL)
- **Payments**: Stripe (webhook at `/api/stripe-webhook`)

Before deploying:
1. Run `npm run build` to check for errors
2. Run `npm run test:security` for security tests
3. Verify environment variables are set in Vercel
4. Test Stripe webhooks with Stripe CLI locally

## Additional Documentation

- `SETUP_GUIDE.md` - Full setup instructions
- `SECURITY.md` - Security guidelines and policies
- `DEPLOYMENT.md` - Deployment checklist
- `GAMIFICATION_IMPLEMENTATION_GUIDE.md` - Game mechanics details
- `PREMIUM_INTEGRATION_GUIDE.md` - Premium features implementation
