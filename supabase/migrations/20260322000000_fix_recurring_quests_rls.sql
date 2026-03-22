-- Fix recurring_quests RLS: Drop premium-only policies that block free tier users
-- Free tier limit of 3 is enforced in application code, not RLS

DROP POLICY IF EXISTS "Premium users can view own recurring quests" ON recurring_quests;
DROP POLICY IF EXISTS "Premium users can insert own recurring quests" ON recurring_quests;
DROP POLICY IF EXISTS "Premium users can update own recurring quests" ON recurring_quests;
DROP POLICY IF EXISTS "Premium users can delete own recurring quests" ON recurring_quests;

-- Ensure standard user-scoped policies exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recurring_quests' AND policyname = 'Users can view own recurring quests'
  ) THEN
    CREATE POLICY "Users can view own recurring quests" ON recurring_quests
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recurring_quests' AND policyname = 'Users can insert own recurring quests'
  ) THEN
    CREATE POLICY "Users can insert own recurring quests" ON recurring_quests
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recurring_quests' AND policyname = 'Users can update own recurring quests'
  ) THEN
    CREATE POLICY "Users can update own recurring quests" ON recurring_quests
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recurring_quests' AND policyname = 'Users can delete own recurring quests'
  ) THEN
    CREATE POLICY "Users can delete own recurring quests" ON recurring_quests
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END
$$;
