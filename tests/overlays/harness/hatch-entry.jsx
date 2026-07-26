import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { SoundProvider } from '@/app/components/SoundProvider';
import QuestCompletionCelebration from '@/app/components/QuestCompletionCelebration';
import ReflectionPrompt from '@/app/components/ReflectionPrompt';
import MilestoneCelebration from '@/app/components/animations/MilestoneCelebration';
import DiceRoll from '@/app/components/DiceRoll';
import CompanionNamingPrompt from '@/app/components/CompanionNamingPrompt';
import { claimReward, resetQueue } from '@/lib/overlayQueue';

const ENCOUNTER = {
  roll: 7, rarity: 'common', rewardType: 'gold', rewardValue: 30,
  icon: '🪙', name: 'Lucky Find', description: 'A coin on the road.',
};
const CREATURE = { emoji: '🐣', speciesName: 'Emberwing', species: 'Fire Sprite', lore: 'Warm ember.' };

// Faithful mirror of app/dashboard/page.js's reward-chain -> hatch flow, so the
// real components run the real handlers (guarded claimReward, the 300ms
// scheduling, the companion-naming gate). window.__completeQuest(opts) simulates
// one completion; the spec drives three and then looks for the hatch dialog.
function App() {
  const [showCeleb, setShowCeleb] = useState(false);
  const [celebData, setCelebData] = useState(null);
  const [showReflection, setShowReflection] = useState(false);
  const [completedQuestData, setCompletedQuestData] = useState(null);
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneData, setMilestoneData] = useState(null);
  const [showDice, setShowDice] = useState(false);
  const [encounterData, setEncounterData] = useState(null);
  const [showCompanion, setShowCompanion] = useState(false);
  const [questsCompleted, setQuestsCompleted] = useState(0);
  const encounterRef = useRef(null);

  // Dashboard: the hatch fires when the profile reaches stage 1 (3 quests).
  useEffect(() => {
    if (questsCompleted >= 3) setShowCompanion(true);
  }, [questsCompleted]);

  // opts: { reflection, levelUp, encounter } -- force combos deterministically.
  window.__completeQuest = (opts = {}) => {
    if (questsCompleted === 0) resetQueue();
    setQuestsCompleted((n) => n + 1);
    setCelebData({ xp: 30, gold: 30, level_up: !!opts.levelUp, new_level: 2 });
    setCompletedQuestData(opts.reflection ? { questId: 'q', questTitle: 'Quest' } : null);
    setShowCeleb(true);
    if (opts.levelUp) setMilestoneData({ milestone: 2, type: 'level' });
    if (opts.encounter) { setEncounterData(ENCOUNTER); encounterRef.current = ENCOUNTER; }
    // record what this quest wants, so handleCelebrationClose reads the same intent
    window.__wantReflection = !!opts.reflection;
  };

  const handleCelebrationClose = () => {
    if (!claimReward('quest-celebration')) return;
    setShowCeleb(false);
    const showsReflection = window.__wantReflection;
    if (showsReflection) {
      setShowReflection(true);
    } else if (encounterRef.current) {
      setTimeout(() => setShowDice(true), 300);
    }
    if (milestoneData) setTimeout(() => setShowMilestone(true), 300);
  };

  const handleReflectionClose = () => {
    setShowReflection(false);
    if (encounterRef.current) setTimeout(() => setShowDice(true), 300);
  };

  const handleDiceClaim = () => {
    if (!claimReward('dice-roll')) return;
    setShowDice(false);
    setEncounterData(null);
    encounterRef.current = null;
  };

  const closeMilestone = () => {
    if (!claimReward('milestone-celebration')) return;
    setShowMilestone(false);
    setMilestoneData(null);
  };

  const companionShow =
    showCompanion && !!CREATURE &&
    !showCeleb && !showReflection && !showMilestone && !showDice;

  // Expose the gate state so the spec can name the stuck flag.
  window.__state = () => ({
    showCeleb, showReflection, showMilestone, showDice, showCompanion, companionShow,
    milestoneData: !!milestoneData, encounterData: !!encounterData, questsCompleted,
  });

  return (
    <SoundProvider>
      <div style={{ minHeight: '100vh', padding: 24 }}>
        <div id="xp-bar-target" style={{ position: 'fixed', top: 8, left: 8, width: 40, height: 8 }} />
        <label>Task <input placeholder="Enter your task..." /></label>
      </div>

      {showCeleb && celebData && (
        <QuestCompletionCelebration show={showCeleb} onClose={handleCelebrationClose} rewards={celebData} questTitle="Quest" />
      )}
      {showReflection && completedQuestData && (
        <ReflectionPrompt show={showReflection} onClose={handleReflectionClose} questId="q" questTitle="Quest" onSubmit={async () => {}} />
      )}
      {showMilestone && milestoneData && (
        <MilestoneCelebration show={showMilestone} onClose={closeMilestone} milestone={2} type="level" isPremium={false} />
      )}
      <DiceRoll show={showDice} encounter={encounterData} onClaim={handleDiceClaim} />

      <CompanionNamingPrompt
        show={companionShow}
        emoji={CREATURE.emoji}
        speciesName={CREATURE.speciesName}
        species={CREATURE.species}
        lore={CREATURE.lore}
        mode="hatch"
        reducedMotion
        onSave={async () => {}}
        onSkip={() => setShowCompanion(false)}
      />
    </SoundProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
