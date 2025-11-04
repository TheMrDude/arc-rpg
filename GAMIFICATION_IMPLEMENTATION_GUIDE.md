# HabitQuest Gamification System - Implementation Guide

This guide documents the comprehensive gamification system implemented for HabitQuest, based on Duolingo's proven design patterns and UX research.

## 📋 Table of Contents

1. [Phase 1: Quest Complete Button](#phase-1-quest-complete-button)
2. [Phase 2: Streak Flame Animation](#phase-2-streak-flame-animation)
3. [Phase 3: Streak Freeze System](#phase-3-streak-freeze-system)
4. [Phase 4: Milestone Celebrations](#phase-4-milestone-celebrations)
5. [Phase 5: Value-First Onboarding](#phase-5-value-first-onboarding)
6. [Phase 6: Character Naming](#phase-6-character-naming)
7. [Phase 7: Quest Reflections](#phase-7-quest-reflections)
8. [Phase 10: Sound Effects System](#phase-10-sound-effects-system)
9. [Installation & Setup](#installation--setup)
10. [Database Migrations](#database-migrations)

---

## Phase 1: Quest Complete Button

### Location
`/app/components/ui/QuestCompleteButton.tsx`

### Features
- **Box-shadow physics**: 3D button effect with 4px press depth
- **Confetti celebration**: Canvas-confetti with custom HabitQuest colors
- **Sound effects**: Plays completion sound on click
- **Haptic feedback**: Navigator.vibrate for mobile devices
- **Framer Motion animations**: Spring physics (stiffness: 400, damping: 17)
- **Interactive states**: whileTap scale: 0.85, whileHover scale: 1.05

### Usage Example
```tsx
import QuestCompleteButton from '@/app/components/ui/QuestCompleteButton';

<QuestCompleteButton
  onComplete={() => handleQuestComplete(questId, xpReward)}
  xpReward={25}
  questTitle="Clean Kitchen"
/>
```

### Files Created
- `QuestCompleteButton.tsx` - Main component
- `QuestCompleteButton.module.css` - 3D press effect styles
- `QuestCompleteButtonExample.tsx` - Full integration example

---

## Phase 2: Streak Flame Animation

### Location
`/app/components/animations/StreakFlame.tsx`

### Features
- **Animated flame emoji**: Scales [1, 1.2, 1] and rotates [-10, 10, 0]
- **Infinite loop**: 2-second duration with smooth easing
- **Spring physics**: Number animates when streak increments
- **Freeze shield**: Shows 🛡️ badge when freeze is active
- **Three variants**: Standard, Milestone, Compact

### Usage Example
```tsx
import StreakFlame from '@/app/components/animations/StreakFlame';

<StreakFlame
  streakCount={userProfile.streak_count}
  hasFreeze={userProfile.streak_freeze_active}
/>
```

### Variants
1. **StreakFlame** - Full size for dashboard
2. **StreakFlameMilestone** - With milestone badge
3. **StreakFlameCompact** - Inline for headers

---

## Phase 3: Streak Freeze System

### Overview
Implements Duolingo's "Streak Freeze" mechanic to reduce churn by 21%.

### Database Changes
**Migration**: `/supabase/migrations/add_streak_freeze.sql`

```sql
ALTER TABLE profiles
ADD COLUMN streak_freeze_count INTEGER DEFAULT 0,
ADD COLUMN streak_freeze_active BOOLEAN DEFAULT false;
```

### Utility Functions
**Location**: `/lib/gamification/streak-protection.ts`

```typescript
// Purchase a freeze for 50 XP
await purchaseStreakFreeze(userId);

// Check if streak broke or was protected
const status = await checkStreakBreak(userId);

// Get freeze count
const count = await getFreezeCount(userId);
```

### UI Components
1. **StreakFreezeShop** - Purchase interface
2. **StreakFreezeActivation** - Celebration modal when freeze saves streak

### Usage Example
```tsx
import StreakFreezeShop from '@/app/components/StreakFreezeShop';

<StreakFreezeShop
  currentXP={profile.xp}
  freezeCount={profile.streak_freeze_count}
  onPurchase={handlePurchaseFreeze}
/>
```

---

## Phase 4: Milestone Celebrations

### Location
`/app/components/animations/MilestoneCelebration.tsx`

### Features
- **Full-screen modal**: Dark overlay with backdrop blur
- **Forced viewing**: Can't close for first 1.5 seconds
- **Continuous confetti**: 3-second celebration
- **Level-based unlocks**: Shows new features at milestones
- **Sound effects**: Plays fanfare on appearance

### Milestone Unlocks

#### Level 5: Novice Adventurer
- 🔄 Recurring Quests
- 🐾 First Companion
- 🛡️ Streak Freeze Shop

#### Level 10: Seasoned Hero
- ⚔️ Archetype Selection
- 📋 Quest Templates
- 📖 Weekly Stories

#### Level 15: Master Questor
- 🎨 Custom Categories
- 🔍 Advanced Filters
- 😊 Mood Tracking

#### Level 20: Legendary Champion
- 👥 Party Quests
- 🔌 API Access
- ⚜️ Legendary Equipment

### Usage Example
```tsx
import MilestoneCelebration from '@/app/components/animations/MilestoneCelebration';

<MilestoneCelebration
  show={showCelebration}
  onClose={() => setShowCelebration(false)}
  milestone={10}
  type="level"
/>
```

---

## Phase 5: Value-First Onboarding

### Location
`/app/onboarding/page.tsx`

### Strategy
Deliver value BEFORE account creation (Duolingo's 86% retention boost).

### Flow Steps

1. **Step 1: Input Task**
   - User enters mundane task
   - "Transform into Quest" button
   - Shows quest count and XP earned

2. **Step 2: Show Transformed Quest**
   - Display epic quest with emoji
   - Narrative description in gradient box
   - XP reward and difficulty stars
   - Accept or try different words

3. **Step 3: Signup Prompt**
   - After 3 quests created
   - Shows total XP earned
   - Lists benefits of account
   - "4x higher retention" social proof

### Data Storage
- Stores quests in localStorage until signup
- Migrates to database on account creation

### Usage
```tsx
// Navigate users to onboarding
router.push('/onboarding');
```

---

## Phase 6: Character Naming

### Database Changes
**Migration**: `/supabase/migrations/add_character_naming.sql`

```sql
ALTER TABLE profiles
ADD COLUMN character_name TEXT;
```

### Features
- **Name input**: User chooses hero name
- **Auto-generation**: Default names based on archetype
- **Validation**: 2-50 characters
- **Story integration**: Used in weekly AI chapters

### Usage Example
```tsx
import CharacterNaming from '@/app/components/CharacterNaming';

<CharacterNaming
  onComplete={(name) => handleSaveName(name)}
  onSkip={() => router.push('/dashboard')}
  archetype={userArchetype}
/>
```

### Default Names by Archetype
- Warrior → "Warrior the Bold"
- Seeker → "Seeker the Curious"
- Builder → "Builder the Steadfast"
- Sage → "Sage the Wise"

---

## Phase 7: Quest Reflections

### Database Changes
**Migration**: `/supabase/migrations/add_quest_reflections.sql`

```sql
CREATE TABLE quest_reflections (
  id UUID PRIMARY KEY,
  quest_id UUID REFERENCES quests(id),
  user_id UUID REFERENCES profiles(id),
  reflection_text TEXT CHECK (LENGTH(reflection_text) <= 500),
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Features
- **Optional prompt**: Shows after quest completion
- **Mood slider**: 1-5 emoji scale (😔 to 🤩)
- **Text reflection**: 1-500 characters
- **XP bonus**: +10 XP for reflecting
- **Story integration**: Feeds weekly narrative

### Usage Example
```tsx
import ReflectionPrompt from '@/app/components/ReflectionPrompt';

<ReflectionPrompt
  show={showReflection}
  onClose={() => setShowReflection(false)}
  questId={completedQuestId}
  questTitle="Clean Kitchen"
  onSubmit={handleSaveReflection}
/>
```

---

## Phase 10: Sound Effects System

### Location
`/lib/audio/SoundManager.ts`

### Sound Files Needed
Place in `/public/sounds/`:

1. **quest-complete.mp3** (200ms) - Satisfying chime
2. **level-up.mp3** (800ms) - Fanfare
3. **quest-accept.mp3** (150ms) - Positive ping
4. **streak-milestone.mp3** (600ms) - Celebration
5. **button-click.mp3** (50ms) - Soft tap
6. **error.mp3** (150ms) - Gentle notification
7. **whoosh.mp3** (100ms) - Transition sweep

See `/public/sounds/README.md` for sourcing guide.

### Features
- **Singleton manager**: Global sound control
- **User preferences**: Stored in localStorage
- **Volume control**: 0-100% master volume
- **Lazy loading**: Sounds load on first interaction
- **Performance**: Audio pooling and caching

### Usage Example
```tsx
import { useSound } from '@/app/components/SoundProvider';

function MyComponent() {
  const { play, enabled, setEnabled } = useSound();

  const handleClick = () => {
    play('button-click');
    // ... rest of logic
  };

  return <button onClick={handleClick}>Click Me</button>;
}
```

### Settings Component
```tsx
import SoundSettings from '@/app/components/SoundSettings';

<SoundSettings />
```

---

## Installation & Setup

### 1. Install Dependencies
```bash
npm install framer-motion canvas-confetti lottie-react date-fns zustand
```

### 2. Run Database Migrations
```bash
# In Supabase SQL Editor, run each migration file:
supabase/migrations/add_streak_freeze.sql
supabase/migrations/add_character_naming.sql
supabase/migrations/add_quest_reflections.sql
```

### 3. Add Sound Files
1. Download or generate sound files (see `/public/sounds/README.md`)
2. Place in `/public/sounds/` directory
3. Ensure file names match exactly:
   - quest-complete.mp3
   - level-up.mp3
   - quest-accept.mp3
   - etc.

### 4. Wrap App with Providers
```tsx
// app/layout.tsx
import { SoundProvider } from './components/SoundProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SoundProvider>
          {children}
        </SoundProvider>
      </body>
    </html>
  );
}
```

---

## Database Migrations

### Run Order
1. `add_streak_freeze.sql` - Adds freeze columns and functions
2. `add_character_naming.sql` - Adds name column and generators
3. `add_quest_reflections.sql` - Creates reflections table

### Manual Migration Steps
If not using Supabase CLI:

1. Log into Supabase Dashboard
2. Go to SQL Editor
3. Copy-paste each migration file
4. Execute in order
5. Verify tables created successfully

---

## Integration Checklist

### Dashboard Integration
- [ ] Add StreakFlameCompact to header
- [ ] Add StreakFreezeShop to sidebar
- [ ] Wrap quest complete buttons with QuestCompleteButton
- [ ] Add ReflectionPrompt after quest completion

### Onboarding Flow
- [ ] Replace landing page with value-first onboarding
- [ ] Add CharacterNaming step after signup
- [ ] Migrate localStorage quests to database

### Milestone System
- [ ] Check level on XP gain
- [ ] Show MilestoneCelebration at thresholds
- [ ] Track shown milestones to avoid repeats

### Sound Integration
- [ ] Add SoundProvider to root layout
- [ ] Play sounds on key interactions:
  - quest-complete on quest completion
  - level-up on level up
  - button-click on important buttons
  - streak-milestone on 7, 30, 100 days

### Settings Page
- [ ] Add SoundSettings component
- [ ] Add CharacterNamingCompact for name editing

---

## Performance Considerations

### Animations
- All Framer Motion animations use GPU acceleration
- Spring physics optimize for 60fps
- Confetti auto-stops after duration

### Audio
- Sounds preloaded on first interaction
- Audio pooling prevents memory leaks
- Lazy loading for non-critical sounds

### Database
- Indexes on frequently queried columns
- RLS policies for security
- Database functions for complex logic

---

## Testing Checklist

### Component Testing
- [ ] QuestCompleteButton triggers all effects
- [ ] StreakFlame animates smoothly
- [ ] StreakFreezeShop purchases work
- [ ] MilestoneCelebration can't close early
- [ ] Onboarding saves to localStorage
- [ ] CharacterNaming validates input
- [ ] ReflectionPrompt awards XP
- [ ] Sound effects play correctly

### Mobile Testing
- [ ] Haptic feedback works on mobile
- [ ] Touch gestures trigger animations
- [ ] Sound plays on mobile browsers
- [ ] Confetti performs well on mobile

### Edge Cases
- [ ] Audio blocked by browser autoplay
- [ ] localStorage full or disabled
- [ ] Network errors during API calls
- [ ] User closes modal mid-animation

---

## Future Enhancements

### Phase 8: Story Mode (Not Yet Implemented)
- Long-form journal entries (500-2000 chars)
- AI transforms into epic narratives
- Separate card design for story entries

### Phase 9: On This Day (Not Yet Implemented)
- Shows quests completed on this day in past years
- Timeline layout
- Memory sharing functionality

### Additional Features
- Party quests for collaboration
- API access for integrations
- Custom avatar designer
- Advanced analytics dashboard

---

## Support & Resources

### Documentation
- Framer Motion: https://www.framer.com/motion/
- Canvas Confetti: https://github.com/catdad/canvas-confetti
- Supabase: https://supabase.com/docs

### Sound Resources
- Freesound.org (Creative Commons)
- Zapsplat.com (Free tier)
- ElevenLabs Sound Effects (AI generation)

### Research References
- Duolingo's gamification patterns
- Day One's sound design principles
- Pokemon's attachment research (85% increase)

---

## Version History

**v1.0.0** - Initial gamification system implementation
- All 10 phases designed and documented
- Phases 1-7 and 10 fully implemented
- Phases 8-9 designed for future implementation

---

## Credits

Designed and implemented based on proven UX patterns from Duolingo, Day One, and Pokemon research. Built with Next.js 15, Framer Motion, and Supabase.
