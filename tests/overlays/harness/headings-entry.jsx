import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SoundProvider } from '@/app/components/SoundProvider';
import QuestCompletionCelebration from '@/app/components/QuestCompletionCelebration';
import ReflectionPrompt from '@/app/components/ReflectionPrompt';
import DiceRoll from '@/app/components/DiceRoll';
import CompanionNamingPrompt from '@/app/components/CompanionNamingPrompt';
import { resetQueue } from '@/lib/overlayQueue';

const ENCOUNTER = {
  roll: 7, rarity: 'common', rewardType: 'gold', rewardValue: 30,
  icon: '🪙', name: 'Lucky Find', description: 'A coin on the road.',
};

// Renders one migrated overlay at a time, driven by window.__show(name). The
// dialog names itself from its own visible heading (Overlay `labelledBy`), so the
// shell no longer renders a hidden duplicate of that heading -- the bug this
// spec pins: two matches for the same text, read twice by a screen reader.
function App() {
  const [which, setWhich] = useState(null);
  window.__show = (name) => { resetQueue(); setWhich(name); };
  return (
    <SoundProvider>
      <div style={{ minHeight: '100vh', padding: 24 }}>
        <input placeholder="Enter your task..." />
      </div>
      <QuestCompletionCelebration
        show={which === 'qcc'} onClose={() => {}}
        rewards={{ xp: 30, gold: 30, level_up: false }} questTitle="Quest"
      />
      <ReflectionPrompt
        show={which === 'reflection'} onClose={() => {}}
        questId="q" questTitle="Quest" onSubmit={async () => {}}
      />
      <DiceRoll
        show={which === 'dice'} encounter={which === 'dice' ? ENCOUNTER : null}
        onClaim={() => {}}
      />
      <CompanionNamingPrompt
        show={which === 'companion'} emoji="🐣" speciesName="Emberwing"
        species="Fire Sprite" lore="Warm ember." mode="hatch" reducedMotion
        onSave={async () => {}} onSkip={() => {}}
      />
    </SoundProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
