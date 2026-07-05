-- Drop legacy equipment columns retired by the move to user_equipment.equipped
-- as the single source of truth for equip state.
--
-- ⚠️ SEQUENCING: do NOT run this until the /api/complete-quest fix that reads
-- user_equipment.equipped (instead of the profiles_equipped_*_fkey joins) is
-- deployed. As of 2026-07-04 that fix is uncommitted work on branch
-- claude/blissful-clarke-476fa3. Running this first would break quest
-- completion, since the FK-hinted joins below would no longer resolve.
--
-- Verified 2026-07-04 against live data (project vxzholcypozuurmsmbub):
--   - profiles.equipped_weapon/armor/accessory: legacy equip pointers, only
--     written by the deleted app/equipment/page.js
--   - user_equipment.is_equipped: legacy flag, 0 true rows; superseded by
--     user_equipment.equipped
--   - equipment_catalog.slot: NULL for all rows (equipment_catalog.type is
--     the live field); equipment_catalog.icon_emoji: unused

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS equipped_weapon,
  DROP COLUMN IF EXISTS equipped_armor,
  DROP COLUMN IF EXISTS equipped_accessory;

ALTER TABLE public.user_equipment
  DROP COLUMN IF EXISTS is_equipped;

ALTER TABLE public.equipment_catalog
  DROP COLUMN IF EXISTS slot,
  DROP COLUMN IF EXISTS icon_emoji;
