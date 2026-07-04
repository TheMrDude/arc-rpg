'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sword, Shield, Gem, Coins } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import { RARITY_COLORS, RARITY_GLOW } from '@/lib/equipment-constants';
import { useCountUp } from '@/lib/hooks/useCountUp';

const SLOT_TYPES = ['weapon', 'armor', 'accessory'];
const SLOT_LABELS = { weapon: 'Weapon', armor: 'Armor', accessory: 'Accessory' };
const SLOT_PLACEHOLDER_ICON = {
  weapon: <Sword size={16} />,
  armor: <Shield size={16} />,
  accessory: <Gem size={16} />,
};

const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function CharacterPanel({ profile, creature, isPremium, equipmentVersion, reducedMotion }) {
  const [equippedItems, setEquippedItems] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function loadEquipped() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('user_equipment')
        .select('equipped, equipment:equipment_catalog(*)')
        .eq('user_id', session.user.id)
        .eq('equipped', true);

      if (cancelled) return;

      const bySlot = {};
      (data || []).forEach((row) => {
        if (row.equipment) bySlot[row.equipment.type] = row.equipment;
      });
      setEquippedItems(bySlot);
    }

    if (profile?.id) loadEquipped();
    return () => { cancelled = true; };
  }, [profile?.id, equipmentVersion]);

  const xpInLevel = profile ? profile.xp % 100 : 0;
  const animatedXP = useCountUp(xpInLevel, 500, reducedMotion);

  if (!profile) return null;

  const xpProgress = xpInLevel / 100;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - xpProgress);
  const isFounder = isPremium && profile.premium_since;
  const title = `Level ${profile.level} ${profile.archetype ? profile.archetype.charAt(0).toUpperCase() + profile.archetype.slice(1) : 'Adventurer'}`;

  return (
    <div className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-4 mb-6 shadow-[0_0_20px_rgba(0,212,255,0.3)]">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        {/* Portrait with XP ring */}
        {profile.archetype && (
          <div className="relative flex-shrink-0 w-24 h-24">
            <svg className="absolute inset-0 w-24 h-24 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={RING_RADIUS} fill="none" stroke="#0F3460" strokeWidth="5" />
              <motion.circle
                cx="40"
                cy="40"
                r={RING_RADIUS}
                fill="none"
                stroke="url(#xpRingGradient)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                initial={false}
                animate={{ strokeDashoffset }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="xpRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>
            </svg>
            <img
              src={`/images/archetypes/${profile.archetype}.png`}
              alt={profile.archetype}
              className="absolute inset-0 m-auto w-[70px] h-[70px] object-cover rounded-full border-2 border-[#0F3460]"
            />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#FFD93D] border-2 border-[#1A1A2E] flex items-center justify-center">
              <span className="text-[10px] font-black text-[#1A1A2E]">{profile.level}</span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center justify-between flex-wrap gap-x-3 gap-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide text-[#FF6B6B]">
                {title}
              </h1>
              {isFounder && (
                <span className="px-1.5 py-0.5 border border-[#00D4FF] text-[#00D4FF] rounded text-[10px] font-black uppercase">
                  ⚡ Founder
                </span>
              )}
              {isPremium && (
                <span className="px-2 py-0.5 bg-[#FFD93D] text-[#1A1A2E] rounded text-xs font-black uppercase">
                  PRO
                </span>
              )}
            </div>
            <span id="gold-counter-target" className="text-[#FFD93D] font-black text-sm inline-flex items-center gap-1" title="Gold">
              <Coins size={14} /> {(profile.gold || 0).toLocaleString()}
            </span>
          </div>

          {/* XP bar */}
          <div className="mt-2" id="xp-bar-target">
            <div className="h-3 bg-[#0F3460] rounded-full overflow-hidden border border-[#1A1A2E]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${xpProgress * 100}%`,
                  background: 'linear-gradient(90deg, #22d3ee, #f43f5e)',
                }}
              />
            </div>
            <p className="text-xs text-[#94a3b8] font-bold mt-1 text-center">
              {animatedXP} / 100 XP
            </p>
          </div>

          {/* Equipment slots */}
          <div className="flex items-center gap-2 mt-3">
            {SLOT_TYPES.map((slot) => {
              const item = equippedItems[slot];
              const color = item ? RARITY_COLORS[item.rarity] : '#334155';
              const glow = item ? RARITY_GLOW[item.rarity] : 'transparent';
              return (
                <div
                  key={slot}
                  title={item ? item.name : `No ${SLOT_LABELS[slot].toLowerCase()} equipped`}
                  className="w-9 h-9 rounded-lg border-2 flex items-center justify-center text-lg"
                  style={{
                    borderColor: color,
                    boxShadow: item ? `0 0 10px ${glow}` : 'none',
                    background: item ? '#0F3460' : 'transparent',
                    opacity: item ? 1 : 0.4,
                  }}
                >
                  {item ? (item.emoji || '⚡') : SLOT_PLACEHOLDER_ICON[slot]}
                </div>
              );
            })}
            {creature && (
              <div className="flex items-center gap-1.5 ml-1">
                {creature.image ? (
                  <img src={creature.image} alt={creature.name} className="w-5 h-5 object-contain rounded" />
                ) : (
                  <span className="text-sm">{creature.emoji}</span>
                )}
                <span className="text-xs text-[#E2E8F0] truncate">{creature.name}</span>
              </div>
            )}
            {profile.skill_points > 0 && (
              <p className="text-xs text-[#FFD93D] font-black ml-auto inline-flex items-center gap-1">
                <Gem size={12} /> {profile.skill_points} Skill Pt{profile.skill_points > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
