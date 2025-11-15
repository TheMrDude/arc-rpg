-- ═══════════════════════════════════════════════════════════════════════════
-- HABITQUEST EQUIPMENT, GOLD & STORY ENHANCEMENTS
-- ═══════════════════════════════════════════════════════════════════════════
-- Features:
-- - Fixed equipment pricing (weapons, armor, accessories)
-- - Emoji icons for all equipment
-- - Gold purchasing system
-- - Continuous story system for quest narratives
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: FIX EQUIPMENT PRICING
-- ═══════════════════════════════════════════════════════════════════════════

-- Weapons pricing (progressive tiers)
UPDATE equipment_catalog SET gold_price = 50, emoji = '🗡️' WHERE name ILIKE '%rusty%dagger%' OR name ILIKE '%rusty%sword%';
UPDATE equipment_catalog SET gold_price = 200, emoji = '⚔️' WHERE name ILIKE '%iron%sword%';
UPDATE equipment_catalog SET gold_price = 500, emoji = '⚡' WHERE name ILIKE '%quest%slayer%';
UPDATE equipment_catalog SET gold_price = 1000, emoji = '🔥' WHERE name ILIKE '%flame%blade%';
UPDATE equipment_catalog SET gold_price = 2500, emoji = '💥' WHERE name ILIKE '%epic%destroyer%';
UPDATE equipment_catalog SET gold_price = 5000, emoji = '🌙' WHERE name ILIKE '%shadow%reaper%';
UPDATE equipment_catalog SET gold_price = 10000, emoji = '✨' WHERE name ILIKE '%light%bringer%' OR name ILIKE '%legendary%';

-- Armor pricing (defensive progression)
UPDATE equipment_catalog SET gold_price = 40, emoji = '🧥' WHERE name ILIKE '%tattered%cloak%';
UPDATE equipment_catalog SET gold_price = 150, emoji = '🎽' WHERE name ILIKE '%leather%jerkin%' OR name ILIKE '%leather%tunic%';
UPDATE equipment_catalog SET gold_price = 400, emoji = '⛓️' WHERE name ILIKE '%chain%mail%';
UPDATE equipment_catalog SET gold_price = 900, emoji = '🛡️' WHERE name ILIKE '%steel%plate%' OR name ILIKE '%iron%armor%';
UPDATE equipment_catalog SET gold_price = 2000, emoji = '🐉' WHERE name ILIKE '%dragon%scale%';
UPDATE equipment_catalog SET gold_price = 4500, emoji = '💎' WHERE name ILIKE '%adamantine%';
UPDATE equipment_catalog SET gold_price = 9000, emoji = '🌟' WHERE name ILIKE '%mythril%';

-- Accessories pricing (utility items)
UPDATE equipment_catalog SET gold_price = 100, emoji = '💰' WHERE name ILIKE '%lucky%coin%' OR name ILIKE '%simple%ring%';
UPDATE equipment_catalog SET gold_price = 150, emoji = '🧭' WHERE name ILIKE '%compass%' OR name ILIKE '%traveler%';
UPDATE equipment_catalog SET gold_price = 500, emoji = '📿' WHERE name ILIKE '%amulet%wisdom%';
UPDATE equipment_catalog SET gold_price = 600, emoji = '💍' WHERE name ILIKE '%ring%focus%' OR name ILIKE '%ring%balance%';
UPDATE equipment_catalog SET gold_price = 1500, emoji = '⏰' WHERE name ILIKE '%time%turner%';
UPDATE equipment_catalog SET gold_price = 3000, emoji = '🔥' WHERE name ILIKE '%phoenix%feather%';
UPDATE equipment_catalog SET gold_price = 7500, emoji = '👑' WHERE name ILIKE '%crown%insight%' OR name ILIKE '%crown%mastery%';

-- Set default prices for any equipment without pricing
UPDATE equipment_catalog
SET gold_price = CASE
  WHEN type = 'weapon' AND rarity = 'common' THEN 50
  WHEN type = 'weapon' AND rarity = 'rare' THEN 500
  WHEN type = 'weapon' AND rarity = 'epic' THEN 2500
  WHEN type = 'weapon' AND rarity = 'legendary' THEN 10000
  WHEN type = 'armor' AND rarity = 'common' THEN 40
  WHEN type = 'armor' AND rarity = 'rare' THEN 400
  WHEN type = 'armor' AND rarity = 'epic' THEN 2000
  WHEN type = 'armor' AND rarity = 'legendary' THEN 9000
  WHEN type = 'accessory' AND rarity = 'common' THEN 100
  WHEN type = 'accessory' AND rarity = 'rare' THEN 600
  WHEN type = 'accessory' AND rarity = 'epic' THEN 1500
  WHEN type = 'accessory' AND rarity = 'legendary' THEN 7500
  ELSE 100
END
WHERE gold_price = 0 OR gold_price IS NULL;

-- Set default emojis for equipment without icons
UPDATE equipment_catalog
SET emoji = CASE
  WHEN type = 'weapon' THEN '⚔️'
  WHEN type = 'armor' THEN '🛡️'
  WHEN type = 'accessory' THEN '💎'
  WHEN type = 'companion_skin' THEN '🐾'
  ELSE '⚡'
END
WHERE emoji IS NULL OR emoji = '';

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: GOLD PURCHASING SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gold_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('starter', 'adventurer', 'hero', 'legend', 'founder_monthly')),
  gold_amount INTEGER NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for purchase lookups
CREATE INDEX IF NOT EXISTS idx_gold_purchases_user_id
  ON gold_purchases(user_id, purchased_at DESC);

CREATE INDEX IF NOT EXISTS idx_gold_purchases_stripe_session
  ON gold_purchases(stripe_checkout_session_id);

-- Enable RLS
ALTER TABLE gold_purchases ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own purchases" ON gold_purchases;
CREATE POLICY "Users can view own purchases"
  ON gold_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert purchases (via webhook)
DROP POLICY IF EXISTS "Service role can insert purchases" ON gold_purchases;
CREATE POLICY "Service role can insert purchases"
  ON gold_purchases FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: CONTINUOUS STORY SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════

-- Add story continuity columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='current_story_thread') THEN
    ALTER TABLE profiles ADD COLUMN current_story_thread TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='story_progress') THEN
    ALTER TABLE profiles ADD COLUMN story_progress JSONB DEFAULT '{"recent_events": [], "ongoing_conflicts": [], "npcs_met": [], "thread_completion": 0}'::jsonb;
  END IF;
END $$;

-- Add story tracking to quests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quests' AND column_name='story_thread') THEN
    ALTER TABLE quests ADD COLUMN story_thread TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quests' AND column_name='narrative_impact') THEN
    ALTER TABLE quests ADD COLUMN narrative_impact JSONB;
  END IF;
END $$;

-- Index for story queries
CREATE INDEX IF NOT EXISTS idx_quests_story_thread
  ON quests(user_id, story_thread, completed_at DESC)
  WHERE story_thread IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: GOLD REWARD RATES (FOR REFERENCE)
-- ═══════════════════════════════════════════════════════════════════════════

-- Update quest gold rewards if they're not set
UPDATE quests
SET gold_reward = CASE
  WHEN difficulty = 'easy' THEN 10
  WHEN difficulty = 'medium' THEN 25
  WHEN difficulty = 'hard' THEN 50
  ELSE 15
END
WHERE gold_reward IS NULL OR gold_reward = 0;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETION MESSAGE
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Equipment, Gold & Story Enhancement Migration Complete!';
  RAISE NOTICE 'Applied:';
  RAISE NOTICE '  - Fixed all equipment pricing (50g - 10,000g range)';
  RAISE NOTICE '  - Added emoji icons to all equipment';
  RAISE NOTICE '  - Created gold_purchases table with RLS';
  RAISE NOTICE '  - Added story continuity system (threads, narrative impact)';
  RAISE NOTICE '  - Updated quest gold rewards';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Create gold purchase API route';
  RAISE NOTICE '  2. Build GoldShop component';
  RAISE NOTICE '  3. Update Stripe webhook handler';
  RAISE NOTICE '  4. Enhance quest transformation with story continuity';
END $$;
