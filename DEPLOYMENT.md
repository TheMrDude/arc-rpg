# ARC RPG - Production Deployment Guide

This guide will help you deploy ARC RPG to production securely.

---

## 🚀 Pre-Deployment Checklist

### 1. Environment Setup

- [ ] Create production environment variables
- [ ] Copy `.env.example` to `.env.local`
- [ ] Fill in all required values
- [ ] Verify no secrets are in git

### 2. Stripe Configuration

- [ ] Create Stripe production account
- [ ] Get production API keys (not test keys!)
- [ ] Set up webhook endpoint:
  - URL: `https://your-domain.com/api/stripe-webhook`
  - Event: `checkout.session.completed`
- [ ] Copy webhook secret to environment variables
- [ ] Test webhook with Stripe CLI
- [ ] Update price if needed (currently $47)

### 3. Supabase Setup

- [ ] Create production Supabase project
- [ ] Run `supabase-migrations.sql` in SQL Editor
- [ ] Verify all indexes are created
- [ ] Verify all RLS policies are enabled
- [ ] Create profiles table if not exists:

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text,
  archetype text,
  level integer DEFAULT 1,
  xp integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_quest_date timestamptz,
  is_premium boolean DEFAULT false,
  premium_since timestamptz,
  stripe_session_id text,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  original_text text NOT NULL,
  transformed_text text NOT NULL,
  difficulty text NOT NULL,
  xp_value integer NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

- [ ] Enable Email Auth in Supabase Dashboard
- [ ] Configure email templates
- [ ] Set up redirect URLs
- [ ] Get production URL and Anon Key
- [ ] Get Service Role Key (keep secret!)

### 4. Anthropic API

- [ ] Create Anthropic account
- [ ] Generate production API key
- [ ] Set up billing/usage limits
- [ ] Add to environment variables

### 5. Security Verification

- [ ] All API routes have authentication
- [ ] All inputs are validated
- [ ] Rate limiting is enabled
- [ ] RLS policies are active
- [ ] Service role key is not in client code
- [ ] Error messages don't expose internals
- [ ] HTTPS is enforced
- [ ] Security headers are configured

---

## 📦 Deployment Steps

### Option 1: Vercel (Recommended)

1. **Connect GitHub Repository**
   ```bash
   # Push to GitHub first
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repo
   - Framework Preset: Next.js
   - Root Directory: ./

3. **Configure Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `STRIPE_SECRET_KEY`
     - `STRIPE_WEBHOOK_SECRET`
     - `ANTHROPIC_API_KEY`
   - Set environment: Production

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Get your production URL

5. **Configure Stripe Webhook**
   - Use your production URL: `https://your-app.vercel.app/api/stripe-webhook`
   - Update webhook in Stripe Dashboard

### Option 2: Custom Server

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm run start
   ```

3. **Use Process Manager**
   ```bash
   # With PM2
   pm2 start npm --name "arc-rpg" -- start
   pm2 save
   pm2 startup
   ```

4. **Configure Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Set up SSL with Let's Encrypt**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

---

## 🧪 Post-Deployment Testing

### 1. Authentication Flow
- [ ] Test user signup
- [ ] Test user login
- [ ] Test logout
- [ ] Verify email confirmation (if enabled)

### 2. Quest System
- [ ] Create a quest
- [ ] Verify AI transformation works
- [ ] Complete a quest
- [ ] Verify XP is added
- [ ] Check level up logic

### 3. Payment Flow (Critical!)
- [ ] Go to pricing page
- [ ] Click "Claim Founder Access"
- [ ] Complete test payment (use Stripe test card: 4242 4242 4242 4242)
- [ ] Verify redirect to payment success page
- [ ] Verify premium status is updated
- [ ] Check database for stripe_session_id
- [ ] Verify webhook received event

### 4. Security Tests
- [ ] Test rate limiting (make 35+ API requests quickly)
- [ ] Try accessing payment-success without valid session
- [ ] Verify non-authenticated users can't access APIs
- [ ] Check security headers (use securityheaders.com)
- [ ] Verify HTTPS redirect works

### 5. Performance Tests
- [ ] Dashboard loads in < 2 seconds
- [ ] Quest creation is fast
- [ ] No console errors
- [ ] Check Lighthouse score

---

## 🔍 Monitoring Setup

### 1. Error Tracking (Sentry)

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

Add to `app/layout.js`:
```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

### 2. Analytics (Optional)

- Google Analytics
- Plausible Analytics
- PostHog

### 3. Uptime Monitoring

- UptimeRobot (free)
- Pingdom
- Better Uptime

Set up alerts for:
- Website down
- API errors > 5%
- Stripe webhook failures

### 4. Database Monitoring

- Supabase Dashboard
- Set up alerts for:
  - High query time
  - Connection pool exhaustion
  - Storage limits

---

## 🐛 Troubleshooting

### Webhook Not Working

1. Check webhook URL is correct
2. Verify `STRIPE_WEBHOOK_SECRET` is correct
3. Check webhook logs in Stripe Dashboard
4. Test with Stripe CLI:
   ```bash
   stripe trigger checkout.session.completed
   ```

### Users Not Getting Premium

1. Check webhook is receiving events
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
3. Check payment_audit_log table
4. Verify user_id in webhook metadata

### API Rate Limit Too Aggressive

Edit `middleware.js`:
```javascript
const maxRequests = 30; // Increase this number
```

### Slow Database Queries

Run this in Supabase SQL Editor:
```sql
-- Check slow queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 🔄 Updating in Production

### 1. Make Changes

```bash
git checkout -b feature/my-update
# Make your changes
git commit -m "Description"
git push origin feature/my-update
```

### 2. Test Locally

```bash
npm run dev
# Test thoroughly
npm run build
# Verify build succeeds
```

### 3. Deploy

```bash
git checkout main
git merge feature/my-update
git push origin main
# Vercel auto-deploys
```

### 4. Verify

- Check deployment logs
- Test critical flows
- Monitor error rates

---

## 📊 Database Backups

### Automated Backups (Supabase)

- Supabase Pro: Daily automatic backups
- Supabase Free: Manual backups

### Manual Backup

```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Restore
supabase db reset --db-url "postgresql://..."
```

### Backup Strategy

- Daily automated backups (keep 7 days)
- Weekly backups (keep 4 weeks)
- Monthly backups (keep 12 months)
- Before major changes (manual)

---

## 🚨 Emergency Procedures

### Site is Down

1. Check Vercel status page
2. Check Supabase status page
3. Check server logs
4. Rollback to previous deployment if needed

### Payment Issues

1. Check Stripe Dashboard for errors
2. Verify webhook is receiving events
3. Check webhook logs
4. Contact Stripe support if needed

### Data Breach

1. Immediately rotate all API keys
2. Notify affected users
3. Review audit logs
4. File incident report

---

## 📈 Scaling Considerations

When you reach these thresholds:

### 100 Users
- Monitor Supabase connection limits
- Consider caching strategies
- Review rate limits

### 500 Users
- Upgrade Supabase plan
- Implement Redis for rate limiting
- Add CDN for static assets

### 1000+ Users
- Consider database read replicas
- Implement background job queue
- Add dedicated cache layer
- Review pricing model

---

## 📞 Support Contacts

- Vercel Support: [vercel.com/support](https://vercel.com/support)
- Supabase Support: [supabase.com/support](https://supabase.com/support)
- Stripe Support: [support.stripe.com](https://support.stripe.com)
- Anthropic Support: [support.anthropic.com](https://support.anthropic.com)

---

## ✅ Final Checklist

Before announcing launch:

- [ ] All tests pass
- [ ] Webhook is working
- [ ] Test payment completed successfully
- [ ] Monitoring is set up
- [ ] Backups are configured
- [ ] SSL certificate is valid
- [ ] Domain DNS is configured
- [ ] Email is working (if enabled)
- [ ] Terms of Service / Privacy Policy are live
- [ ] Support email is set up
- [ ] Social media accounts are ready
- [ ] Launch blog post is ready

---

**Good luck with your launch! 🚀**

If you need help, refer to:
- `SECURITY.md` - Security documentation
- `.env.example` - Environment variable reference
- `supabase-migrations.sql` - Database setup

**Remember:** Test payments thoroughly before real customers!
