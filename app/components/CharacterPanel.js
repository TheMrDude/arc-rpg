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

  // The companion is the avatar. The archetype art was five male-presenting
  // human figures, so the portrait told a lot of players they were someone
  // they are not; the companion is a creature she chose as an egg and named
  // herself. Archetype still drives the AI narration voice, it just no longer
  // has a face here.
  //
  // Level and companion name are separate elements rather than one string:
  // globals.css forces h1 to 2rem on mobile, and companion names run longer
  // than "Seeker", so a combined title wrapped to two lines on a phone.
  const title = `Level ${profile.level}`;

  return (
    <div className="kq-card border-2 border-stone rounded-candy p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        {/* Portrait with XP ring — the companion at its current stage */}
        {creature && (
          <div className="relative flex-shrink-0 w-24 h-24">
            <svg className="absolute inset-0 w-24 h-24 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={RING_RADIUS} fill="none" stroke="#ECE7DD" strokeWidth="5" />
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
                  <stop offset="0%" stopColor="#FFC83D" />
                  <stop offset="100%" stopColor="#FF7B6B" />
                </linearGradient>
              </defs>
            </svg>
            <div
              className="absolute inset-0 m-auto w-[70px] h-[70px] rounded-full border-2 border-stone bg-cream flex items-center justify-center select-none overflow-hidden"
              title={creature.stageTitle}
              role="img"
              aria-label={`${creature.name}, ${creature.stageTitle}`}
            >
              {/* The companion art at its current stage, or the emoji until art
                  exists. `object-cover` fills the circle from the square source;
                  `portrait` prefers an optional tight crop and otherwise reuses
                  the full render. */}
              {creature.portrait ? (
                <img
                  src={creature.portrait}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[34px] leading-none">{creature.emoji}</span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gold border-2 border-white flex items-center justify-center">
              <span className="text-[10px] font-black text-navy">{profile.level}</span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center justify-between flex-wrap gap-x-3 gap-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="kq-display text-lg sm:text-xl font-black text-navy">
                {title}
              </h1>
              {creature && (
                <span className="text-sm font-bold text-emerald truncate max-w-[10rem]" title={creature.stageTitle}>
                  {creature.name}
                </span>
              )}
              {isPremium && (
                <span className="kq-chip px-2 py-0.5 bg-gold text-navy rounded-full text-xs font-black uppercase">
                  PRO
                </span>
              )}
            </div>
            <span id="gold-counter-target" className="text-gold font-black text-sm inline-flex items-center gap-1" title="Gold">
              <Coins size={14} /> {(profile.gold || 0).toLocaleString()}
            </span>
          </div>

          {/* XP bar */}
          <div className="mt-2" id="xp-bar-target">
            <div className="h-3 bg-stone rounded-full overflow-hidden border border-stone">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${xpProgress * 100}%`,
                  background: 'linear-gradient(90deg, #FFC83D, #FF7B6B)',
                }}
              />
            </div>
            <p className="text-xs text-navy/60 font-bold mt-1 text-center">
              {animatedXP} / 100 XP
            </p>
          </div>

          {/* Equipment slots */}
          <div className="flex items-center gap-2 mt-3">
            {SLOT_TYPES.map((slot) => {
              const item = equippedItems[slot];
              const color = item ? RARITY_COLORS[item.rarity] : '#ECE7DD';
              const glow = item ? RARITY_GLOW[item.rarity] : 'transparent';
              return (
                <div
                  key={slot}
                  title={item ? item.name : `No ${SLOT_LABELS[slot].toLowerCase()} equipped`}
                  className="w-9 h-9 rounded-xl border-2 flex items-center justify-center text-lg"
                  style={{
                    borderColor: color,
                    boxShadow: item ? `0 0 10px ${glow}` : 'none',
                    background: item ? '#FFF9F1' : 'transparent',
                    opacity: item ? 1 : 0.4,
                  }}
                >
                  {item ? (item.emoji || '⚡') : SLOT_PLACEHOLDER_ICON[slot]}
                </div>
              );
            })}
            {/* The companion badge that used to live here is gone: the portrait
                above IS the companion now, and showing the same creature twice
                in one card just read as a bug. */}
            {profile.skill_points > 0 && (
              <p className="text-xs text-gold font-black ml-auto inline-flex items-center gap-1">
                <Gem size={12} /> {profile.skill_points} Skill Pt{profile.skill_points > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
