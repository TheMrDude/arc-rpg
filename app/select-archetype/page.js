'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { COMPANION_SPECIES } from '@/lib/companions';

/**
 * The egg picker.
 *
 * This used to be "Choose Your Archetype": five human hero portraits and five
 * personality descriptions, asking a child to declare who she is before she had
 * seen anything. Two problems with that. The art is five male-presenting
 * figures, so a large part of the audience picks someone who is not them. And it
 * framed the first decision as an identity claim, which is a lot to ask of a
 * nine-year-old who just wants to start.
 *
 * So she picks an egg instead. Same five values, same column, same behaviour
 * downstream -- profiles.archetype is untouched and still drives every AI
 * narration voice. Only the presentation changed: she is choosing a friend, not
 * declaring an identity.
 *
 * The egg name and the hint both come from COMPANION_SPECIES so this page and
 * the companion card can never disagree about what is in the egg. Only the
 * colours live here, because they are presentation and nothing else reads them.
 *
 * Deliberately NOT shown: the species name. "A Curious Egg" that hints at
 * something doubling back on its own trail is a choice; "Foxfire" is a spoiler.
 * The hatch at three quests is the payoff and it needs something left to reveal.
 */

// Each egg is drawn in CSS -- shell gradient, highlight, and speckles. Five
// identical egg emoji would have made this a text-only choice, which is worse
// than the page it replaces.
const EGGS = [
  {
    id: 'seeker',
    accent: '#2E9CC4',
    shell: ['#7FE3F7', '#2E9CC4'],
    speckle: 'rgba(255, 243, 196, 0.85)',
    recommended: true,
  },
  {
    id: 'warrior',
    accent: '#D9553A',
    shell: ['#FFC98A', '#E2603F'],
    speckle: 'rgba(255, 240, 214, 0.85)',
  },
  {
    id: 'builder',
    accent: '#8A7A62',
    shell: ['#E4D9C5', '#9C8B72'],
    speckle: 'rgba(94, 79, 61, 0.45)',
  },
  {
    id: 'shadow',
    accent: '#5B47A6',
    shell: ['#A78BFF', '#4B3A8F'],
    speckle: 'rgba(226, 216, 255, 0.9)',
  },
  {
    id: 'sage',
    accent: '#5E82A8',
    shell: ['#D6E6F2', '#6E93B8'],
    speckle: 'rgba(255, 255, 255, 0.9)',
  },
].map((egg) => {
  const def = COMPANION_SPECIES[egg.id];
  return { ...egg, name: def.stages[0].name, hint: def.lore };
});

/** One egg, drawn in CSS. An ovoid: narrower at the top, rounder at the base. */
function Egg({ shell, speckle, size = 96 }) {
  return (
    <div
      style={{
        width: size,
        height: size * 1.26,
        borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
        backgroundImage: [
          // Highlight first: in backgroundImage the earliest layer paints on top.
          'radial-gradient(ellipse at 34% 24%, rgba(255,255,255,0.55) 0 16%, transparent 48%)',
          `radial-gradient(circle at 30% 62%, ${speckle} 0 3.5%, transparent 4%)`,
          `radial-gradient(circle at 62% 45%, ${speckle} 0 2.5%, transparent 3%)`,
          `radial-gradient(circle at 48% 79%, ${speckle} 0 3%, transparent 3.5%)`,
          `radial-gradient(circle at 72% 68%, ${speckle} 0 2%, transparent 2.5%)`,
          `radial-gradient(circle at 38% 37%, ${speckle} 0 2%, transparent 2.5%)`,
          `linear-gradient(160deg, ${shell[0]}, ${shell[1]})`,
        ].join(', '),
        boxShadow: 'inset -6px -10px 18px rgba(0,0,0,0.18), 0 4px 12px rgba(36,59,90,0.16)',
      }}
      aria-hidden="true"
    />
  );
}

export default function SelectArchetypePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Seeker pre-selected: the page should never block on an unmade choice
  const [selectedEgg, setSelectedEgg] = useState('seeker');

  // "Surprise me" dice roll states
  const [showDice, setShowDice] = useState(false);
  const [dicePhase, setDicePhase] = useState('spinning'); // spinning -> landed
  const [diceNumber, setDiceNumber] = useState('?');
  const [rolledEgg, setRolledEgg] = useState(null);
  const spinIntervalRef = useRef(null);

  useEffect(() => {
    checkUser();
    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    };
  }, []);

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Check if user has already chosen
      const { data: profile } = await supabase
        .from('profiles')
        .select('archetype')
        .eq('id', user.id)
        .single();

      if (profile?.archetype) {
        // Already chosen, go to dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  }

  function chooseForMe() {
    if (showDice) return;
    setShowDice(true);
    setDicePhase('spinning');
    setDiceNumber('?');
    setRolledEgg(null);

    // Rapid number cycling during spin (same feel as the D10 encounter dice)
    spinIntervalRef.current = setInterval(() => {
      setDiceNumber(Math.floor(Math.random() * 10) + 1);
    }, 80);

    setTimeout(() => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
      const roll = Math.floor(Math.random() * 10) + 1;
      const egg = EGGS[(roll - 1) % EGGS.length];
      setDiceNumber(roll);
      setRolledEgg(egg);
      setSelectedEgg(egg.id);
      setDicePhase('landed');
    }, 1500);
  }

  async function handleChooseEgg(eggId) {
    // The egg IS the archetype. Presentation changed; the stored value did not.
    const archetype = eggId || selectedEgg;
    if (!archetype || saving) return;

    setSaving(true);
    try {
      // Use UPSERT to handle both insert and update cases
      // This works even if profile row doesn't exist yet
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            // email is NOT NULL on profiles; the ON CONFLICT insert tuple is
            // checked before conflict resolution, so it must always be sent
            email: user.email,
            archetype
          },
          {
            onConflict: 'id',
            ignoreDuplicates: false
          }
        );

      if (error) {
        // If table doesn't exist, redirect to setup page
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.log('Tables not found, redirecting to setup...');
          alert('Database setup required. You will be redirected to the setup page.');
          router.push('/setup');
          return;
        }

        throw error;
      }

      // Straight to the dashboard. Naming deliberately does NOT happen here:
      // naming a creature you have not met yet is hollow, and the unhatched egg
      // is a better first goal than a placeholder to label. The prompt fires at
      // the hatch instead.
      router.push('/dashboard');
    } catch (error) {
      console.error('Error choosing egg:', error);
      alert(`Failed to choose your egg: ${error.message}\n\nPlease try again or contact support.`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="kidquest min-h-screen bg-cream flex items-center justify-center">
        <div className="text-navy text-xl font-bold">Loading...</div>
      </div>
    );
  }

  const selected = EGGS.find((e) => e.id === selectedEgg);

  return (
    <div className="kidquest min-h-screen bg-cream text-navy p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="kq-display text-4xl sm:text-5xl mb-3 text-coral">Choose Your Egg</h1>
          <p className="text-lg text-navy/70 mb-4">
            Something is growing inside each one. Pick the egg you like best.
          </p>
          <div className="inline-block bg-gold/10 border-2 border-gold rounded-candy px-5 py-3">
            <p className="text-navy font-bold text-sm sm:text-base">
              🥚 Complete 3 quests and your egg will hatch.
            </p>
          </div>
        </div>

        {/* Surprise me */}
        <div className="text-center mb-8">
          <button
            onClick={chooseForMe}
            className="kq-btn kq-btn-ghost"
          >
            🎲 Surprise me
          </button>
        </div>

        {/* Egg Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {EGGS.map((egg) => {
            const isSelected = selectedEgg === egg.id;
            return (
              <button
                key={egg.id}
                type="button"
                onClick={() => setSelectedEgg(egg.id)}
                aria-pressed={isSelected}
                style={{
                  borderColor: isSelected ? egg.accent : undefined,
                  minHeight: 44,
                  touchAction: 'manipulation',
                }}
                className={`kq-card kq-card-hover rounded-candy p-5 cursor-pointer transition-all text-center w-full ${
                  isSelected
                    ? 'border-2 scale-105'
                    : 'border-2 border-stone hover:border-hero-blue'
                }`}
              >
                <div className="flex justify-center mb-3">
                  <Egg shell={egg.shell} speckle={egg.speckle} />
                </div>

                <h3 className="text-xl font-bold mb-2" style={{ color: egg.accent }}>
                  {egg.name}
                  {egg.recommended && (
                    <span className="block text-[10px] text-gold tracking-widest mt-1">Recommended start</span>
                  )}
                </h3>

                {/* A hint at what is inside, never the species name. */}
                <p className="text-navy/70 text-sm">{egg.hint}</p>

                {isSelected && (
                  <div className="mt-3">
                    <span className="font-bold text-sm" style={{ color: egg.accent }}>✓ Chosen</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Confirm Button */}
        <div className="text-center pb-8">
          <button
            onClick={() => handleChooseEgg()}
            disabled={saving}
            className="kq-btn kq-btn-gold text-xl px-12 py-4 disabled:opacity-60"
          >
            {saving ? 'Taking it...' : '🥚 Take this egg'}
          </button>
          <p className="text-xs text-navy/50 mt-3">
            Taking {selected?.name}
          </p>
        </div>
      </div>

      {/* Surprise-me dice roll overlay */}
      {showDice && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-6 p-8">
            <h2 className="text-xl font-bold text-cream">
              🎲 The dice pick your egg...
            </h2>

            <div
              className="archetype-d10"
              style={{
                animation: dicePhase === 'spinning'
                  ? 'archetypeDiceRoll 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                  : 'archetypeDiceBounce 0.3s ease',
              }}
            >
              <span className="text-[2.5rem] font-bold text-white">{diceNumber}</span>
            </div>

            {dicePhase === 'landed' && rolledEgg && (
              <div className="kq-card border-2 border-gold rounded-candy p-6 max-w-[350px] w-[90vw] text-center" style={{ animation: 'archetypeSlideUp 0.4s ease' }}>
                <div className="flex justify-center mb-3">
                  <Egg shell={rolledEgg.shell} speckle={rolledEgg.speckle} size={72} />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: rolledEgg.accent }}>
                  {rolledEgg.name}!
                </h3>
                <p className="text-navy/60 text-sm mb-5">{rolledEgg.hint}</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleChooseEgg(rolledEgg.id)}
                    disabled={saving}
                    className="kq-btn kq-btn-gold disabled:opacity-60"
                  >
                    {saving ? 'Taking it...' : '🥚 Take this egg'}
                  </button>
                  <button
                    onClick={() => setShowDice(false)}
                    className="text-navy/50 hover:text-navy text-sm font-bold transition-colors"
                  >
                    I&apos;ll pick myself
                  </button>
                </div>
              </div>
            )}
          </div>

          <style jsx>{`
            .archetype-d10 {
              width: 120px;
              height: 140px;
              background: linear-gradient(135deg, #4F7DF3, #57D7F5);
              clip-path: polygon(50% 0%, 95% 35%, 80% 90%, 20% 90%, 5% 35%);
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid #FFC83D;
              box-shadow: 0 4px 14px rgba(0,0,0,0.15);
            }
            @keyframes archetypeDiceRoll {
              0% { transform: rotateX(0deg) rotateY(0deg) scale(0.5); opacity: 0; }
              20% { transform: rotateX(360deg) rotateY(180deg) scale(1.2); opacity: 1; }
              40% { transform: rotateX(720deg) rotateY(360deg) scale(1); }
              60% { transform: rotateX(1080deg) rotateY(540deg) scale(1.1); }
              80% { transform: rotateX(1300deg) rotateY(650deg) scale(1); }
              100% { transform: rotateX(1440deg) rotateY(720deg) scale(1); }
            }
            @keyframes archetypeDiceBounce {
              0% { transform: scale(1.3); }
              50% { transform: scale(0.95); }
              100% { transform: scale(1); }
            }
            @keyframes archetypeSlideUp {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

    </div>
  );
}
