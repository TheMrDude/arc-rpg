'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RARITY_COLORS } from '@/lib/encounterTable';

export default function DiceRoll({ encounter, onClaim, show }) {
  const [phase, setPhase] = useState('waiting'); // waiting -> spinning -> landed -> reveal
  const [displayNumber, setDisplayNumber] = useState('?');
  const spinIntervalRef = useRef(null);

  useEffect(() => {
    if (!show || !encounter) return;
    // Reset to waiting state when a new encounter appears
    setPhase('waiting');
    setDisplayNumber('?');

    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    };
  }, [show, encounter]);

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

  if (!show || !encounter) return null;

  const rarity = RARITY_COLORS[encounter.rarity] || RARITY_COLORS.common;
  const isLegendary = encounter.rarity === 'legendary';

  // Reward description
  let rewardText = '';
  switch (encounter.rewardType) {
    case 'gold': rewardText = `+${encounter.rewardValue} Gold`; break;
    case 'gold_loss': rewardText = `-${encounter.rewardValue} Gold`; break;
    case 'bonus_xp': rewardText = `+${encounter.rewardValue} bonus XP on next ${encounter.effectQuestsRemaining > 1 ? encounter.effectQuestsRemaining + ' quests' : 'quest'}`; break;
    case 'critical_hit': rewardText = `+${encounter.rewardValue} Gold + 2x XP on next quest`; break;
    case 'none': rewardText = 'No effect'; break;
    default: rewardText = '';
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85" style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="flex flex-col items-center gap-6 p-8">

        {/* Header text — waiting phase */}
        {phase === 'waiting' && (
          <div className="text-center mb-2" style={{ animation: 'fadeIn 0.3s ease' }}>
            <h2 className="text-xl font-black uppercase tracking-wide text-[#22d3ee] mb-2">
              ⚔️ Random Encounter!
            </h2>
            <p className="text-[#94a3b8] text-sm">Something stirs in the shadows...</p>
          </div>
        )}

        {/* D10 Dice */}
        <div className="relative">
          <div
            onClick={handleRoll}
            className="dice-d10"
            style={{
              cursor: phase === 'waiting' ? 'pointer' : 'default',
              borderColor: (phase === 'landed' || phase === 'reveal') ? rarity.border : '#22d3ee',
              boxShadow: (phase === 'landed' || phase === 'reveal')
                ? `0 0 ${isLegendary ? '50' : '40'}px ${rarity.glow}`
                : '0 0 20px rgba(34, 211, 238, 0.3)',
              animation: phase === 'waiting' ? 'dicePulse 1.5s ease-in-out infinite' :
                         phase === 'spinning' ? 'diceRoll 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)' :
                         phase === 'landed' ? 'diceBounce 0.3s ease' :
                         isLegendary ? 'legendaryPulse 0.5s ease-in-out infinite alternate' : 'none',
            }}
          >
            <span
              className="text-[2.5rem] font-black"
              style={{ color: (phase === 'landed' || phase === 'reveal') ? rarity.text : '#22d3ee' }}
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
                  className="absolute w-2 h-2 rounded-full bg-yellow-400"
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
            className="text-[#22d3ee] text-sm font-black uppercase tracking-[3px]"
            style={{ animation: 'dicePulse 1.5s ease-in-out infinite' }}
          >
            TAP TO ROLL
          </p>
        )}

        {/* Encounter name — landed phase */}
        {phase === 'landed' && (
          <p className="text-xl font-black uppercase tracking-wide text-white" style={{ animation: 'fadeIn 0.3s ease' }}>
            {encounter.icon} {encounter.name}
          </p>
        )}

        {/* Encounter Card — reveal phase */}
        {phase === 'reveal' && (
          <div
            className="bg-[#1e293b] rounded-xl p-6 max-w-[350px] w-[90vw] text-center"
            style={{
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: rarity.border,
              boxShadow: `0 0 30px ${rarity.glow}`,
              animation: 'slideUp 0.4s ease',
            }}
          >
            <div className="text-5xl mb-3">{encounter.icon}</div>
            <h3 className="text-xl font-black uppercase tracking-wide mb-2" style={{ color: rarity.text }}>
              {encounter.name}
            </h3>
            <div className="w-16 h-0.5 mx-auto mb-3" style={{ backgroundColor: rarity.border }} />
            <p className="text-[#94a3b8] italic mb-4 text-[0.95rem]">&ldquo;{encounter.description}&rdquo;</p>
            <p className="text-sm font-bold text-[#22d3ee] mb-4">Reward: {rewardText}</p>
            <button
              onClick={onClaim}
              className="px-8 py-3 rounded-lg font-black text-base cursor-pointer transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                color: '#0f172a',
                border: 'none',
              }}
              onMouseEnter={(e) => e.target.style.boxShadow = '0 0 20px rgba(34, 211, 238, 0.5)'}
              onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
            >
              ✨ CLAIM REWARD
            </button>
            <p className="text-xs mt-3 uppercase tracking-[2px]" style={{ color: rarity.text }}>
              — {encounter.rarity} Encounter —
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .dice-d10 {
          width: 120px;
          height: 140px;
          background: linear-gradient(135deg, #1e293b, #334155);
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
    </div>,
    document.body
  );
}
