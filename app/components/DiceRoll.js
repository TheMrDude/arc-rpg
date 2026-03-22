'use client';

import { useState, useEffect } from 'react';
import { RARITY_COLORS } from '@/lib/encounterTable';

export default function DiceRoll({ encounter, onClaim, show }) {
  const [phase, setPhase] = useState('spinning'); // spinning -> revealed -> card
  const [displayNumber, setDisplayNumber] = useState(1);

  useEffect(() => {
    if (!show || !encounter) return;
    setPhase('spinning');

    // Rapid number cycling during spin
    const interval = setInterval(() => {
      setDisplayNumber(Math.floor(Math.random() * 10) + 1);
    }, 80);

    // Stop spinning after 1.5s, show actual roll
    const revealTimer = setTimeout(() => {
      clearInterval(interval);
      setDisplayNumber(encounter.roll);
      setPhase('revealed');
    }, 1500);

    // Show encounter card after 2.5s
    const cardTimer = setTimeout(() => {
      setPhase('card');
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(revealTimer);
      clearTimeout(cardTimer);
    };
  }, [show, encounter]);

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

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 p-8">
        {/* Dice */}
        <div className="relative">
          <div
            className={`dice-d10 ${phase === 'spinning' ? 'dice-spinning' : ''} ${isLegendary && phase !== 'spinning' ? 'dice-legendary' : ''}`}
            style={{
              boxShadow: phase !== 'spinning' ? `0 0 ${isLegendary ? '50' : '30'}px ${rarity.glow}` : '0 0 20px rgba(34, 211, 238, 0.3)',
              borderColor: phase !== 'spinning' ? rarity.border : '#22d3ee',
            }}
          >
            <span style={{ color: phase !== 'spinning' ? rarity.text : '#22d3ee' }}>
              {displayNumber}
            </span>
          </div>
          {/* Legendary particles */}
          {isLegendary && phase !== 'spinning' && (
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

        {/* Encounter Text */}
        {phase === 'revealed' && (
          <p className="text-xl font-black uppercase tracking-wide text-white animate-fade-in">
            {encounter.icon} {encounter.name}
          </p>
        )}

        {/* Encounter Card */}
        {phase === 'card' && (
          <div
            className="bg-[#1A1A2E] rounded-lg p-6 max-w-sm w-full text-center animate-slide-up"
            style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: rarity.border, boxShadow: `0 0 30px ${rarity.glow}` }}
          >
            <div className="text-4xl mb-3">{encounter.icon}</div>
            <h3 className="text-xl font-black uppercase tracking-wide mb-2" style={{ color: rarity.text }}>
              {encounter.name}
            </h3>
            <div className="w-16 h-0.5 mx-auto mb-3" style={{ backgroundColor: rarity.border }} />
            <p className="text-[#E2E8F0] italic mb-4">&ldquo;{encounter.description}&rdquo;</p>
            <p className="text-sm font-bold text-[#FFD93D] mb-4">Reward: {rewardText}</p>
            <button
              onClick={onClaim}
              className="px-8 py-3 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-3 border-[#0F3460] rounded-lg font-black uppercase tracking-wide shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all"
            >
              ✨ Claim Reward
            </button>
            <p className="text-xs mt-3 uppercase tracking-wider" style={{ color: rarity.text }}>
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
          font-size: 2.5rem;
          font-weight: 900;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
          border: 3px solid;
        }
        .dice-spinning {
          animation: diceRoll 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .dice-legendary {
          animation: legendaryPulse 0.5s ease-in-out infinite alternate;
        }
        @keyframes diceRoll {
          0% { transform: rotateX(0deg) rotateY(0deg) scale(0.5); opacity: 0; }
          20% { transform: rotateX(360deg) rotateY(180deg) scale(1.2); opacity: 1; }
          40% { transform: rotateX(720deg) rotateY(360deg) scale(1); }
          60% { transform: rotateX(1080deg) rotateY(540deg) scale(1.1); }
          80% { transform: rotateX(1300deg) rotateY(650deg) scale(1); }
          100% { transform: rotateX(1440deg) rotateY(720deg) scale(1); }
        }
        @keyframes legendaryPulse {
          from { box-shadow: 0 0 30px rgba(234, 179, 8, 0.5); }
          to { box-shadow: 0 0 60px rgba(234, 179, 8, 0.9); }
        }
        @keyframes particle {
          0% { opacity: 1; transform: rotate(var(--rotation)) translateY(-30px) scale(1); }
          100% { opacity: 0; transform: rotate(var(--rotation)) translateY(-80px) scale(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slide-up {
          animation: slideUp 0.4s ease-out;
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
    </div>
  );
}
