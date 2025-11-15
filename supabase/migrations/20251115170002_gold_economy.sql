-- ═══════════════════════════════════════════════════════════════════════════
-- GOLD ECONOMY SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════
-- Adds gold currency to HabitQuest:
-- - Gold column in profiles (starting balance: 100)
-- - Gold rewards on quest completion (scales with difficulty)
-- - Atomic gold transactions (prevent race conditions)
-- - Gold transaction history
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: ADD GOLD TO PROFILES
-- ═══════════════════════════════════════════════════════════════════════════

-- Add gold column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 100 CHECK (gold >= 0);

-- Set default gold for existing users (if null)
UPDATE profiles
SET gold = 100
WHERE gold IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: GOLD TRANSACTIONS TABLE (History/Audit)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gold_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL, -- Positive for gains, negative for spends
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'quest_reward',
    'equipment_purchase',
    'daily_bonus',
    'achievement_reward',
    'admin_grant',
    'admin_deduct',
    'refund'
  )),
  reference_id UUID, -- ID of quest, equipment, etc.
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gold_transactions_user ON gold_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gold_transactions_type ON gold_transactions(transaction_type);

-- RLS policies
ALTER TABLE gold_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gold transactions"
  ON gold_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Only system can insert (via functions)
CREATE POLICY "System can insert gold transactions"
  ON gold_transactions FOR INSERT
  WITH CHECK (false); -- Only service role can insert

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: GOLD REWARD ON QUEST COMPLETION
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION award_quest_gold()
RETURNS TRIGGER AS $$
DECLARE
  gold_reward INTEGER;
  current_gold INTEGER;
  user_level INTEGER;
  gold_multiplier NUMERIC := 1.0;
BEGIN
  -- Only award gold when quest is completed (not when created or updated without completion)
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN

    -- Get user's current gold and level
    SELECT gold, level INTO current_gold, user_level
    FROM profiles
    WHERE id = NEW.user_id;

    -- Calculate base gold reward based on difficulty
    gold_reward := CASE
      WHEN NEW.difficulty = 'easy' THEN 10
      WHEN NEW.difficulty = 'medium' THEN 25
      WHEN NEW.difficulty = 'hard' THEN 50
      ELSE 10 -- Default fallback
    END;

    -- Bonus gold for higher level players (1 gold per level)
    gold_reward := gold_reward + user_level;

    -- TODO: Check user's equipped items for gold_multiplier bonuses
    -- This will be implemented when equipment system is active

    -- Apply multiplier
    gold_reward := FLOOR(gold_reward * gold_multiplier);

    -- Award gold atomically
    UPDATE profiles
    SET gold = gold + gold_reward
    WHERE id = NEW.user_id;

    -- Record transaction
    INSERT INTO gold_transactions (
      user_id,
      amount,
      transaction_type,
      reference_id,
      balance_before,
      balance_after,
      description
    ) VALUES (
      NEW.user_id,
      gold_reward,
      'quest_reward',
      NEW.id,
      current_gold,
      current_gold + gold_reward,
      'Completed quest: ' || COALESCE(NEW.title, 'Untitled Quest') || ' (' || NEW.difficulty || ')'
    );

    RAISE NOTICE 'Awarded % gold to user % for quest completion', gold_reward, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS award_gold_trigger ON quests;
CREATE TRIGGER award_gold_trigger
  AFTER INSERT OR UPDATE OF completed ON quests
  FOR EACH ROW
  EXECUTE FUNCTION award_quest_gold();

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: EQUIPMENT PURCHASE FUNCTION (ATOMIC)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION purchase_equipment(
  p_user_id UUID,
  p_equipment_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_balance INTEGER
) AS $$
DECLARE
  equipment_price INTEGER;
  equipment_name TEXT;
  equipment_premium BOOLEAN;
  current_gold INTEGER;
  user_premium BOOLEAN;
  already_owned BOOLEAN;
BEGIN
  -- SECURITY: Validate caller owns this user_id
  IF p_user_id != auth.uid() THEN
    RETURN QUERY SELECT false, 'Unauthorized: Cannot purchase for other users'::TEXT, 0;
    RETURN;
  END IF;

  -- Get equipment details
  SELECT gold_price, name, is_premium_only
  INTO equipment_price, equipment_name, equipment_premium
  FROM equipment_catalog
  WHERE id = p_equipment_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Equipment not found'::TEXT, 0;
    RETURN;
  END IF;

  -- Check if already owned
  SELECT EXISTS(
    SELECT 1 FROM user_equipment
    WHERE user_id = p_user_id AND equipment_id = p_equipment_id
  ) INTO already_owned;

  IF already_owned THEN
    RETURN QUERY SELECT false, 'Already owned'::TEXT, 0;
    RETURN;
  END IF;

  -- Get user's current gold and premium status
  SELECT gold, (is_premium = true OR subscription_status = 'active')
  INTO current_gold, user_premium
  FROM profiles
  WHERE id = p_user_id;

  -- Check if user has enough gold
  IF current_gold < equipment_price THEN
    RETURN QUERY SELECT false, 'Insufficient gold'::TEXT, current_gold;
    RETURN;
  END IF;

  -- Check premium requirement
  IF equipment_premium = true AND user_premium = false THEN
    RETURN QUERY SELECT false, 'Premium membership required'::TEXT, current_gold;
    RETURN;
  END IF;

  -- ATOMIC TRANSACTION: Deduct gold and add equipment
  BEGIN
    -- Deduct gold
    UPDATE profiles
    SET gold = gold - equipment_price
    WHERE id = p_user_id
      AND gold >= equipment_price; -- Double-check to prevent race condition

    IF NOT FOUND THEN
      RETURN QUERY SELECT false, 'Transaction failed (insufficient gold)'::TEXT, current_gold;
      RETURN;
    END IF;

    -- Add equipment to inventory
    INSERT INTO user_equipment (user_id, equipment_id, purchased_at)
    VALUES (p_user_id, p_equipment_id, NOW());

    -- Record transaction
    INSERT INTO gold_transactions (
      user_id,
      amount,
      transaction_type,
      reference_id,
      balance_before,
      balance_after,
      description
    ) VALUES (
      p_user_id,
      -equipment_price,
      'equipment_purchase',
      p_equipment_id,
      current_gold,
      current_gold - equipment_price,
      'Purchased: ' || equipment_name
    );

    RETURN QUERY SELECT true, 'Purchase successful'::TEXT, (current_gold - equipment_price);

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Transaction error: ' || SQLERRM, current_gold;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION purchase_equipment(UUID, UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: USER EQUIPMENT TABLE (if not exists)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES equipment_catalog(id) ON DELETE CASCADE NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_equipped BOOLEAN DEFAULT false,

  UNIQUE(user_id, equipment_id)
);

-- Only one item equipped per slot (type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_equipment_slot_equipped
  ON user_equipment(user_id, (
    SELECT type FROM equipment_catalog WHERE id = equipment_id
  ))
  WHERE is_equipped = true;

-- RLS policies
ALTER TABLE user_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own equipment"
  ON user_equipment FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own equipment"
  ON user_equipment FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_equipment_user ON user_equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_user_equipment_equipped ON user_equipment(user_id, is_equipped) WHERE is_equipped = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6: DAILY GOLD BONUS (Optional - can be triggered by cron)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION award_daily_gold_bonus(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  bonus_amount INTEGER := 25; -- Daily login bonus
  current_gold INTEGER;
BEGIN
  -- SECURITY: Validate caller
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot award bonus for other users';
  END IF;

  -- Get current gold
  SELECT gold INTO current_gold FROM profiles WHERE id = p_user_id;

  -- Award bonus
  UPDATE profiles SET gold = gold + bonus_amount WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO gold_transactions (
    user_id,
    amount,
    transaction_type,
    balance_before,
    balance_after,
    description
  ) VALUES (
    p_user_id,
    bonus_amount,
    'daily_bonus',
    current_gold,
    current_gold + bonus_amount,
    'Daily login bonus'
  );

  RETURN bonus_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION award_daily_gold_bonus(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETION
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Gold economy system created!';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - Gold column added to profiles (default: 100)';
  RAISE NOTICE '  - Gold rewards on quest completion:';
  RAISE NOTICE '    * Easy: 10 gold + level bonus';
  RAISE NOTICE '    * Medium: 25 gold + level bonus';
  RAISE NOTICE '    * Hard: 50 gold + level bonus';
  RAISE NOTICE '  - Gold transactions table for audit history';
  RAISE NOTICE '  - Atomic purchase_equipment() function';
  RAISE NOTICE '  - Daily gold bonus function (25 gold)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Build equipment shop UI';
  RAISE NOTICE '  2. Display gold balance in dashboard';
  RAISE NOTICE '  3. Implement equipment effects';
END $$;
