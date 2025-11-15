# HabitQuest Security Test Suite

Automated tests for security fixes and critical functionality.

## Overview

This test suite validates all security fixes from the comprehensive security audit:
- Authentication and authorization
- Rate limiting
- Race condition prevention
- Input validation
- Payment security
- Database security

## Prerequisites

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev node-fetch
```

## Environment Setup

Create `.env.test` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=test_password_123
ADMIN_EMAILS=admin@habitquest.com
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test auth.test.js
npm test rate-limiting.test.js
npm test race-conditions.test.js

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Test Suites

### 1. Authentication Tests (`auth.test.js`)
- ✅ Validates Bearer token authentication
- ✅ Blocks unauthenticated requests
- ✅ Prevents cross-user data access
- ✅ Admin authorization checks

### 2. Rate Limiting Tests (`rate-limiting.test.js`)
- ✅ Enforces request limits per endpoint
- ✅ Different limits for free vs premium users
- ✅ Burst protection
- ✅ Proper 429 responses with retry headers

### 3. Race Condition Tests (`race-conditions.test.js`)
- ✅ Quest completion atomicity
- ✅ Founder spot reservation atomicity
- ✅ Gold transaction integrity
- ✅ Concurrent request handling

### 4. Input Validation Tests (`input-validation.test.js`)
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ Parameter validation
- ✅ Size limits enforcement

### 5. Payment Security Tests (`payment.test.js`)
- ✅ Checkout authentication required
- ✅ Prevents duplicate premium claims
- ✅ Founder spot atomicity
- ✅ Metadata validation for webhooks

## Manual Testing

Some tests require manual verification:

### Penetration Testing
See `/security/penetration-test-plan.md` for detailed manual test cases.

### Database Migration
1. Back up production database
2. Run migration in staging: `/supabase/migrations/20251115150614_security_fixes.sql`
3. Verify RLS policies: Check test queries in migration file
4. Monitor performance: Query execution times
5. Deploy to production during low-traffic period

## Continuous Monitoring

After deployment, monitor:
- Rate limit violations: `SELECT * FROM api_rate_limits WHERE request_count > limit`
- Failed auth attempts: Check application logs
- API costs: `/api/admin/api-costs`
- Security events: `SELECT * FROM audit_logs WHERE event_type LIKE 'security_%'`

## Success Criteria

All tests must pass before deploying to production:
- ✅ 100% of authentication tests pass
- ✅ 100% of rate limiting tests pass
- ✅ 100% of race condition tests pass
- ✅ 100% of input validation tests pass
- ✅ 100% of payment security tests pass
- ✅ Manual penetration tests show no critical vulnerabilities

## Rollback Plan

If issues are detected after deployment:

1. **Immediate**: Revert API route changes
   ```bash
   git revert HEAD
   git push
   ```

2. **Database**: Rollback migration
   ```sql
   -- Run in Supabase SQL Editor
   -- Restore previous function versions from backup
   ```

3. **Monitor**: Check error logs for 30 minutes after rollback

## Support

For test failures or questions:
- Review test output for specific error messages
- Check `/security/SECURITY-AUDIT-REPORT.md` for context
- Verify environment variables are set correctly
- Ensure test database is properly configured
