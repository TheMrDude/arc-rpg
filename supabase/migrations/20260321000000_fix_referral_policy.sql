DROP POLICY IF EXISTS "Anyone can create a referral record" ON referrals;
CREATE POLICY "Authenticated users can create referral records" ON referrals
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
