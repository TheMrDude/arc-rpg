# Equipment Shop & Skill Tree System - Progress Report

## ✅ COMPLETED (Backend & Database)

### Database Migrations (3 files)

#### 1. **Equipment Catalog Seed** ✅
**File:** `supabase/migrations/20251115170000_seed_equipment.sql`

**30 Items Seeded:**
- **8 Weapons** (0-1200 gold)
  - Wooden Stick (free, starter)
  - Beginner's Blade (50g, +5% XP)
  - Quest Slayer Sword (200g, +10% XP)
  - Axe of Persistence (250g, +12% XP)
  - Epic Destroyer (500g, +20% XP)
  - Staff of Mastery (600g, +18% XP, premium)
  - Lightbringer (1000g, +30% XP, legendary, premium)
  - The Eternal Flame (1200g, +35% XP, legendary, premium)

- **8 Armor** (0-1000 gold)
  - Cloth Robes (free, starter)
  - Leather Jerkin (30g, +10 defense)
  - Chain Mail (150g, +20 defense, 1 streak freeze)
  - Scale Armor (180g, +22 defense)
  - Plate Armor (400g, +35 defense, 2 streak freezes)
  - Crystal Ward (500g, +40 defense, premium)
  - Mythril Fortress (800g, +50 defense, 3 streak freezes, premium)
  - Titan's Embrace (1000g, +60 defense, 5 streak freezes, legendary, premium)

- **7 Accessories** (100-1200 gold)
  - Lucky Charm (100g, +5% gold)
  - XP Amulet (250g, +15% XP)
  - Gold Magnet (200g, +20% gold)
  - Time Turner (600g, quest redo, premium)
  - Ring of Focus (550g, +20% XP, premium)
  - Phoenix Feather (1000g, auto-revive streak, legendary, premium)
  - Crown of Insight (1200g, +30% XP, journal boost, premium)

- **7 Companions** (300-1100 gold)
  - Flame Spirit (300g, +10% XP)
  - Forest Adventurer (350g, +15% gold, +5% XP)
  - Cosmic Weaver (600g, +15% XP, premium)
  - Storm Caller (650g, +18% XP, premium)
  - Memory Keeper (500g, journal XP boost, premium)
  - Shadow Dragon (1000g, +25% XP, legendary, premium)
  - The Reflection (1100g, +30% XP, legendary, premium)

**Features:**
- Rarity tiers: common, rare, epic, legendary
- Premium-only items (14 total)
- Stat bonuses via JSONB (flexible system)
- Image URLs for companion display
- Indexed for performance

#### 2. **Archetype Skills Seed** ✅
**File:** `supabase/migrations/20251115170001_seed_archetype_skills.sql`

**25 Skills Total** (5 archetypes × 5 levels):

**WARRIOR** (Combat & Endurance):
- L5: Iron Will (+10% streak protection)
- L10: Battle Fury (+15% XP on hard quests)
- L15: Unbreakable (+20% streak defense)
- L20: Berserker Mode (+25% XP on 3-quest combos)
- L25: Titan's Endurance (auto-complete 1 easy quest/week)

**SEEKER** (Exploration & Discovery):
- L5: Path Finder (+10% XP on new quest types)
- L10: Curiosity Boost (+15% gold from exploration)
- L15: Knowledge Hunter (unlock bonus lore)
- L20: Insight (+20% XP on learning quests)
- L25: Master Explorer (unlock hidden quests)

**BUILDER** (Systems & Consistency):
- L5: Foundation (+10% XP on recurring quests)
- L10: Architect's Eye (+15% XP on quest chains)
- L15: System Master (+20% XP on organized completion)
- L20: Constructor (+25% XP on creation quests)
- L25: Grand Design (double XP on Sundays)

**SHADOW** (Introspection & Transformation):
- L5: Dark Insight (+10% XP on introspective quests)
- L10: Hidden Power (+15% XP after 3-day absence)
- L15: Shadow Step (skip 1 quest penalty/week)
- L20: Void Walker (+25% XP on solo reflection)
- L25: Embrace Darkness (failed quests = 50% XP if journaled)

**SAGE** (Wisdom & Enlightenment):
- L5: Ancient Wisdom (+10% XP on reflection)
- L10: Meditation (+15% XP after journaling)
- L15: Enlightenment (+20% XP on wisdom quests)
- L20: Mystic Knowledge (+25% XP on teaching/mentoring)
- L25: Transcendence (unlock legendary story arcs)

**Auto-Unlock System:**
- Trigger on profile level-up
- Automatically grants skills when requirements met
- Tracked in user_skills table

#### 3. **Gold Economy** ✅
**File:** `supabase/migrations/20251115170002_gold_economy.sql`

**Gold System:**
- `gold` column added to profiles (default: 100)
- Quest completion rewards:
  - Easy: 10 gold + level bonus
  - Medium: 25 gold + level bonus
  - Hard: 50 gold + level bonus
- Daily bonus: 25 gold (optional function)

**Transaction Tracking:**
- `gold_transactions` table (audit log)
- Records all gold gains/spends
- Tracks balance before/after
- Transaction types: quest_reward, equipment_purchase, daily_bonus, etc.

**Atomic Purchase Function:**
```sql
purchase_equipment(p_user_id, p_equipment_id)
```
- Verifies gold availability
- Checks ownership status
- Validates premium requirements
- Deducts gold and adds to inventory atomically
- Prevents race conditions

**Tables Created:**
- `gold_transactions` - Audit history
- `user_equipment` - Ownership tracking

### API Routes (3 endpoints)

#### 1. **GET /api/equipment/list** ✅
**File:** `app/api/equipment/list/route.js`

**Features:**
- Returns all equipment from catalog
- Enriches with user ownership status
- Shows: is_owned, is_equipped, can_afford, can_purchase
- Provides lock_reason (insufficient_gold, premium_required)
- Groups by type (weapon, armor, accessory, companion)
- Returns user gold balance
- Calculates stats (total items, owned items, etc.)

**Query Parameter:**
- `?type=weapon` - Filter by specific type

**Response:**
```json
{
  "equipment": {
    "weapon": [...],
    "armor": [...],
    "accessory": [...],
    "companion": [...]
  },
  "user_gold": 150,
  "is_premium": true,
  "stats": {
    "total_items": 30,
    "owned_items": 5,
    "equipped_items": 3,
    "affordable_items": 8
  }
}
```

#### 2. **POST /api/equipment/purchase** ✅
**File:** `app/api/equipment/purchase/route.js`

**Features:**
- Purchase equipment using gold
- Calls atomic `purchase_equipment()` function
- Validates gold, ownership, premium status
- Returns new balance + equipment details

**Request:**
```json
{
  "equipment_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "equipment": {
    "name": "Epic Destroyer",
    "type": "weapon",
    "rarity": "epic",
    "gold_price": 500,
    "stat_bonus": {"xp_multiplier": 1.20}
  },
  "new_balance": 650
}
```

**Error Responses:**
- 400: Insufficient gold, already owned
- 403: Premium required
- 404: Equipment not found

#### 3. **POST /api/equipment/equip** ✅
**File:** `app/api/equipment/equip/route.js`

**Features:**
- Equip or unequip items
- Only one item per type (slot) can be equipped
- Auto-unequips previous item in slot
- Validates ownership

**Request:**
```json
{
  "equipment_id": "uuid",
  "action": "equip" | "unequip"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Equipped Epic Destroyer",
  "action": "equip"
}
```

### Security Features ✅

All routes implement:
- ✅ Bearer token authentication
- ✅ User can only access own data
- ✅ Atomic transactions (no race conditions)
- ✅ Premium requirement checks
- ✅ Input validation
- ✅ RLS policies on database
- ✅ Audit logging (gold_transactions)

---

## 🚧 IN PROGRESS / TODO

### UI Components (Not Yet Built)

#### 1. **EquipmentShop Component** 🔴 TODO
**File:** `app/components/EquipmentShop.js` (not created yet)

**Requirements:**
- Tab navigation: Weapons | Armor | Accessories | Companions
- Gold balance display in header
- Grid layout (3 columns desktop, 1 mobile)
- Equipment cards showing:
  - Image/icon
  - Name, rarity (stars)
  - Description
  - Gold price
  - Stat bonuses
  - Purchase button OR Equipped ✓
  - Lock icon if can't afford
- Rarity color coding:
  - Common: gray
  - Rare: blue glow
  - Epic: purple glow
  - Legendary: gold animated glow
- Filter/sort options
- Search bar
- Sidebar showing equipped items + total stats
- Confetti on legendary purchases
- Loading states
- Error handling
- Mobile responsive

**Integrations:**
- `/api/equipment/list` - Load catalog
- `/api/equipment/purchase` - Buy items
- `/api/equipment/equip` - Equip items

#### 2. **SkillTree Component** 🔴 TODO
**File:** `app/components/SkillTree.js` (not created yet)

**Requirements:**
- Visual tree showing L5 → L10 → L15 → L20 → L25
- Archetype-specific trees (5 different layouts)
- Skill nodes showing:
  - Lock icon if not unlocked (with "Unlock at Level X")
  - Skill icon/emoji if unlocked
  - Skill name
  - Description on hover/click
  - Glowing animation for newly unlocked
- Line connections between nodes
- Current level indicator
- Progress bar to next unlock

**API Route Needed:**
```javascript
// GET /api/skills/list
// Returns user's unlocked skills + available skills for archetype
```

#### 3. **Companion Display System** 🔴 TODO
**File:** `app/components/CompanionDisplay.js` (not created yet)

**Requirements:**
- Display equipped companion (if type='companion')
- Use chibi character images from `/companions/` folder
- Animated display (idle animation, floating, etc.)
- Click to interact (shows stats, abilities)
- Integrate with existing 47 chibi images
- Follow companion around dashboard (optional fun feature)

**Integration:**
- Pull equipped companion from `/api/equipment/list`
- Show in corner or sidebar of dashboard
- Display stat bonuses from companion

#### 4. **Dashboard Integration** 🔴 TODO

**Changes Needed:**
- Add **gold balance** to header (animated on change)
- Add **equipped items** section:
  - Show weapon, armor, accessory, companion
  - Click to open shop/change
- Add **stats summary** panel:
  - Total XP multiplier from all equipment
  - Total gold multiplier
  - Streak protection count
  - Special abilities list
- Add new **navigation tabs**:
  - ⚔️ Equipment (opens shop)
  - 🌲 Skills (opens skill tree)
- **Quick access buttons**:
  - Gold counter → click to open shop
  - Level indicator → click to view skills

---

## 📊 Database Schema Summary

**Tables Created:**
1. `equipment_catalog` - 30 items seeded
2. `archetype_skills` - 25 skills seeded
3. `user_equipment` - Ownership & equipped status
4. `user_skills` - Unlocked skills tracking
5. `gold_transactions` - Audit log

**Functions Created:**
1. `award_quest_gold()` - Quest completion trigger
2. `purchase_equipment()` - Atomic purchase
3. `auto_unlock_skills()` - Level-up trigger
4. `award_daily_gold_bonus()` - Daily bonus

**Triggers Created:**
1. `award_gold_trigger` - ON quest completion
2. `auto_unlock_skills_trigger` - ON profile level update

---

## 🎯 Next Steps (Priority Order)

### High Priority (Core Functionality)
1. **Create EquipmentShop component** - Users need to see/buy items
2. **Create GET /api/skills/list route** - Fetch user skills
3. **Create SkillTree component** - Visualize progression
4. **Integrate gold display into dashboard header**
5. **Add equipment tab to dashboard navigation**

### Medium Priority (Enhanced Experience)
6. **Create CompanionDisplay component** - Show equipped companion
7. **Add equipped items sidebar to dashboard**
8. **Create stats summary panel** - Total bonuses
9. **Implement equipment effects** - Actually apply stat bonuses to XP/gold calculations
10. **Add skill effects** - Apply skill bonuses to gameplay

### Low Priority (Polish)
11. **Add confetti on legendary purchases**
12. **Animated skill unlocks with notifications**
13. **Equipment preview/try-on system**
14. **Companion idle animations**
15. **Achievement for collecting all items**

---

## 💰 Gold Economy Summary

**Starting Balance:** 100 gold (all users)

**Earning Gold:**
- Easy quests: 10 + level
- Medium quests: 25 + level
- Hard quests: 50 + level
- Daily bonus: 25 (optional)
- Equipment bonuses: +5% to +20% from accessories

**Spending Gold:**
- Cheapest items: 0 (starters)
- Common items: 30-100
- Rare items: 150-350
- Epic items: 400-650
- Legendary items: 800-1200

**Example Progression:**
- Level 5 player completing medium quests: ~30 gold each
- Need ~4 quests to afford rare weapon (200g)
- Need ~17 quests to afford epic weapon (500g)
- Need ~40 quests to afford legendary weapon (1200g)

**Premium vs Free:**
- All items available to free users
- 14 premium-only items require is_premium = true
- Premium items are highest tier (epic/legendary)

---

## 🛡️ Security Implementation

**Completed:**
- ✅ Bearer token authentication
- ✅ Atomic transactions (race condition prevention)
- ✅ Premium validation
- ✅ Ownership verification
- ✅ RLS policies
- ✅ Input validation
- ✅ Audit logging

**Best Practices:**
- All gold operations are atomic
- Can't purchase what you already own
- Can't equip what you don't own
- Can't spend more gold than you have
- Can't access other users' data

---

## 📁 Files Summary

**Completed:**
- 3 database migrations (~1,000 lines SQL)
- 3 API routes (~400 lines JavaScript)
- **Total: 6 files created**

**Remaining:**
- 3-4 UI components (~1,500 lines React)
- 1-2 additional API routes (~200 lines)
- Dashboard integration (~300 lines)
- **Estimated: 7-8 files to create**

---

## 🎮 User Experience Flow

**New User:**
1. Starts with 100 gold
2. Has 2 free starter items (Wooden Stick, Cloth Robes)
3. Completes quests → earns gold
4. Opens shop → sees affordable items
5. Purchases first real weapon (Beginner's Blade, 50g)
6. Equips weapon → sees stat boost
7. Continues grinding → unlocks better gear

**Level 5 User:**
1. Unlocks first skill (archetype-specific)
2. Notification celebration
3. Opens skill tree → sees progression path
4. Can afford rare equipment (~200-300g)

**Level 10+ User:**
1. Multiple skills unlocked
2. Can afford epic equipment
3. Builds optimized loadout
4. Sees clear progression to legendary items

**Premium User:**
1. Access to 14 premium-only items
2. Best stat bonuses available
3. Exclusive companions (Shadow Dragon, The Reflection)
4. Full progression unlocked

---

## ✨ What Makes This Special

1. **30 unique items** - Meaningful choices
2. **Archetype-specific skills** - Personalized progression
3. **Gold economy** - Earn through gameplay
4. **Atomic transactions** - No cheating/exploits
5. **Companion display** - Visual progression
6. **Rarity tiers** - Clear upgrade path
7. **Premium bonuses** - Value for paid users
8. **Auto-unlocks** - Smooth progression
9. **Audit logging** - Full transparency
10. **Retro aesthetic** - Fits HabitQuest theme

---

**Status:** Backend Complete ✅ | Frontend TODO 🔴
**Next Action:** Build EquipmentShop component
**ETA:** 2-3 hours for complete UI implementation
