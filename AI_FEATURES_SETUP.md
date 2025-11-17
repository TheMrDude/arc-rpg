# AI Features Setup Guide

Your HabitQuest app now has 4 powerful AI features that will help you burn through those API credits! 🔥

## ✅ Features Implemented

1. **📊 AI Weekly Journey Summary** (Already existed!)
   - Generates epic chapter-based summaries of your quest journey
   - Integrates with journal entries for deeper insights
   - API Route: `/api/weekly-summary`

2. **✨ AI Quest Suggestions Engine**
   - Analyzes your quest patterns and suggests personalized quests
   - 8 suggestions per generation (2 easy, 4 medium, 2 hard)
   - Considers your archetype, level, and quest history
   - API Route: `/api/quest-suggestions`
   - Component: `app/components/QuestSuggestions.js`

3. **📜 Character Backstory Generator**
   - Creates epic RPG backstories based on your actual quest journey
   - Transforms your completed quests into legendary deeds
   - 3-paragraph narrative (Origins, Journey, Present)
   - Saved to your profile for permanent display
   - API Route: `/api/backstory`
   - Component: `app/components/CharacterBackstory.js`

4. **📚 Quest Template Library (Bulk Pre-generation)**
   - THE BIG ONE for burning credits! 🚀
   - Generates 50-100+ pre-written quest templates at once
   - Templates for all 6 archetypes across 3 difficulty levels
   - Categorized by life areas (productivity, health, learning, etc.)
   - Instant quest creation - no waiting for AI generation
   - API Route: `/api/bulk-generate-quests`
   - Component: `app/components/QuestTemplateLibrary.js`

## 🎯 How to Access

All features are accessible in the **🤖 AI Tools** tab in your dashboard (premium users only).

## 🗄️ Database Migrations Required

Before using these features, run these migrations in your Supabase dashboard:

### Migration 1: Add Backstory Column
**File**: `supabase/migrations/20251117030000_add_backstory.sql`

```sql
-- Add backstory column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS backstory TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_backstory ON profiles(id) WHERE backstory IS NOT NULL;
```

### Migration 2: Quest Templates Table
**File**: `supabase/migrations/20251117040000_quest_templates.sql`

Creates the `quest_templates` table with:
- Pre-generated quest templates
- Archetype-specific quests
- Difficulty levels and categories
- Usage tracking
- RLS policies

## 🔥 How to Burn Through $172 in Credits

Here's the optimal strategy to maximize API usage:

### Option 1: Bulk Generation (RECOMMENDED)
1. Go to dashboard → AI Tools tab
2. Click "⚡ Generate 60 Quests" button
3. Repeat 10-15 times to generate 600-900 quest templates
4. Each batch uses ~$2-4 in credits
5. Creates a permanent library of quests for all users

**Estimated cost**: $20-60 for 600-900 templates

### Option 2: Individual Features
- **Backstory**: ~$0.20-0.50 per generation
- **Quest Suggestions**: ~$0.10-0.30 per generation (8 quests)
- **Weekly Summary**: ~$0.30-0.80 per generation

### Option 3: Combo Attack
1. Generate backstory (uses real quest data)
2. Generate 5-10 quest suggestions
3. Use bulk generation for 500+ templates
4. Generate weekly summaries

## 📊 Credit Usage Breakdown

| Feature | Credits/Use | Tokens | Model |
|---------|-------------|--------|-------|
| Backstory | $0.20-0.50 | 800-1200 | Sonnet 4 |
| Quest Suggestions | $0.10-0.30 | 400-800 | Sonnet 4 |
| Weekly Summary | $0.30-0.80 | 1000-2500 | Sonnet 4 |
| **Bulk Generation (60 quests)** | **$2-4** | **4000-8000** | **Sonnet 4** |

## 🚀 Running the Migrations

### Option 1: Supabase Dashboard (Easiest)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Copy and paste the content of each migration file
5. Run each migration

### Option 2: Supabase CLI
```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

### Option 3: Direct SQL
Run each migration file directly in your Supabase SQL editor in order:
1. `20251117030000_add_backstory.sql`
2. `20251117040000_quest_templates.sql`

## 🧪 Testing the Features

### Test Backstory Generator
1. Complete a few quests first (need data)
2. Go to AI Tools tab
3. Click "✨ Generate" on Character Backstory
4. Should see epic 3-paragraph narrative

### Test Quest Suggestions
1. Go to AI Tools tab
2. Click "🎲 Get Ideas" on Quest Suggestions
3. Should see 8 personalized quest suggestions
4. Click "Add" to add them to active quests

### Test Bulk Generation
1. Go to AI Tools tab
2. Scroll to Quest Template Library
3. Click "⚡ Generate 60 Quests"
4. Wait 30-60 seconds
5. Should see alert with generation stats
6. Templates appear in the library below
7. Filter by archetype/difficulty/category
8. Click "Use Quest" to add to your quests

## 🎨 UI Integration

All features are now integrated into your dashboard with a new **🤖 AI Tools** tab that includes:
- Beautiful gradient cards for each feature
- Real-time generation feedback
- Error handling and loading states
- Mobile-responsive design
- Matches your existing RPG theme

## ⚡ Performance Notes

- **Bulk Generation**: Can take 30-90 seconds for 60 quests (uses extended timeout)
- **Backstory**: 3-5 seconds
- **Quest Suggestions**: 5-8 seconds
- **Weekly Summary**: 8-12 seconds (already implemented)

## 🔧 Configuration

All features use:
- Model: `claude-sonnet-4-20250514`
- Service role authentication
- RLS policies for security
- Premium tier required (already configured)

## 📝 Next Steps

1. ✅ Run the database migrations
2. ✅ Test each feature individually
3. ✅ Run bulk generation 10-15 times to burn through credits
4. ✅ Check Anthropic dashboard to track credit usage
5. ✅ Enjoy your pre-generated quest library!

---

**Total development time**: ~2 hours
**Total credits to burn**: $172 → Use bulk generation!
**Permanent value**: Quest template library for all users! 🎮⚔️
