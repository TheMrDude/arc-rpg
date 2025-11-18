# 🚀 COPY & PASTE MIGRATIONS - COMPLETE GUIDE

**Save this file! Use it when starting new chats.**

---

## 📋 DATABASE MIGRATIONS - RUN IN ORDER

All 6 migration files are in `/supabase/migrations/`:

1. ✅ `20251116010000_map_progression.sql`
2. ✅ `20251116020000_achievements_system.sql`
3. ✅ `20251116030000_quest_chains.sql`
4. ✅ `20251116040000_enhanced_story_events.sql`
5. ✅ `20251116050000_seasonal_events.sql`
6. ✅ `20251116060000_push_notifications.sql`

---

## 🎯 STEP-BY-STEP INSTRUCTIONS

### Migration 1: Map Progression System

**File:** `supabase/migrations/20251116010000_map_progression.sql`

**What it does:**
- Creates progressive map reveal system
- 5 starter locations (Starting Village, Mystic Forest, Mountain Peak, Crystal Caves, Dragon's Lair)
- Unlocks based on level or quest completion
- Tracks user exploration progress

**To Run:**
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20251116010000_map_progression.sql`
3. Copy ALL contents
4. Paste into SQL Editor
5. Click **RUN**
6. Verify: "Success" message appears

**Tables Created:**
- `map_locations` - All available map locations
- `user_map_progress` - User's unlocked locations

---

### Migration 2: Achievements System

**File:** `supabase/migrations/20251116020000_achievements_system.sql`

**What it does:**
- Creates achievement/badge system
- 10 starter achievements (First Quest, Quest Master, Streak Champion, etc.)
- Auto-unlocks on quest completion
- Awards gold + XP rewards
- Rarity tiers: common, rare, epic, legendary

**To Run:**
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20251116020000_achievements_system.sql`
3. Copy ALL contents
4. Paste into SQL Editor
5. Click **RUN**
6. Verify: "Success" message appears

**Tables Created:**
- `achievements` - All available achievements
- `user_achievements` - User's unlocked achievements

**Achievements Included:**
- 🎯 First Steps (1 quest)
- ⭐ Quest Master (10 quests)
- 🏆 Quest Legend (50 quests)
- 🔥 Week Warrior (7-day streak)
- 💪 Streak Champion (30-day streak)
- ⚡ Rising Star (Level 10)
- 👑 Hero of the Realm (Level 20)
- 🗺️ Explorer (5 locations)
- 🧭 Master Cartographer (all locations)
- 🎊 Founder (special event)

---

### Migration 3: Quest Chains

**File:** `supabase/migrations/20251116030000_quest_chains.sql`

**What it does:**
- Multi-step quest sequences
- Time gates between steps
- Branching narratives
- Premium quest chains
- Story progression tracking

**To Run:**
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20251116030000_quest_chains.sql`
3. Copy ALL contents
4. Paste into SQL Editor
5. Click **RUN**
6. Verify: "Success" message appears

**Tables Created:**
- `quest_chains` - Chain definitions
- `quest_chain_steps` - Individual steps in each chain
- `user_quest_chain_progress` - User progress tracking

**Quest Chains Included:**
- ⚔️ **The Founder's Journey** (5 steps, 2 weeks, FREE)
- 🔮 **Mystic Awakening** (7 steps, 3 weeks, PREMIUM)
- 💰 **The Merchant's Guild** (4 steps, 1 week, FREE)

---

### Migration 4: Enhanced Story Events

**File:** `supabase/migrations/20251116040000_enhanced_story_events.sql`

**What it does:**
- Random narrative encounters
- Player choices with consequences
- Rarity system (common → legendary)
- Dynamic storytelling
- Rewards/penalties based on choices

**To Run:**
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20251116040000_enhanced_story_events.sql`
3. Copy ALL contents
4. Paste into SQL Editor
5. Click **RUN**
6. Verify: "Success" message appears

**Tables Created:**
- `story_event_templates` - Event definitions
- `story_event_choices` - Available player choices
- `user_story_events` - User's event history

**Events Included:**
- 🎭 The Mysterious Merchant
- 🌳 Spirit of the Forest
- ⚔️ Goblin Ambush!
- 💎 Ancient Treasure
- ⏰ The Time Traveler

---

### Migration 5: Seasonal Events

**File:** `supabase/migrations/20251116050000_seasonal_events.sql`

**What it does:**
- Time-limited events
- Event-specific challenges
- Leaderboards
- Exclusive rewards
- FOMO mechanics

**To Run:**
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20251116050000_seasonal_events.sql`
3. Copy ALL contents
4. Paste into SQL Editor
5. Click **RUN**
6. Verify: "Success" message appears

**Tables Created:**
- `seasonal_events` - Event definitions
- `seasonal_challenges` - Event challenges
- `seasonal_rewards` - Claimable rewards
- `user_seasonal_progress` - User points/progress
- `user_seasonal_challenge_progress` - Challenge tracking

**Events Included:**
- 🎊 **Founders Month** (Nov 1-30, 2025)
  - 5 challenges (daily, weekly, milestones)
  - 4 exclusive rewards
  - Limited-quantity phoenix pet!

---

### Migration 6: Push Notifications

**File:** `supabase/migrations/20251116060000_push_notifications.sql`

**What it does:**
- Web push notification system
- User preferences (what/when to notify)
- Quiet hours support
- Auto-notifications on events
- Notification history tracking

**To Run:**
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20251116060000_push_notifications.sql`
3. Copy ALL contents
4. Paste into SQL Editor
5. Click **RUN**
6. Verify: "Success" message appears

**Tables Created:**
- `push_subscriptions` - User device subscriptions
- `notification_preferences` - User notification settings
- `notification_queue` - Scheduled notifications
- `notification_history` - Sent notification log

**Auto-Triggers:**
- Achievement unlocks → Instant notification
- Quest chain steps → Instant notification
- Daily bonus reminder → Scheduled at user's preferred time
- Streak reminders → Scheduled

---

## 🎊 AFTER RUNNING ALL MIGRATIONS

### 1. Activate Founders Month Event

```sql
UPDATE seasonal_events
SET is_active = true
WHERE id = 'founders_month';
```

**To Run:**
1. Go to Supabase SQL Editor
2. Copy the SQL above
3. Paste and click **RUN**
4. Verify: "1 row updated"

---

### 2. Generate PWA Icons (Optional)

You need icons in these sizes:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

**Easiest Method:**
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload your 512x512 logo
3. Download generated pack
4. Extract to `/public/icons/`

---

### 3. Configure Push Notifications (Optional)

**Get VAPID Keys:**
- Firebase: https://console.firebase.google.com
- OneSignal: https://onesignal.com

**Add to `.env.local`:**
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_key_here
```

---

## 🎯 QUICK VERIFICATION

After running all migrations, verify in Supabase:

**Tables Tab - Should see:**
- ✅ map_locations (5 rows)
- ✅ user_map_progress (empty)
- ✅ achievements (10 rows)
- ✅ user_achievements (empty)
- ✅ quest_chains (3 rows)
- ✅ quest_chain_steps (5 rows)
- ✅ user_quest_chain_progress (empty)
- ✅ story_event_templates (5 rows)
- ✅ story_event_choices (9 rows)
- ✅ user_story_events (empty)
- ✅ seasonal_events (1 row)
- ✅ seasonal_challenges (5 rows)
- ✅ seasonal_rewards (4 rows)
- ✅ user_seasonal_progress (empty)
- ✅ push_subscriptions (empty)
- ✅ notification_preferences (empty)
- ✅ notification_queue (empty)

---

## 📈 METRICS TO TRACK

- Quest chain start rate
- Quest chain completion rate
- Story event trigger frequency
- Seasonal challenge participation
- Push notification CTR
- Map exploration progress
- Achievement unlock distribution

---

## 💰 MONETIZATION UNLOCKED

- ✅ Premium Quest Chains
- ✅ Early Event Access
- ✅ Notification Priority
- ✅ Seasonal Exclusive Rewards
- ✅ Quest Chain Boosters

---

## 🆘 TROUBLESHOOTING

**"Relation already exists"**
- Migration already ran, skip to next

**"Column does not exist"**
- Run migrations in order (1→6)

**No data showing up**
- Check RLS policies are enabled
- Verify user is authenticated

**Seasonal event not active**
- Run the activation SQL from Step 1 above

---

## 🎉 YOU'RE DONE!

All features ready to deploy:
- 🗺️ Progressive map exploration
- 🏆 Achievement system
- ⛓️ Multi-step quest chains
- 🎭 Random story events
- 🎊 Seasonal events (Founders Month)
- 🔔 Push notifications

**Deploy and ship!** 🚀
