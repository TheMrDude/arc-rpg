# Premium Features Integration Guide

## Components Built

All premium components are located in `/app/components/`:

1. **PremiumWelcome.js** - Onboarding modal shown once after upgrade
2. **RecurringQuests.js** - Recurring quest management (daily/weekly/custom)
3. **ArchetypeSwitcher.js** - Archetype switching with 7-day cooldown
4. **TemplateLibrary.js** - Quest template browser and cloner
5. **EquipmentShop.js** - Equipment catalog with purchase/equip system

## Database Setup

Run these migrations in order:
```bash
1. /supabase/migrations/add_premium_features.sql
2. /supabase/migrations/seed_premium_content.sql
```

## Dashboard Integration

To integrate into `/app/dashboard/page.js`:

### 1. Import Premium Components

```javascript
import PremiumWelcome from '@/app/components/PremiumWelcome';
import RecurringQuests from '@/app/components/RecurringQuests';
import ArchetypeSwitcher from '@/app/components/ArchetypeSwitcher';
import TemplateLibrary from '@/app/components/TemplateLibrary';
import EquipmentShop from '@/app/components/EquipmentShop';
```

### 2. Add Premium State

```javascript
const [showPremiumWelcome, setShowPremiumWelcome] = useState(false);
const [activeTab, setActiveTab] = useState('quests'); // quests, recurring, templates, equipment

// Check premium welcome on load
useEffect(() => {
  if (profile?.is_premium && !profile?.shown_premium_welcome) {
    setShowPremiumWelcome(true);
  }
}, [profile]);
```

### 3. Premium Welcome Handler

```javascript
const handlePremiumWelcomeClose = async () => {
  setShowPremiumWelcome(false);

  // Mark as shown
  if (user) {
    await supabase
      .from('profiles')
      .update({ shown_premium_welcome: true })
      .eq('id', user.id);
  }
};
```

### 4. Add Tab Navigation (for premium users)

```javascript
{profile?.is_premium && (
  <div className="flex gap-2 mb-6">
    <button
      onClick={() => setActiveTab('quests')}
      className={/* active/inactive styles */}
    >
      📋 Quests
    </button>
    <button
      onClick={() => setActiveTab('recurring')}
      className={/* active/inactive styles */}
    >
      🔄 Recurring
    </button>
    <button
      onClick={() => setActiveTab('templates')}
      className={/* active/inactive styles */}
    >
      📚 Templates
    </button>
    <button
      onClick={() => setActiveTab('equipment')}
      className={/* active/inactive styles */}
    >
      ⚔️ Equipment
    </button>
  </div>
)}
```

### 5. Conditional Tab Content

```javascript
{activeTab === 'quests' && (
  // Existing quest UI
)}

{activeTab === 'recurring' && profile?.is_premium && (
  <RecurringQuests
    isPremium={profile.is_premium}
    archetype={profile.archetype}
  />
)}

{activeTab === 'templates' && profile?.is_premium && (
  <TemplateLibrary
    isPremium={profile.is_premium}
    archetype={profile.archetype}
    onQuestsAdded={loadUserData}
  />
)}

{activeTab === 'equipment' && profile?.is_premium && (
  <EquipmentShop
    isPremium={profile.is_premium}
    gold={profile.gold || 0}
    onGoldChange={(newGold) => {
      setProfile({ ...profile, gold: newGold });
    }}
  />
)}
```

### 6. Add Premium Badge to Header

```javascript
{profile?.is_premium && (
  <span className="px-4 py-2 bg-[#FFD93D] text-[#1A1A2E] border-3 border-[#0F3460] rounded-lg font-black text-sm uppercase shadow-[0_3px_0_#0F3460]">
    ⚡ FOUNDER
  </span>
)}
```

### 7. Add Archetype Switcher to Header

```javascript
{profile?.is_premium && (
  <ArchetypeSwitcher
    currentArchetype={profile.archetype}
    isPremium={profile.is_premium}
    onSwitch={loadUserData}
  />
)}
```

### 8. Free Tier Quest Limit

For free users, show quest counter:

```javascript
{!profile?.is_premium && (
  <div className="mb-4 p-4 bg-[#FFD93D] bg-opacity-20 border-2 border-[#FFD93D] rounded-lg">
    <p className="text-white font-bold text-center">
      📊 {profile.quest_count_this_month || 0}/10 quests this month
    </p>
    <p className="text-xs text-center mt-1 text-gray-300">
      Upgrade to Founder for unlimited quests
    </p>
  </div>
)}
```

### 9. Premium Welcome Modal

```javascript
<PremiumWelcome
  show={showPremiumWelcome}
  onClose={handlePremiumWelcomeClose}
/>
```

## API Routes Created

All API routes are in `/app/api/`:

- `recurring-quests/create` - Create recurring quest
- `recurring-quests/list` - List user's recurring quests
- `recurring-quests/update` - Toggle active/paused
- `recurring-quests/delete` - Delete recurring quest
- `archetype/can-switch` - Check if user can switch archetype
- `archetype/switch` - Switch user's archetype
- `templates/list` - List quest templates

## Premium Features Summary

### Free Tier
- 10 quests per month (tracked in `profiles.quest_count_this_month`)
- Basic quest transformations
- Journal entries (already implemented)
- Quest history (30 days)

### Premium/Founder Tier
- ⚡ Unlimited quests
- 🔄 Recurring quests (daily/weekly/custom)
- 🎭 Archetype switching (7-day cooldown)
- 📚 Access to 15+ quest templates
- ⚔️ Equipment shop (20+ items)
- 📖 Full quest history
- 🎯 Priority support

## Testing Checklist

1. [ ] Run database migrations
2. [ ] Set user's `is_premium = true` in Supabase dashboard
3. [ ] Test premium welcome modal appears
4. [ ] Test tab navigation works
5. [ ] Create recurring quest
6. [ ] Switch archetype (wait 7 days to test cooldown)
7. [ ] Use quest template
8. [ ] Purchase equipment item
9. [ ] Equip/unequip equipment
10. [ ] Verify free tier sees upgrade prompts

## Next Steps

1. Integrate components into dashboard as documented above
2. Test all premium flows
3. Add upgrade prompt modals for free users clicking premium features
4. Implement recurring quest auto-generation cron job
5. Add equipment bonuses to XP calculations in quest completion
6. Create admin panel for managing templates and equipment
