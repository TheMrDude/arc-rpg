'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { crossroadsMilestone, crossroadsEligible, pickScenario } from '@/lib/crossroads';

const TIER_LABELS = {
  crit: { text: 'NATURAL 20!', color: '#FFC83D' },
  great: { text: 'GREAT SUCCESS', color: '#2DBE7E' },
  success: { text: 'SUCCESS', color: '#4F7DF3' },
  complication: { text: 'A COMPLICATION...', color: '#FF7B6B' },
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
    <div className="kq-card p-5 mb-6">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <h3 className="text-lg font-bold text-purple">
          {icon} A Crossroads Appears
        </h3>
        <span className="kq-chip text-[11px] font-bold text-navy/60 bg-cream border border-stone">
          Quest {milestone}
        </span>
      </div>

      {phase === 'loading' ? (
        <div className="py-6 text-center">
          <motion.p
            className="text-sm text-purple font-bold"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            Your guide is drawing your road...
          </motion.p>
        </div>
      ) : (
        <>
          <p className="text-sm font-bold text-navy mb-1">{scenario.title}</p>
          <p className="text-sm text-navy/70 mb-4">{scenario.setup}</p>

          <AnimatePresence mode="wait">
            {phase === 'choose' && (
              <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex flex-col sm:flex-row gap-3">
                  {scenario.choices.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => choose(c.id)}
                      className={`flex-1 text-left px-4 py-3 rounded-candy border-2 font-bold text-sm transition-all hover:scale-[1.02] ${
                        c.style === 'bold'
                          ? 'border-coral text-coral bg-coral/10 hover:bg-coral/20'
                          : 'border-hero-blue text-hero-blue bg-hero-blue/10 hover:bg-hero-blue/20'
                      }`}
                    >
                      <span className="block text-[11px] opacity-80 mb-0.5">
                        {c.style === 'bold' ? '🎲 Bold (big swings)' : '🛡️ Careful (steady odds)'}
                      </span>
                      {c.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-navy/50 mt-2">
                  A d20 decides how it goes. Every path pays something. The story keeps whatever happens.
                </p>
                {error && <p className="text-xs text-coral mt-2 font-bold">{error}</p>}
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
                  className="w-16 h-16 rounded-2xl bg-cream border-2 border-purple flex items-center justify-center"
                >
                  <span className="text-2xl font-bold text-navy">{displayRoll}</span>
                </motion.div>
              </motion.div>
            )}

            {phase === 'done' && result && (
              <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-cream border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: tierInfo.color }}>
                    <span className="text-xl font-bold" style={{ color: tierInfo.color }}>{result.roll}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: tierInfo.color }}>
                      {tierInfo.text}
                    </p>
                    <p className="text-xs text-navy/50">d20 rolled {result.roll}</p>
                  </div>
                </div>
                <p className="text-sm text-navy/70 italic mb-3">{result.outcome}</p>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gold">💰 +{result.gold} gold</p>
                  <button
                    onClick={() => onResolved && onResolved()}
                    className="kq-btn kq-btn-emerald text-xs"
                  >
                    Continue the journey
                  </button>
                </div>
                <p className="text-[11px] text-navy/50 mt-2">
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
