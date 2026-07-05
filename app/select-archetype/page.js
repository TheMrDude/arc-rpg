'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Seeker first: it's the pre-selected default, so it should be the first card seen
const ARCHETYPES = [
  {
    id: 'seeker',
    name: 'Seeker',
    image: '/images/archetypes/seeker.png',
    description: 'Curious explorer. Your quests become adventures into the unknown.',
  },
  {
    id: 'warrior',
    name: 'Warrior',
    image: '/images/archetypes/warrior.png',
    description: 'Bold and direct. Your quests become battles to win.',
  },
  {
    id: 'builder',
    name: 'Builder',
    image: '/images/archetypes/builder.png',
    description: 'Steady creator. Your quests become projects that stack up.',
  },
  {
    id: 'shadow',
    name: 'Shadow',
    image: '/images/archetypes/shadow.png',
    description: 'Sharp strategist. Your quests become precision missions.',
  },
  {
    id: 'sage',
    name: 'Sage',
    image: '/images/archetypes/sage.png',
    description: 'Wise and calm. Your quests become lessons on the path.',
  },
];

export default function SelectArchetypePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Seeker pre-selected: the page should never block on an unmade choice
  const [selectedArchetype, setSelectedArchetype] = useState('seeker');

  // "Choose for me" dice roll states
  const [showDice, setShowDice] = useState(false);
  const [dicePhase, setDicePhase] = useState('spinning'); // spinning -> landed
  const [diceNumber, setDiceNumber] = useState('?');
  const [rolledArchetype, setRolledArchetype] = useState(null);
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

      // Check if user already has an archetype
      const { data: profile } = await supabase
        .from('profiles')
        .select('archetype')
        .eq('id', user.id)
        .single();

      if (profile?.archetype) {
        // Already has archetype, go to dashboard
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
    setRolledArchetype(null);

    // Rapid number cycling during spin (same feel as the D10 encounter dice)
    spinIntervalRef.current = setInterval(() => {
      setDiceNumber(Math.floor(Math.random() * 10) + 1);
    }, 80);

    setTimeout(() => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
      const roll = Math.floor(Math.random() * 10) + 1;
      const archetype = ARCHETYPES[(roll - 1) % ARCHETYPES.length];
      setDiceNumber(roll);
      setRolledArchetype(archetype);
      setSelectedArchetype(archetype.id);
      setDicePhase('landed');
    }, 1500);
  }

  async function handleSelectArchetype(archetypeId) {
    const archetype = archetypeId || selectedArchetype;
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

      router.push('/dashboard');
    } catch (error) {
      console.error('Error selecting archetype:', error);
      alert(`Failed to select archetype: ${error.message}\n\nPlease try again or contact support.`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] flex items-center justify-center">
        <div className="text-white text-xl font-black uppercase tracking-wide">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-black mb-3 uppercase tracking-wide text-[#FF6B6B]">Choose Your Archetype</h1>
          <p className="text-lg text-[#E2E8F0] mb-4">
            Your archetype shapes how the AI narrates your quests. Style only — no stats, no wrong answers.
          </p>
          <div className="inline-block bg-[#FFD93D]/10 border-2 border-[#FFD93D] rounded-lg px-5 py-3">
            <p className="text-[#FFD93D] font-bold text-sm sm:text-base">
              ✨ Not sure? Start as Seeker. You can change your archetype anytime in settings.
            </p>
          </div>
        </div>

        {/* Choose for me */}
        <div className="text-center mb-8">
          <button
            onClick={chooseForMe}
            className="px-6 py-3 bg-[#0F3460] hover:bg-[#1a4a7a] text-[#22d3ee] border-2 border-[#22d3ee]/50 rounded-lg font-black uppercase text-sm tracking-wide transition-all hover:scale-105"
          >
            🎲 Choose for me
          </button>
        </div>

        {/* Archetype Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {ARCHETYPES.map((archetype) => (
            <div
              key={archetype.id}
              onClick={() => setSelectedArchetype(archetype.id)}
              className={`rounded-lg p-5 cursor-pointer transition-all ${
                selectedArchetype === archetype.id
                  ? 'border-3 border-[#FFD93D] bg-[#1A1A2E] shadow-[0_0_30px_rgba(255,217,61,0.5)] scale-105'
                  : 'border-3 border-[#0F3460] bg-[#1A1A2E] hover:border-[#00D4FF] hover:scale-102'
              }`}
            >
              <div className="flex justify-center mb-3">
                <img
                  src={archetype.image}
                  alt={archetype.name}
                  className="w-24 h-24 object-contain rounded-lg"
                />
              </div>

              <h3 className="text-xl font-black text-center mb-2 uppercase tracking-wide text-[#FF6B6B]">
                {archetype.name}
                {archetype.id === 'seeker' && (
                  <span className="block text-[10px] text-[#FFD93D] tracking-widest mt-1">Recommended start</span>
                )}
              </h3>

              <p className="text-[#E2E8F0] text-sm text-center">{archetype.description}</p>

              {selectedArchetype === archetype.id && (
                <div className="mt-3 text-center">
                  <span className="text-[#FFD93D] font-black uppercase tracking-wide text-sm">✓ Selected</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Confirm Button */}
        <div className="text-center pb-8">
          <button
            onClick={() => handleSelectArchetype()}
            disabled={saving}
            className="px-12 py-4 rounded-lg font-black text-xl uppercase tracking-wide transition-all duration-100 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-3 border-[#0F3460] shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 disabled:opacity-60"
          >
            {saving ? 'Beginning...' : '⚔️ Begin Your Campaign'}
          </button>
          <p className="text-xs text-[#94a3b8] mt-3">
            Starting as {ARCHETYPES.find((a) => a.id === selectedArchetype)?.name}
          </p>
        </div>
      </div>

      {/* Choose-for-me dice roll overlay */}
      {showDice && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85">
          <div className="flex flex-col items-center gap-6 p-8">
            <h2 className="text-xl font-black uppercase tracking-wide text-[#22d3ee]">
              🎲 The dice decide your fate...
            </h2>

            <div
              className="archetype-d10"
              style={{
                animation: dicePhase === 'spinning'
                  ? 'archetypeDiceRoll 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                  : 'archetypeDiceBounce 0.3s ease',
              }}
            >
              <span className="text-[2.5rem] font-black text-[#22d3ee]">{diceNumber}</span>
            </div>

            {dicePhase === 'landed' && rolledArchetype && (
              <div className="bg-[#1e293b] border-2 border-[#FFD93D] rounded-xl p-6 max-w-[350px] w-[90vw] text-center shadow-[0_0_30px_rgba(255,217,61,0.4)]" style={{ animation: 'archetypeSlideUp 0.4s ease' }}>
                <img
                  src={rolledArchetype.image}
                  alt={rolledArchetype.name}
                  className="w-20 h-20 object-contain rounded-lg mx-auto mb-3"
                />
                <h3 className="text-xl font-black uppercase tracking-wide text-[#FFD93D] mb-2">
                  {rolledArchetype.name}!
                </h3>
                <p className="text-[#94a3b8] text-sm mb-5">{rolledArchetype.description}</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleSelectArchetype(rolledArchetype.id)}
                    disabled={saving}
                    className="px-8 py-3 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white rounded-lg font-black uppercase transition-all hover:scale-105 disabled:opacity-60"
                  >
                    {saving ? 'Beginning...' : '⚔️ Begin Your Campaign'}
                  </button>
                  <button
                    onClick={() => setShowDice(false)}
                    className="text-[#94a3b8] hover:text-white text-sm font-bold transition-colors"
                  >
                    Roll rejected — I&apos;ll pick myself
                  </button>
                </div>
              </div>
            )}
          </div>

          <style jsx>{`
            .archetype-d10 {
              width: 120px;
              height: 140px;
              background: linear-gradient(135deg, #1e293b, #334155);
              clip-path: polygon(50% 0%, 95% 35%, 80% 90%, 20% 90%, 5% 35%);
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid #22d3ee;
              box-shadow: 0 0 20px rgba(34, 211, 238, 0.3);
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
