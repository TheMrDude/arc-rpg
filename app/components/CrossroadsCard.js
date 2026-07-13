'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { crossroadsMilestone, crossroadsEligible, pickScenario } from '@/lib/crossroads';

const TIER_LABELS = {
  crit: { text: 'NATURAL 20!', color: '#FFD93D' },
  great: { text: 'GREAT SUCCESS', color: '#6BCB77' },
  success: { text: 'SUCCESS', color: '#00D4FF' },
  complication: { text: 'A COMPLICATION...', color: '#c8a96e' },
};

/**
 * Crossroads card: appears every 5th completed quest. The scene is
 * written on demand by the game's AI Dungeon Master (personalised to the
 * player's archetype, recent quests, and story), then locked server-side
 * so the d20 resolution validates against it. The die animation here is
 * theater; the number is the server's word. If generation hiccups we fall
 * back to the deterministic hand-authored pool — and so does the server,
 * so the two always agree.
 */
export default function CrossroadsCard({ profile, userId, onResolved }) {
  const [phase, setPhase] = useState('loading'); // loading | choose | rolling | done
  const [scenario, setScenario] = useState(null);
  const [serverEligible, setServerEligible] = useState(true);
  const [source, setSource] = useState('ai');
  const [displayRoll, setDisplayRoll] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const rollTimer = useRef(null);
  const generatedFor = useRef(null);

  const clientEligible = !!(profile && crossroadsEligible(profile));
  const milestone = profile ? crossroadsMilestone(profile.quests_completed) : 0;

  useEffect(() => () => clearInterval(rollTimer.current), []);

  // Ask the DM to write (or return the cached) scene for this milestone.
  useEffect(() => {
    if (!clientEligible) return;
    if (generatedFor.current === milestone) return;
    generatedFor.current = milestone;
    setPhase('loading');

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/crossroads/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
        });
        const json = await res.json();
        if (res.ok && json.eligible && json.scenario) {
          setScenario(json.scenario);
          setSource(json.source || 'ai');
          setPhase('choose');
        } else if (res.ok && json.eligible === false) {
          setServerEligible(false);
        } else {
          // Unexpected shape — deterministic fallback (matches the server).
          setScenario(pickScenario(userId || profile.id, milestone));
          setSource('authored');
          setPhase('choose');
        }
      } catch (e) {
        // Network hiccup: the resolver also falls back to this exact
        // deterministic scenario, so client and server stay in agreement.
        setScenario(pickScenario(userId || profile.id, milestone));
        setSource('authored');
        setPhase('choose');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientEligible, milestone]);

  if (!clientEligible || !serverEligible) return null;

  const choose = async (choiceId) => {
    setPhase('rolling');
    setError(null);

    // Spin the die while the server decides
    rollTimer.current = setInterval(() => {
      setDisplayRoll(Math.floor(Math.random() * 20) + 1);
    }, 80);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/crossroads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ choice_id: choiceId }),
      });
      const json = await response.json();

      // Let the die spin a beat longer, then settle on the real roll
      setTimeout(() => {
        clearInterval(rollTimer.current);
        if (response.ok && json.success) {
          setDisplayRoll(json.roll);
          setResult(json);
          setPhase('done');
        } else {
          setError(json.message || 'The crossroads shimmered and faded. Try again in a moment.');
          setPhase('choose');
        }
      }, 900);
    } catch (err) {
      clearInterval(rollTimer.current);
      setError('The crossroads shimmered and faded. Try again in a moment.');
      setPhase('choose');
    }
  };

  const tierInfo = result ? TIER_LABELS[result.tier] : null;
  const icon = scenario?.icon || '🧭';

  return (
    <div className="bg-[#1A1A2E] border-3 border-[#a78bfa] rounded-lg p-5 mb-6 shadow-[0_0_20px_rgba(167,139,250,0.3)]">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <h3 className="text-lg font-black uppercase tracking-wide text-[#a78bfa]">
          {icon} A Crossroads Appears
        </h3>
        <span className="text-[10px] font-black uppercase tracking-wider text-[#94a3b8] bg-[#0F3460] border-2 border-[#1A1A2E] rounded-full px-2.5 py-1">
          Quest {milestone}
        </span>
      </div>

      {phase === 'loading' ? (
        <div className="py-6 text-center">
          <motion.p
            className="text-sm text-[#a78bfa] font-bold"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            The Dungeon Master is drawing your road...
          </motion.p>
        </div>
      ) : (
        <>
          <p className="text-sm font-bold text-white mb-1">{scenario.title}</p>
          <p className="text-sm text-[#E2E8F0] mb-4">{scenario.setup}</p>

          <AnimatePresence mode="wait">
            {phase === 'choose' && (
              <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex flex-col sm:flex-row gap-3">
                  {scenario.choices.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => choose(c.id)}
                      className={`flex-1 text-left px-4 py-3 rounded-lg border-2 font-bold text-sm transition-all hover:scale-[1.02] ${
                        c.style === 'bold'
                          ? 'border-[#FF6B6B] text-[#FF6B6B] bg-[#FF6B6B]/10 hover:bg-[#FF6B6B]/20'
                          : 'border-[#00D4FF] text-[#00D4FF] bg-[#00D4FF]/10 hover:bg-[#00D4FF]/20'
                      }`}
                    >
                      <span className="block text-[10px] uppercase tracking-widest opacity-80 mb-0.5">
                        {c.style === 'bold' ? '🎲 Bold (big swings)' : '🛡️ Careful (steady odds)'}
                      </span>
                      {c.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#94a3b8] mt-2">
                  A d20 decides how it goes. Every path pays something. The story keeps whatever happens.
                </p>
                {error && <p className="text-xs text-[#FF6B6B] mt-2 font-bold">{error}</p>}
              </motion.div>
            )}

            {phase === 'rolling' && (
              <motion.div
                key="rolling"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-6"
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 rounded-xl bg-[#0F3460] border-2 border-[#a78bfa] flex items-center justify-center"
                >
                  <span className="text-2xl font-black text-white">{displayRoll}</span>
                </motion.div>
              </motion.div>
            )}

            {phase === 'done' && result && (
              <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-xl bg-[#0F3460] border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: tierInfo.color }}>
                    <span className="text-xl font-black" style={{ color: tierInfo.color }}>{result.roll}</span>
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-wide" style={{ color: tierInfo.color }}>
                      {tierInfo.text}
                    </p>
                    <p className="text-xs text-[#94a3b8]">d20 rolled {result.roll}</p>
                  </div>
                </div>
                <p className="text-sm text-[#E2E8F0] italic mb-3">{result.outcome}</p>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-black text-[#FFD93D]">💰 +{result.gold} gold</p>
                  <button
                    onClick={() => onResolved && onResolved()}
                    className="px-4 py-2 rounded-lg bg-[#a78bfa] hover:bg-[#8b5cf6] text-white font-black text-xs uppercase tracking-wide transition-colors"
                  >
                    Continue the journey
                  </button>
                </div>
                <p className="text-[11px] text-[#94a3b8] mt-2">
                  This outcome is now part of your story. The next crossroads opens at quest {milestone + 5}.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
