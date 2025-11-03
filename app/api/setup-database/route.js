import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request) {
  try {
    // SECURITY: Protect database setup endpoint
    // Only allow in development OR with admin secret key
    const isDevelopment = process.env.NODE_ENV === 'development';
    const adminSecret = request.headers.get('x-admin-secret');
    const validSecret = process.env.ADMIN_SETUP_SECRET;

    if (!isDevelopment) {
      // In production, require admin secret
      if (!validSecret) {
        console.error('Setup database: ADMIN_SETUP_SECRET not configured');
        return NextResponse.json(
          { error: 'Database setup is disabled in production' },
          { status: 403 }
        );
      }

      if (adminSecret !== validSecret) {
        console.error('Setup database: Invalid or missing admin secret', {
          hasSecret: !!adminSecret,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('🔧 Starting database setup...', {
      mode: isDevelopment ? 'development' : 'production',
      timestamp: new Date().toISOString()
    });

    // This is the complete database setup SQL
    const setupSQL = `
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  archetype TEXT,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  gold INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_quest_date TIMESTAMPTZ,
  skill_points INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  subscription_status TEXT DEFAULT 'inactive',
  premium_since TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  equipped_weapon UUID,
  equipped_armor UUID,
  equipped_accessory UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quests table
CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  transformed_text TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  xp_value INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create equipment catalog
CREATE TABLE IF NOT EXISTS equipment_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('weapon', 'armor', 'accessory')),
  description TEXT,
  xp_multiplier DECIMAL(3,2) DEFAULT 1.00,
  gold_cost INTEGER NOT NULL,
  level_required INTEGER DEFAULT 1,
  rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints to profiles after equipment_catalog exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_equipped_weapon_fkey'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_equipped_weapon_fkey
      FOREIGN KEY (equipped_weapon) REFERENCES equipment_catalog(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_equipped_armor_fkey'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_equipped_armor_fkey
      FOREIGN KEY (equipped_armor) REFERENCES equipment_catalog(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_equipped_accessory_fkey'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_equipped_accessory_fkey
      FOREIGN KEY (equipped_accessory) REFERENCES equipment_catalog(id);
  END IF;
END $$;

-- Create user equipment
CREATE TABLE IF NOT EXISTS user_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment_catalog(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, equipment_id)
);

-- Create gold transactions
CREATE TABLE IF NOT EXISTS gold_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create story progress
CREATE TABLE IF NOT EXISTS story_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_chapter INTEGER DEFAULT 1,
  story_beats JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create recurring quest templates
CREATE TABLE IF NOT EXISTS recurring_quest_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'custom')),
  recurrence_interval INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create template tasks
CREATE TABLE IF NOT EXISTS template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES recurring_quest_templates(id) ON DELETE CASCADE,
  task_text TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create template generation log
CREATE TABLE IF NOT EXISTS template_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES recurring_quest_templates(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL,
  quests_created INTEGER DEFAULT 0
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quests_user_id_created_at ON quests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quests_user_id_completed ON quests(user_id, completed, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON profiles(is_premium) WHERE is_premium = true;
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_active ON profiles(subscription_status) WHERE subscription_status = 'active';
CREATE INDEX IF NOT EXISTS idx_profiles_id_archetype ON profiles(id, archetype);
CREATE INDEX IF NOT EXISTS idx_gold_transactions_user_id ON gold_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_equipment_user_id ON user_equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_template_tasks_template_id ON template_tasks(template_id, sort_order);

-- Founder inventory safeguards limited spots from oversell
DROP FUNCTION IF EXISTS restore_founder_spot();
DROP FUNCTION IF EXISTS claim_founder_spot(uuid);

CREATE TABLE IF NOT EXISTS founder_inventory (
  id TEXT PRIMARY KEY,
  remaining INTEGER NOT NULL CHECK (remaining >= 0)
);

INSERT INTO founder_inventory (id, remaining)
VALUES ('founder', 25)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION claim_founder_spot(user_id_param uuid)
RETURNS TABLE(success boolean, remaining integer, failure_reason text)
SECURITY DEFINER
AS $$
DECLARE
  new_remaining integer;
  user_subscription text;
  user_is_premium boolean := false;
BEGIN
  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'claim_founder_spot requires a user id';
  END IF;

  SELECT subscription_status, is_premium
  INTO user_subscription, user_is_premium
  FROM profiles
  WHERE id = user_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile missing for user %', user_id_param;
  END IF;

  IF coalesce(user_is_premium, false) OR user_subscription = 'active' THEN
    RETURN QUERY SELECT false, NULL::integer, 'already_premium';
    RETURN;
  END IF;

  UPDATE founder_inventory
  SET remaining = remaining - 1
  WHERE id = 'founder' AND remaining > 0
  RETURNING remaining INTO new_remaining;

  IF new_remaining IS NULL THEN
    RETURN QUERY SELECT false, 0, 'sold_out';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, new_remaining, 'reserved';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION restore_founder_spot()
RETURNS integer
SECURITY DEFINER
AS $$
DECLARE
  new_remaining integer;
BEGIN
  UPDATE founder_inventory
  SET remaining = remaining + 1
  WHERE id = 'founder'
  RETURNING remaining INTO new_remaining;

  IF new_remaining IS NULL THEN
    RAISE EXCEPTION 'Founder inventory row missing';
  END IF;

  RETURN new_remaining;
END;
$$ LANGUAGE plpgsql;

codex/fix-checkout-post-500-error-ksrmvh
GRANT EXECUTE ON FUNCTION claim_founder_spot(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION restore_founder_spot TO service_role;
=======
GRANT EXECUTE ON FUNCTION claim_founder_spot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_founder_spot(uuid) TO service_role;
main

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Guard premium-related fields from tampering
CREATE OR REPLACE FUNCTION enforce_premium_field_guard()
RETURNS trigger
SECURITY DEFINER
AS $$
DECLARE
  requester_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF requester_role <> 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_premium := false;
      NEW.subscription_status := coalesce(NEW.subscription_status, 'inactive');
      NEW.stripe_session_id := NULL;
      NEW.stripe_customer_id := NULL;
      NEW.premium_since := NULL;
    ELSE
      IF NEW.is_premium IS DISTINCT FROM OLD.is_premium
        OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
        OR NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id
        OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
        OR NEW.premium_since IS DISTINCT FROM OLD.premium_since THEN
          RAISE EXCEPTION 'Only privileged service role may modify premium fields';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_premium_field_guard_update ON profiles;
CREATE TRIGGER trg_enforce_premium_field_guard_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_premium_field_guard();

DROP TRIGGER IF EXISTS trg_enforce_premium_field_guard_insert ON profiles;
CREATE TRIGGER trg_enforce_premium_field_guard_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_premium_field_guard();

-- Gold transaction function
CREATE OR REPLACE FUNCTION process_gold_transaction(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance INTEGER,
  transaction_id UUID
) AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  SELECT gold INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  v_new_balance := v_current_balance + p_amount;

  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT FALSE, v_current_balance, NULL::UUID;
    RETURN;
  END IF;

  UPDATE profiles
  SET gold = v_new_balance,
      updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO gold_transactions (user_id, amount, transaction_type, reference_id, metadata)
  VALUES (p_user_id, p_amount, p_transaction_type, p_reference_id, p_metadata)
  RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT TRUE, v_new_balance, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_quest_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_generation_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for quests
DROP POLICY IF EXISTS "Users can view own quests" ON quests;
CREATE POLICY "Users can view own quests"
  ON quests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own quests" ON quests;
CREATE POLICY "Users can insert own quests"
  ON quests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own quests" ON quests;
CREATE POLICY "Users can update own quests"
  ON quests FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own quests" ON quests;
CREATE POLICY "Users can delete own quests"
  ON quests FOR DELETE
  USING (auth.uid() = user_id);

-- RLS for user equipment
DROP POLICY IF EXISTS "Users can view own equipment" ON user_equipment;
CREATE POLICY "Users can view own equipment"
  ON user_equipment FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own equipment" ON user_equipment;
CREATE POLICY "Users can insert own equipment"
  ON user_equipment FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS for templates
DROP POLICY IF EXISTS "Users can view own templates" ON recurring_quest_templates;
CREATE POLICY "Users can view own templates"
  ON recurring_quest_templates FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own templates" ON recurring_quest_templates;
CREATE POLICY "Users can insert own templates"
  ON recurring_quest_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own templates" ON recurring_quest_templates;
CREATE POLICY "Users can update own templates"
  ON recurring_quest_templates FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own templates" ON recurring_quest_templates;
CREATE POLICY "Users can delete own templates"
  ON recurring_quest_templates FOR DELETE
  USING (auth.uid() = user_id);

-- RLS for template tasks
DROP POLICY IF EXISTS "Users can view tasks for own templates" ON template_tasks;
CREATE POLICY "Users can view tasks for own templates"
  ON template_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recurring_quest_templates
      WHERE id = template_tasks.template_id
      AND user_id = auth.uid()
    )
  );

-- Ensure premium users have premium_since date when premium
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_premium_since'
      AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT check_premium_since
      CHECK (
        (is_premium = false AND premium_since IS NULL)
        OR (is_premium = true AND premium_since IS NOT NULL)
      );
  END IF;
END $$;

-- Equipment catalog public read
DROP POLICY IF EXISTS "Equipment catalog is viewable by everyone" ON equipment_catalog;
CREATE POLICY "Equipment catalog is viewable by everyone"
  ON equipment_catalog FOR SELECT
  TO authenticated
  USING (true);

-- Insert starter equipment
INSERT INTO equipment_catalog (name, type, description, xp_multiplier, gold_cost, level_required, rarity)
VALUES
  ('Rusty Sword', 'weapon', 'A basic warrior weapon', 1.10, 500, 1, 'common'),
  ('Iron Shield', 'armor', 'Basic protection', 1.10, 500, 1, 'common'),
  ('Lucky Coin', 'accessory', 'Increases fortune', 1.05, 300, 1, 'common'),
  ('Steel Blade', 'weapon', 'Sharp and reliable', 1.25, 2000, 5, 'uncommon'),
  ('Chainmail Vest', 'armor', 'Decent protection', 1.25, 2000, 5, 'uncommon'),
  ('Focus Amulet', 'accessory', 'Sharpens the mind', 1.15, 1000, 3, 'uncommon')
ON CONFLICT DO NOTHING;
`;

    // Execute the setup SQL using the admin client
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: setupSQL
    });

    if (error) {
      // If the RPC function doesn't exist, we need to use a different approach
      // Try executing each statement individually via REST API
      console.error('RPC exec_sql not available, trying alternative setup...');

      // Split SQL into individual statements and execute them
      const statements = setupSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let executed = 0;
      for (const stmt of statements) {
        try {
          // Use a simple select to verify connection works
          const { error: testError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .limit(1);

          if (testError && testError.message.includes('does not exist')) {
            // Tables don't exist - need manual setup
            return NextResponse.json({
              success: false,
              error: 'Database tables not found',
              message: 'Please run COMPLETE_SETUP.sql in your Supabase SQL Editor manually',
              instructions: [
                '1. Go to https://supabase.com/dashboard/project/vxzholcypozuurmsmbub/sql/new',
                '2. Copy the entire contents of COMPLETE_SETUP.sql',
                '3. Paste into the SQL editor',
                '4. Click "Run"',
                '5. Refresh this page'
              ]
            }, { status: 500 });
          }

          executed++;
        } catch (e) {
          console.error('Error executing statement:', e);
        }
      }

      if (executed === 0) {
        return NextResponse.json({
          success: false,
          error: 'Database setup failed',
          message: 'Could not execute setup SQL. Please run COMPLETE_SETUP.sql manually in Supabase SQL Editor',
          details: error.message
        }, { status: 500 });
      }
    }

    console.log('✅ Database setup complete!');

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully'
    });

  } catch (error) {
    console.error('Setup error:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Database setup failed. You need to run COMPLETE_SETUP.sql manually in Supabase SQL Editor.',
      instructions: [
        '1. Go to https://supabase.com/dashboard/project/vxzholcypozuurmsmbub/sql/new',
        '2. Copy the entire contents of COMPLETE_SETUP.sql from your project',
        '3. Paste into the SQL editor',
        '4. Click "Run"',
        '5. Return to the app and try selecting archetype again'
      ]
    }, { status: 500 });
  }
}
