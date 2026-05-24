# Campaign Feature — Pre-Deploy Test Checklist

## Environment Variables (check in Vercel dashboard)
- [ ] ANTHROPIC_API_KEY is set
- [ ] NEXT_PUBLIC_SUPABASE_URL is set  
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY is set
- [ ] SUPABASE_SERVICE_ROLE_KEY is set

## Test Flow (do this after deploying)
- [ ] Visit /campaign/setup — page loads, two cards appear (DM / Player)
- [ ] Create a campaign as DM — get an invite code
- [ ] Copy invite link and open in incognito — join as a player with a character name
- [ ] Complete one quest on the player account
- [ ] Return to DM dashboard — player appears in party roster with green tick
- [ ] Click "Generate Session Intro" — AI narration appears referencing the quest
- [ ] Add one NPC via the NPC library form — it appears in the grid
- [ ] Check existing /dashboard — campaign nav button appears (⚔ My Campaign or 🎲 Join Campaign)
- [ ] Verify existing quest creation and completion still works normally

## Known Placeholder
- NPC library shows colored circles (1-47) until real chibi PNGs are added to /public/images/chibi/
