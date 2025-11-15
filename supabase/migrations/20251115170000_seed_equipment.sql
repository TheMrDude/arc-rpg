-- ═══════════════════════════════════════════════════════════════════════════
-- EQUIPMENT CATALOG SEED
-- ═══════════════════════════════════════════════════════════════════════════
-- Populates equipment_catalog with 30 items across 4 categories
-- Categories: Weapons, Armor, Accessories, Companions
-- Rarities: common, rare, epic, legendary
-- ═══════════════════════════════════════════════════════════════════════════

-- Ensure equipment_catalog table exists
CREATE TABLE IF NOT EXISTS equipment_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('weapon', 'armor', 'accessory', 'companion')),
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  description TEXT NOT NULL,
  gold_price INTEGER NOT NULL,
  stat_bonus JSONB DEFAULT '{}'::jsonb,
  image_url TEXT,
  is_premium_only BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clear existing equipment (if reseeding)
TRUNCATE equipment_catalog CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- WEAPONS (8 items) - Boost XP or quest completion bonuses
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO equipment_catalog (name, type, rarity, description, gold_price, stat_bonus, image_url, is_premium_only, sort_order) VALUES
-- Common Weapons
('Wooden Stick', 'weapon', 'common', 'Everyone starts somewhere. This stick has seen better days, but it''s yours.', 0, '{"xp_multiplier": 1.0}'::jsonb, '/equipment/weapon-stick.png', false, 1),
('Beginner''s Blade', 'weapon', 'common', 'Your first real weapon. Sharpened with determination and hope.', 50, '{"xp_multiplier": 1.05}'::jsonb, '/equipment/weapon-sword-basic.png', false, 2),

-- Rare Weapons
('Quest Slayer Sword', 'weapon', 'rare', 'Forged from completed quests. Each swing carries the weight of your victories.', 200, '{"xp_multiplier": 1.10, "quest_xp_bonus": 5}'::jsonb, '/equipment/weapon-sword-blue.png', false, 3),
('Axe of Persistence', 'weapon', 'rare', 'Heavy, but effective. Rewards those who keep showing up.', 250, '{"xp_multiplier": 1.12, "streak_bonus": 3}'::jsonb, '/equipment/weapon-axe.png', false, 4),

-- Epic Weapons
('Epic Destroyer', 'weapon', 'epic', 'Legendary tales speak of this blade. Now it''s yours to wield.', 500, '{"xp_multiplier": 1.20, "quest_xp_bonus": 10}'::jsonb, '/equipment/weapon-sword-purple.png', false, 5),
('Staff of Mastery', 'weapon', 'epic', 'Channel your inner wisdom. Critical hits deal bonus XP.', 600, '{"xp_multiplier": 1.18, "critical_chance": 5}'::jsonb, '/equipment/weapon-staff.png', true, 6),

-- Legendary Weapons
('Lightbringer', 'weapon', 'legendary', 'A weapon of myth. Its glow illuminates the path to greatness.', 1000, '{"xp_multiplier": 1.30, "quest_xp_bonus": 20, "auto_complete_easy": 1}'::jsonb, '/equipment/weapon-sword-gold.png', true, 7),
('The Eternal Flame', 'weapon', 'legendary', 'Burns with the passion of a thousand completed quests. Never goes out.', 1200, '{"xp_multiplier": 1.35, "streak_protection": 1}'::jsonb, '/equipment/weapon-flame.png', true, 8);

-- ═══════════════════════════════════════════════════════════════════════════
-- ARMOR (8 items) - Streak protection or defensive bonuses
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO equipment_catalog (name, type, rarity, description, gold_price, stat_bonus, image_url, is_premium_only, sort_order) VALUES
-- Common Armor
('Cloth Robes', 'armor', 'common', 'Better than nothing. Provides minimal protection from failure.', 0, '{"defense": 5}'::jsonb, '/equipment/armor-cloth.png', false, 11),
('Leather Jerkin', 'armor', 'common', 'Sturdy leather. Your first real protection against streak loss.', 30, '{"defense": 10, "streak_freeze": 0}'::jsonb, '/equipment/armor-leather.png', false, 12),

-- Rare Armor
('Chain Mail', 'armor', 'rare', 'Interlocking rings of commitment. Protects your streak even when you stumble.', 150, '{"defense": 20, "streak_freeze": 1}'::jsonb, '/equipment/armor-chain.png', false, 13),
('Scale Armor', 'armor', 'rare', 'Each scale represents a conquered challenge. Flexible yet strong.', 180, '{"defense": 22, "xp_multiplier": 1.05}'::jsonb, '/equipment/armor-scale.png', false, 14),

-- Epic Armor
('Plate Armor', 'armor', 'epic', 'The armor of heroes. Heavy, but worth the burden.', 400, '{"defense": 35, "streak_freeze": 2, "xp_multiplier": 1.08}'::jsonb, '/equipment/armor-plate.png', false, 15),
('Crystal Ward', 'armor', 'epic', 'Forged from pure focus. Shimmers with protective energy.', 500, '{"defense": 40, "streak_freeze": 2, "critical_defense": 10}'::jsonb, '/equipment/armor-crystal.png', true, 16),

-- Legendary Armor
('Mythril Fortress', 'armor', 'legendary', 'Lighter than steel, stronger than diamond. Your streak is unbreakable.', 800, '{"defense": 50, "streak_freeze": 3, "xp_multiplier": 1.15}'::jsonb, '/equipment/armor-mythril.png', true, 17),
('Titan''s Embrace', 'armor', 'legendary', 'The earth itself bends to protect you. Failure becomes impossible.', 1000, '{"defense": 60, "streak_freeze": 5, "auto_revive": 1}'::jsonb, '/equipment/armor-titan.png', true, 18);

-- ═══════════════════════════════════════════════════════════════════════════
-- ACCESSORIES (7 items) - Special abilities
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO equipment_catalog (name, type, rarity, description, gold_price, stat_bonus, image_url, is_premium_only, sort_order) VALUES
-- Common Accessories
('Lucky Charm', 'accessory', 'common', 'A simple trinket. Sometimes luck is all you need.', 100, '{"gold_multiplier": 1.05}'::jsonb, '/equipment/acc-charm.png', false, 21),

-- Rare Accessories
('XP Amulet', 'accessory', 'rare', 'Glows brighter with each victory. Knowledge flows through it.', 250, '{"xp_multiplier": 1.15}'::jsonb, '/equipment/acc-amulet.png', false, 22),
('Gold Magnet', 'accessory', 'rare', 'Attracts wealth from completed quests. Literally.', 200, '{"gold_multiplier": 1.20}'::jsonb, '/equipment/acc-magnet.png', false, 23),

-- Epic Accessories
('Time Turner', 'accessory', 'epic', 'Bend time itself. Redo one failed quest per day.', 600, '{"quest_redo": 1, "daily_reset": true}'::jsonb, '/equipment/acc-timeturner.png', true, 24),
('Ring of Focus', 'accessory', 'epic', 'Sharpens the mind. Critical thinking becomes second nature.', 550, '{"xp_multiplier": 1.20, "critical_chance": 10}'::jsonb, '/equipment/acc-ring.png', true, 25),

-- Legendary Accessories
('Phoenix Feather', 'accessory', 'legendary', 'Death is not the end. Auto-revive your streak once per week.', 1000, '{"auto_revive_streak": 1, "weekly_reset": true, "xp_multiplier": 1.25}'::jsonb, '/equipment/acc-feather.png', true, 26),
('Crown of Insight', 'accessory', 'legendary', 'Worn by those who face themselves daily. See truth in all things.', 1200, '{"xp_multiplier": 1.30, "journal_xp_boost": 2.0, "unlocks_insight": true}'::jsonb, '/equipment/acc-crown.png', true, 27);

-- ═══════════════════════════════════════════════════════════════════════════
-- COMPANIONS (7 items) - Chibi creatures with special bonuses
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO equipment_catalog (name, type, rarity, description, gold_price, stat_bonus, image_url, is_premium_only, sort_order) VALUES
-- Rare Companions
('Flame Spirit', 'companion', 'rare', 'A tiny being of pure fire. Burns with enthusiasm for your journey.', 300, '{"xp_multiplier": 1.10, "companion_display": true}'::jsonb, '/companions/flame-spirit.png', false, 31),
('Forest Adventurer', 'companion', 'rare', 'A green guardian from ancient woods. Shares your love of exploration.', 350, '{"gold_multiplier": 1.15, "xp_multiplier": 1.05, "companion_display": true}'::jsonb, '/companions/forest-adventurer.png', false, 32),

-- Epic Companions
('Cosmic Weaver', 'companion', 'epic', 'Stitches together the fabric of reality. Sees all possible futures.', 600, '{"xp_multiplier": 1.15, "streak_bonus": 5, "companion_display": true}'::jsonb, '/companions/cosmic-weaver.png', true, 33),
('Storm Caller', 'companion', 'epic', 'Commands thunder and lightning. Your victories echo across the sky.', 650, '{"xp_multiplier": 1.18, "critical_chance": 8, "companion_display": true}'::jsonb, '/companions/storm-caller.png', true, 34),
('Memory Keeper', 'companion', 'epic', 'A wise owl who remembers all your stories. Helps you reflect deeply.', 500, '{"journal_xp_boost": 1.5, "daily_reminder": true, "companion_display": true}'::jsonb, '/companions/memory-keeper.png', true, 35),

-- Legendary Companions
('Shadow Dragon', 'companion', 'legendary', 'Born from your darkest struggles. Now fights beside you.', 1000, '{"xp_multiplier": 1.25, "streak_protection": 2, "companion_display": true}'::jsonb, '/companions/shadow-dragon.png', true, 36),
('The Reflection', 'companion', 'legendary', 'Your truest self made manifest. Knows you better than anyone.', 1100, '{"xp_multiplier": 1.30, "journal_xp_boost": 2.0, "deeper_insights": true, "companion_display": true}'::jsonb, '/companions/reflection.png', true, 37);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES FOR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment_catalog(type);
CREATE INDEX IF NOT EXISTS idx_equipment_rarity ON equipment_catalog(rarity);
CREATE INDEX IF NOT EXISTS idx_equipment_price ON equipment_catalog(gold_price);
CREATE INDEX IF NOT EXISTS idx_equipment_premium ON equipment_catalog(is_premium_only);

-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETION
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Equipment catalog seeded with 30 items!';
  RAISE NOTICE '   - 8 Weapons (common to legendary)';
  RAISE NOTICE '   - 8 Armor pieces (defense + streak protection)';
  RAISE NOTICE '   - 7 Accessories (special abilities)';
  RAISE NOTICE '   - 7 Companions (chibi displays + bonuses)';
  RAISE NOTICE '';
  RAISE NOTICE 'Gold prices range: 0-1200 gold';
  RAISE NOTICE 'Premium items: 14 (requires is_premium = true)';
END $$;
