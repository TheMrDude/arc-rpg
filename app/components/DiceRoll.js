'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { RARITY_COLORS } from '@/lib/encounterTable';
import { CAST } from '@/lib/cast';
import Overlay from './Overlay';
import { useOverlaySlot, OVERLAY_PRIORITY } from '@/lib/overlayQueue';

export default function DiceRoll({ encounter, onClaim, show }) {
  const [phase, setPhase] = useState('waiting'); // waiting -> spinning -> landed -> reveal
  const [displayNumber, setDisplayNumber] = useState('?');
  const spinIntervalRef = useRef(null);

  // Priority-3 reward. `onClaim` is routed through the queue's idempotent
  // claimReward at the call site, so all four of the shell's close paths (✕,
  // Escape, backdrop, the Claim button) pay out exactly once.
  const visible = useOverlaySlot('dice-roll', OVERLAY_PRIORITY.REWARD, Boolean(show && encounter));

  useEffect(() => {
    if (!visible || !encounter) return;
    // Reset to waiting state when the encounter reaches the screen.
    setPhase('waiting');
    setDisplayNumber('?');

    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    };
  }, [visible, encounter]);

  function handleRoll() {
    if (phase !== 'waiting' || !encounter) return;
    setPhase('spinning');

    // Rapid number cycling during spin
    spinIntervalRef.current = setInterval(() => {
      setDisplayNumber(Math.floor(Math.random() * 10) + 1);
    }, 80);

    // Stop spinning after 1.5s, show actual roll
    setTimeout(() => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
      setDisplayNumber(encounter.roll);
      setPhase('landed');

      // Show encounter card after 0.5s pause
      setTimeout(() => setPhase('reveal'), 500);
    }, 1500);
  }

  const rarity = encounter
    ? RARITY_COLORS[encounter.rarity] || RARITY_COLORS.common
    : RARITY_COLORS.common;
  const isLegendary = encounter?.rarity === 'legendary';

  // Reward description
  let rewardText = '';
  if (encounter) {
    switch (encounter.rewardType) {
      case 'gold': rewardText = `+${encounter.rewardValue} Gold`; break;
      case 'gold_loss': rewardText = `-${encounter.rewardValue} Gold`; break;
      case 'bonus_xp': rewardText = `+${encounter.rewardValue} bonus XP on next ${encounter.effectQuestsRemaining > 1 ? encounter.effectQuestsRemaining + ' quests' : 'quest'}`; break;
      case 'critical_hit': rewardText = `+${encounter.rewardValue} Gold + 2x XP on next quest`; break;
      case 'none': rewardText = 'No effect'; break;
      default: rewardText = '';
    }
  }

  // The shell owns the backdrop, the three close paths, the scroll lock and the
  // z-index. tone="dark" puts `.kidquest` back on the portal root, which is what
  // was missing before: `kq-card`'s background died outside that scope, leaving
  // the reveal card's text-navy/60 sitting on the raw black backdrop at ~1.2:1.
  return (
    <Overlay
      open={visible}
      onClose={onClaim}
      tone="dark"
      title="Random Encounter"
      hideTitle
      closeLabel="Claim reward"
    >
      {encounter && (
        <div className="flex flex-col items-center gap-6 py-2">
          {/* Header text — waiting phase */}
          {phase === 'waiting' && (
            <div className="text-center mb-2" style={{ animation: 'fadeIn 0.3s ease' }}>
              <h2 className="kq-display text-xl text-gold mb-2">
                ✨ Random Encounter!
              </h2>
              <p className="text-cream/70 text-sm">Something fun is waiting for you...</p>
            </div>
          )}

          {/* D10 Dice */}
          <div className="relative">
            <div
              onClick={handleRoll}
              className="dice-d10"
              style={{
                cursor: phase === 'waiting' ? 'pointer' : 'default',
                borderColor: (phase === 'landed' || phase === 'reveal') ? rarity.border : '#FFC83D',
                boxShadow: (phase === 'landed' || phase === 'reveal')
                  ? `0 0 ${isLegendary ? '50' : '40'}px ${rarity.glow}`
                  : '0 0 20px rgba(255, 200, 61, 0.35)',
                animation: phase === 'waiting' ? 'dicePulse 1.5s ease-in-out infinite' :
                           phase === 'spinning' ? 'diceRoll 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)' :
                           phase === 'landed' ? 'diceBounce 0.3s ease' :
                           isLegendary ? 'legendaryPulse 0.5s ease-in-out infinite alternate' : 'none',
              }}
            >
              <span
                className="kq-display text-[2.5rem]"
                style={{ color: (phase === 'landed' || phase === 'reveal') ? rarity.text : '#FFC83D' }}
              >
                {displayNumber}
              </span>
            </div>

            {/* Legendary particles */}
            {isLegendary && (phase === 'landed' || phase === 'reveal') && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-gold"
                    style={{
                      left: '50%',
                      top: '50%',
                      animation: `particle ${1 + Math.random()}s ease-out infinite`,
                      animationDelay: `${Math.random() * 0.5}s`,
                      transform: `rotate(${i * 30}deg) translateY(-60px)`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Tap to roll label — waiting phase */}
          {phase === 'waiting' && (
            <p
              className="text-gold text-sm font-bold"
              style={{ animation: 'dicePulse 1.5s ease-in-out infinite' }}
            >
              Tap to roll!
            </p>
          )}

          {/* Encounter name — landed phase */}
          {phase === 'landed' && (
            <p className="kq-display text-xl text-cream" style={{ animation: 'fadeIn 0.3s ease' }}>
              {encounter.icon} {encounter.name}
            </p>
          )}

          {/* Encounter Card — reveal phase */}
          {phase === 'reveal' && (
            <div
              className="kq-card p-6 max-w-[350px] w-full text-center"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: rarity.border,
                boxShadow: `0 0 30px ${rarity.glow}`,
                animation: 'slideUp 0.4s ease',
              }}
            >
              {/* The encounter's cast face when it has one (lib/encounterTable
                  castKey); emoji for the rest. Display only. */}
              {encounter.castKey && CAST[encounter.castKey] ? (
                <Image
                  src={CAST[encounter.castKey].src}
                  alt={CAST[encounter.castKey].alt}
                  width={300}
                  height={200}
                  loading="eager"
                  className="mx-auto mb-3 h-28 w-auto rounded-candy object-cover"
                />
              ) : (
                <div className="text-5xl mb-3">{encounter.icon}</div>
              )}
              <h3 className="kq-display text-xl mb-2" style={{ color: rarity.text }}>
                {encounter.name}
              </h3>
              <div className="w-16 h-0.5 mx-auto mb-3" style={{ backgroundColor: rarity.border }} />
              <p className="text-navy/60 italic mb-4 text-[0.95rem]">&ldquo;{encounter.description}&rdquo;</p>
              <p className="text-sm font-bold text-hero-blue mb-4">Reward: {rewardText}</p>
              <button
                onClick={onClaim}
                className="kq-btn kq-btn-gold px-8 py-3 text-base"
              >
                ✨ Claim Reward
              </button>
              <p className="text-xs mt-3 font-semibold" style={{ color: rarity.text }}>
                — {encounter.rarity} Encounter —
              </p>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .dice-d10 {
          width: 120px;
          height: 140px;
          background: linear-gradient(135deg, #243B5A, #4F7DF3);
          clip-path: polygon(50% 0%, 95% 35%, 80% 90%, 20% 90%, 5% 35%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .dice-d10:hover {
          transform: scale(1.05);
        }
        @keyframes dicePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes diceRoll {
          0% { transform: rotateX(0deg) rotateY(0deg) scale(0.5); opacity: 0; }
          20% { transform: rotateX(360deg) rotateY(180deg) scale(1.2); opacity: 1; }
          40% { transform: rotateX(720deg) rotateY(360deg) scale(1); }
          60% { transform: rotateX(1080deg) rotateY(540deg) scale(1.1); }
          80% { transform: rotateX(1300deg) rotateY(650deg) scale(1); }
          100% { transform: rotateX(1440deg) rotateY(720deg) scale(1); }
        }
        @keyframes diceBounce {
          0% { transform: scale(1.3); }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes legendaryPulse {
          from { box-shadow: 0 0 30px rgba(234, 179, 8, 0.5); }
          to { box-shadow: 0 0 60px rgba(234, 179, 8, 0.9); }
        }
        @keyframes particle {
          0% { opacity: 1; transform: translateY(-30px) scale(1); }
          100% { opacity: 0; transform: translateY(-80px) scale(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Overlay>
  );
}
