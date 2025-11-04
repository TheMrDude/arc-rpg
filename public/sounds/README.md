# HabitQuest Sound Effects

This directory contains all sound effects used throughout HabitQuest for enhanced user feedback and satisfaction.

## Required Sound Files

Add these sound files to complete the audio experience:

### 1. `quest-complete.mp3`
- **Duration**: 200ms
- **Type**: Satisfying chime/ping sound
- **Usage**: Plays when user completes a quest
- **Characteristics**:
  - Warm, positive tone
  - Clear attack, gentle decay
  - Not too high-pitched
  - Sample rate: 44.1kHz, 128kbps

**Where to find:**
- Freesound.org: Search "completion chime" or "success ping"
- Zapsplat.com: Browse UI > Success sounds
- Example: https://freesound.org/people/Leszek_Szary/sounds/146718/

### 2. `level-up.mp3`
- **Duration**: 800ms
- **Type**: Fanfare/celebration
- **Usage**: Plays on level up
- **Characteristics**:
  - Triumphant but not overwhelming
  - Multiple notes (ascending scale)
  - Retro arcade feel

**Where to find:**
- Search "level up fanfare" or "game achievement"
- Keywords: "arcade", "retro", "power up"

### 3. `quest-accept.mp3`
- **Duration**: 150ms
- **Type**: Positive acknowledgment ping
- **Usage**: When user accepts/creates a quest
- **Characteristics**:
  - Quick, affirmative
  - Mid-range tone
  - Slightly softer than quest-complete

### 4. `streak-milestone.mp3`
- **Duration**: 600ms
- **Type**: Celebration sound
- **Usage**: Major streak milestones (7, 30, 100 days)
- **Characteristics**:
  - Uplifting, proud feeling
  - Multiple tones/chords
  - Warm resonance

### 5. `button-click.mp3`
- **Duration**: 50ms
- **Type**: Soft tap/click
- **Usage**: General button interactions
- **Characteristics**:
  - Very subtle
  - Natural, organic sound
  - Not electronic beep

### 6. `error.mp3`
- **Duration**: 150ms
- **Type**: Gentle "oops" notification
- **Usage**: Form errors, invalid actions
- **Characteristics**:
  - **NOT** harsh or jarring
  - Descending tone (not buzzer)
  - Friendly, forgiving

### 7. `whoosh.mp3`
- **Duration**: 100ms
- **Type**: Quick transition sweep
- **Usage**: Page transitions, modal opens
- **Characteristics**:
  - Smooth air/wind sound
  - Quick attack and decay
  - Directional feel

## Sound Specifications

### Technical Requirements
- **Format**: MP3 (best compatibility)
- **Sample Rate**: 44.1kHz
- **Bitrate**: 128kbps (balance of quality and file size)
- **File Size**: < 50KB per file
- **Channels**: Mono or Stereo

### Design Guidelines
1. **Retro Arcade Feel**: Sounds should evoke warmth and nostalgia, not harsh 8-bit beeps
2. **Organic Tones**: Prefer warm, musical sounds over synthetic bleeps
3. **Office-Friendly**: Subtle enough to not disturb others
4. **Non-Startling**: Gentle volume levels, no harsh attacks

## Recommended Sound Sources

### Free Resources
1. **Freesound.org** (Creative Commons)
   - High-quality community sounds
   - Use filters: duration, license type
   - Attribution may be required

2. **Zapsplat.com** (Free tier)
   - Professional sound library
   - Free downloads with attribution
   - Well-organized categories

3. **OpenGameArt.org**
   - Game-specific sounds
   - Various licenses (check each)

### AI Generation
**ElevenLabs Sound Effects** (elevenlabs.io/sound-effects)
- Generate custom sounds from text prompts
- Example prompt: "warm, satisfying quest completion chime with gentle resonance"
- Fine-tune duration and characteristics

### Premium Options (Optional)
- **Soundsnap.com**: Professional sound effects library
- **AudioJungle.net**: Affordable individual sound purchases
- **Epidemic Sound**: Subscription service

## Implementation Notes

### Browser Compatibility
The sound system uses HTML5 Audio API, which is supported in:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (with user interaction requirement)

### Autoplay Restrictions
Modern browsers block autoplay until user interaction. The SoundManager handles this by:
1. Preloading sounds on app initialization
2. Playing sounds only after user clicks/taps
3. Graceful fallback if audio is blocked

### Volume Levels
Default volumes are set in the SoundManager:
- Background ambience: 0.3 (30%)
- UI feedback: 0.5 (50%)
- Celebrations: 0.7 (70%)

Users can adjust these in Settings.

## Testing Checklist

After adding sound files, test:
- [ ] Sounds play on button click
- [ ] Volume is appropriate (not too loud)
- [ ] No audio clipping or distortion
- [ ] Mobile device playback works
- [ ] Sounds don't overlap awkwardly
- [ ] Settings toggle mutes/unmutes correctly

## Attribution Template

If using Creative Commons sounds, add attribution to your about/credits page:

```
Sound Effects:
- "Quest Complete" by [Author Name] (freesound.org) - CC BY 3.0
- "Level Up Fanfare" by [Author Name] (zapsplat.com) - Standard License
```

## Future Enhancements

Consider adding:
- Ambient background music (toggleable)
- Archetype-specific sound themes
- Seasonal sound variations
- Spatial audio for 3D effects
- Dynamic volume based on time of day
