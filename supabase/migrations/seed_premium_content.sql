-- Seed Premium Content
-- Quest templates and equipment catalog items

-- ═══════════════════════════════════════════════
-- QUEST TEMPLATES
-- ═══════════════════════════════════════════════

INSERT INTO quest_templates (name, description, category, quests, difficulty_level, is_official) VALUES

-- FITNESS TEMPLATES
('Morning Routine Mastery', 'Build a powerful morning ritual that sets you up for success', 'fitness', '[
  {"text": "Wake up at your target time", "difficulty": "easy"},
  {"text": "Exercise for 30 minutes", "difficulty": "medium"},
  {"text": "Meditate for 10 minutes", "difficulty": "easy"},
  {"text": "Eat a healthy breakfast", "difficulty": "easy"},
  {"text": "Plan your day in writing", "difficulty": "easy"}
]'::jsonb, 'beginner', true),

('Fitness Fundamentals', 'Core habits for physical health and vitality', 'fitness', '[
  {"text": "Complete a full workout session", "difficulty": "medium"},
  {"text": "Stretch for 15 minutes", "difficulty": "easy"},
  {"text": "Track calories and nutrition", "difficulty": "easy"},
  {"text": "Drink 8 glasses of water", "difficulty": "easy"},
  {"text": "Get 8 hours of sleep", "difficulty": "medium"}
]'::jsonb, 'beginner', true),

('Athletic Performance', 'Advanced training routine for serious athletes', 'fitness', '[
  {"text": "High-intensity interval training", "difficulty": "hard"},
  {"text": "Strength training session", "difficulty": "hard"},
  {"text": "Active recovery or yoga", "difficulty": "medium"},
  {"text": "Track workout metrics", "difficulty": "easy"},
  {"text": "Meal prep for optimal nutrition", "difficulty": "medium"}
]'::jsonb, 'advanced', true),

-- WORK/PRODUCTIVITY TEMPLATES
('Productivity Powerhouse', 'Maximize your daily output and efficiency', 'productivity', '[
  {"text": "Achieve inbox zero", "difficulty": "medium"},
  {"text": "Complete 2 hours of deep work", "difficulty": "hard"},
  {"text": "Review and update your goals", "difficulty": "easy"},
  {"text": "Plan tomorrow''s priorities", "difficulty": "easy"},
  {"text": "Close all open loops", "difficulty": "medium"}
]'::jsonb, 'intermediate', true),

('Deep Work Warrior', 'Master focused, distraction-free productivity', 'work', '[
  {"text": "3-hour deep work block", "difficulty": "hard"},
  {"text": "Turn off all notifications", "difficulty": "easy"},
  {"text": "Complete your #1 priority task", "difficulty": "hard"},
  {"text": "Take strategic breaks (Pomodoro)", "difficulty": "easy"},
  {"text": "Review and document what you learned", "difficulty": "medium"}
]'::jsonb, 'advanced', true),

('Freelancer Focus', 'Build sustainable self-employment habits', 'work', '[
  {"text": "Reach out to 3 potential clients", "difficulty": "medium"},
  {"text": "Update portfolio or website", "difficulty": "medium"},
  {"text": "Invoice outstanding work", "difficulty": "easy"},
  {"text": "Learn a new skill for 1 hour", "difficulty": "medium"},
  {"text": "Network in your industry", "difficulty": "medium"}
]'::jsonb, 'intermediate', true),

-- LEARNING TEMPLATES
('Lifelong Learner', 'Continuous growth and skill development', 'learning', '[
  {"text": "Read for 30 minutes", "difficulty": "easy"},
  {"text": "Practice a new skill", "difficulty": "medium"},
  {"text": "Watch an educational video", "difficulty": "easy"},
  {"text": "Take notes and reflect", "difficulty": "easy"},
  {"text": "Teach someone what you learned", "difficulty": "medium"}
]'::jsonb, 'beginner', true),

('Language Learning Sprint', 'Accelerate your language acquisition', 'learning', '[
  {"text": "Duolingo or app practice (20 min)", "difficulty": "easy"},
  {"text": "Watch content in target language", "difficulty": "medium"},
  {"text": "Practice speaking (record yourself)", "difficulty": "medium"},
  {"text": "Learn 10 new vocabulary words", "difficulty": "easy"},
  {"text": "Connect with a language partner", "difficulty": "hard"}
]'::jsonb, 'intermediate', true),

-- CREATIVE TEMPLATES
('Creative Flow State', 'Unlock your artistic potential daily', 'creative', '[
  {"text": "Write 500 words (journal/story/blog)", "difficulty": "medium"},
  {"text": "Sketch or doodle for 20 minutes", "difficulty": "easy"},
  {"text": "Learn a new creative technique", "difficulty": "medium"},
  {"text": "Consume inspiring art/music/writing", "difficulty": "easy"},
  {"text": "Reflect on your creative progress", "difficulty": "easy"}
]'::jsonb, 'beginner', true),

('Artist''s Discipline', 'Professional creative practice routine', 'creative', '[
  {"text": "2 hours of deliberate practice", "difficulty": "hard"},
  {"text": "Study masters in your field", "difficulty": "medium"},
  {"text": "Share your work publicly", "difficulty": "hard"},
  {"text": "Seek and apply feedback", "difficulty": "medium"},
  {"text": "Experiment with new styles", "difficulty": "medium"}
]'::jsonb, 'advanced', true),

-- HEALTH/MINDFULNESS TEMPLATES
('Mental Wellness Daily', 'Protect and nurture your mental health', 'mindfulness', '[
  {"text": "Morning meditation (10 min)", "difficulty": "easy"},
  {"text": "Gratitude journaling", "difficulty": "easy"},
  {"text": "Spend time in nature", "difficulty": "easy"},
  {"text": "Digital detox for 2 hours", "difficulty": "medium"},
  {"text": "Evening reflection ritual", "difficulty": "easy"}
]'::jsonb, 'beginner', true),

('Stress Resilience Builder', 'Develop unshakeable inner peace', 'mindfulness', '[
  {"text": "20-minute meditation practice", "difficulty": "medium"},
  {"text": "Breathwork exercises", "difficulty": "easy"},
  {"text": "Process emotions through journaling", "difficulty": "medium"},
  {"text": "Practice mindful movement (yoga/tai chi)", "difficulty": "medium"},
  {"text": "Set boundaries (say no to something)", "difficulty": "hard"}
]'::jsonb, 'intermediate', true),

('Sleep Optimization', 'Master the foundation of all health', 'health', '[
  {"text": "No screens 1 hour before bed", "difficulty": "medium"},
  {"text": "Evening wind-down routine", "difficulty": "easy"},
  {"text": "Bedroom temp 65-68°F", "difficulty": "easy"},
  {"text": "Consistent sleep schedule", "difficulty": "medium"},
  {"text": "Morning sunlight exposure", "difficulty": "easy"}
]'::jsonb, 'beginner', true),

-- SOCIAL/RELATIONSHIPS
('Connection Cultivator', 'Deepen your relationships and community', 'social', '[
  {"text": "Reach out to a friend or family member", "difficulty": "easy"},
  {"text": "Have a meaningful conversation", "difficulty": "medium"},
  {"text": "Express gratitude to someone", "difficulty": "easy"},
  {"text": "Plan quality time with loved ones", "difficulty": "medium"},
  {"text": "Meet someone new or network", "difficulty": "hard"}
]'::jsonb, 'beginner', true),

-- HYBRID/BALANCED TEMPLATES
('Founder Mode', 'Balance building, learning, and shipping', 'work', '[
  {"text": "Ship one feature or improvement", "difficulty": "hard"},
  {"text": "Talk to 3 users/customers", "difficulty": "medium"},
  {"text": "Learn from competitors or market", "difficulty": "medium"},
  {"text": "Update metrics dashboard", "difficulty": "easy"},
  {"text": "Plan next sprint priorities", "difficulty": "medium"}
]'::jsonb, 'advanced', true),

('Balanced Life Blueprint', 'Holistic approach to thriving', 'productivity', '[
  {"text": "Move your body (30 min)", "difficulty": "easy"},
  {"text": "Do your most important work", "difficulty": "hard"},
  {"text": "Connect with someone you care about", "difficulty": "medium"},
  {"text": "Learn something new", "difficulty": "easy"},
  {"text": "Rest and reflect on your day", "difficulty": "easy"}
]'::jsonb, 'intermediate', true);

-- ═══════════════════════════════════════════════
-- EQUIPMENT CATALOG - WEAPONS
-- ═══════════════════════════════════════════════

INSERT INTO equipment_catalog (name, type, description, gold_price, stat_bonus, emoji, rarity, level_requirement) VALUES

-- COMMON WEAPONS (Level 1+)
('Wooden Practice Sword', 'weapon', 'Every hero starts somewhere. +5% XP on easy quests.', 100, '{"xp_multiplier": 1.05}'::jsonb, '🗡️', 'common', 1),
('Rusty Dagger', 'weapon', 'Seen better days, but still sharp. +5% XP on all quests.', 150, '{"xp_multiplier": 1.05}'::jsonb, '🔪', 'common', 1),

-- RARE WEAPONS (Level 3+)
('Iron Longsword', 'weapon', 'Reliable and balanced. +10% XP on medium quests.', 500, '{"xp_multiplier": 1.10}'::jsonb, '⚔️', 'rare', 3),
('Mystic Staff', 'weapon', 'Channels arcane energy. +10% XP on hard quests.', 600, '{"xp_multiplier": 1.10}'::jsonb, '🪄', 'rare', 3),

-- EPIC WEAPONS (Level 5+)
('Flamebrand Greatsword', 'weapon', 'Forged in dragon fire. +15% XP on all quests.', 1200, '{"xp_multiplier": 1.15}'::jsonb, '🔥', 'epic', 5),
('Shadowstrike Bow', 'weapon', 'Silent but deadly. +15% XP + 10% gold bonus.', 1500, '{"xp_multiplier": 1.15, "gold_bonus": 1.10}'::jsonb, '🏹', 'epic', 5),

-- LEGENDARY WEAPONS (Level 10+)
('Excalibur Reforged', 'weapon', 'The legendary blade. +25% XP on all quests.', 3000, '{"xp_multiplier": 1.25}'::jsonb, '⚡', 'legendary', 10),
('Chronos Hourglass', 'weapon', 'Bends time itself. +20% XP + streak freeze protection.', 3500, '{"xp_multiplier": 1.20, "streak_protection": true}'::jsonb, '⏳', 'legendary', 10),

-- ═══════════════════════════════════════════════
-- EQUIPMENT CATALOG - ARMOR
-- ═══════════════════════════════════════════════

('Leather Tunic', 'armor', 'Basic protection for new adventurers. +5% XP.', 120, '{"xp_multiplier": 1.05}'::jsonb, '🥼', 'common', 1),
('Chainmail Vest', 'armor', 'Tested in real battles. +10% XP on medium quests.', 450, '{"xp_multiplier": 1.10}'::jsonb, '🛡️', 'rare', 3),
('Dragonscale Armor', 'armor', 'Nearly indestructible. +15% XP + 1 streak freeze per week.', 1400, '{"xp_multiplier": 1.15, "streak_protection": true}'::jsonb, '🐉', 'epic', 5),
('Celestial Plate Armor', 'armor', 'Blessed by the gods. +20% XP + immunity to first failure.', 3200, '{"xp_multiplier": 1.20, "streak_protection": true}'::jsonb, '✨', 'legendary', 10),

-- ═══════════════════════════════════════════════
-- EQUIPMENT CATALOG - ACCESSORIES
-- ═══════════════════════════════════════════════

('Lucky Charm', 'accessory', 'A simple trinket with surprising power. +5% gold.', 100, '{"gold_bonus": 1.05}'::jsonb, '🍀', 'common', 1),
('Amulet of Focus', 'accessory', 'Sharpens the mind. +8% XP on hard quests.', 400, '{"xp_multiplier": 1.08}'::jsonb, '📿', 'rare', 3),
('Ring of Persistence', 'accessory', 'Never give up. Protects 1 streak per week.', 800, '{"streak_protection": true}'::jsonb, '💍', 'rare', 3),
('Crown of Wisdom', 'accessory', 'Knowledge is power. +12% XP on all quests.', 1300, '{"xp_multiplier": 1.12}'::jsonb, '👑', 'epic', 5),
('Phoenix Feather', 'accessory', 'Rise from the ashes. Unlimited streak protection.', 4000, '{"streak_protection": true, "unlimited_freezes": true}'::jsonb, '🪶', 'legendary', 10),

-- ═══════════════════════════════════════════════
-- EQUIPMENT CATALOG - COMPANION SKINS
-- ═══════════════════════════════════════════════

('Baby Phoenix', 'companion_skin', 'A loyal fire bird companion. Cosmetic only.', 200, '{}'::jsonb, '🐦‍🔥', 'common', 1),
('Shadow Wolf', 'companion_skin', 'Prowls by your side. Cosmetic only.', 300, '{}'::jsonb, '🐺', 'rare', 3),
('Crystal Dragon', 'companion_skin', 'Majestic and wise. +5% XP bonus.', 800, '{"xp_multiplier": 1.05}'::jsonb, '🐲', 'epic', 5),
('Cosmic Owl', 'companion_skin', 'Sees through time and space. +10% XP + 5% gold.', 1800, '{"xp_multiplier": 1.10, "gold_bonus": 1.05}'::jsonb, '🦉', 'legendary', 10);
