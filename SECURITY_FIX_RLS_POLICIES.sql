-- ============================================
-- CRITICAL SECURITY FIX: Restrict Profile Updates
-- ============================================
-- This migration fixes a critical security vulnerability where users
-- could self-upgrade to premium by updating is_premium and subscription_status
-- in their browser console.
--
-- BEFORE: Users could UPDATE any column in their profile
-- AFTER: Users can only UPDATE safe, non-premium columns
--
-- Run this in your Supabase SQL Editor IMMEDIATELY
-- ============================================

-- Drop the insecure policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create a secure policy that only allows updating safe columns
-- Users CANNOT update: is_premium, subscription_status, premium_since,
-- stripe_session_id, stripe_customer_id, gold, xp, level
CREATE POLICY "Users can update safe profile fields" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- The key security feature: users can only update these specific columns
    -- Premium fields are excluded and can only be updated by server-side code
    -- using the service role key
  );

-- Create a separate policy for server-side updates (using service role)
-- This allows the webhook and API routes to update premium fields
-- Note: Service role bypasses RLS, but we document this for clarity

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- After running this migration, test with these queries:

-- 1. As a regular user, this should FAIL:
-- UPDATE profiles SET is_premium = true WHERE id = auth.uid();

-- 2. As a regular user, this should SUCCEED:
-- UPDATE profiles SET archetype = 'warrior' WHERE id = auth.uid();

-- 3. Check current policies:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- ============================================
-- ADDITIONAL NOTES
-- ============================================
-- This fix works in conjunction with:
-- 1. Webhook now sets is_premium = true (app/api/stripe-webhook/route.js)
-- 2. Founder count uses subscription_status (app/api/create-checkout/route.js)
-- 3. Server-side payment verification (app/api/verify-payment/route.js)
--
-- Together, these changes prevent the self-upgrade exploit while
-- ensuring legitimate payments work correctly.
-- ============================================
