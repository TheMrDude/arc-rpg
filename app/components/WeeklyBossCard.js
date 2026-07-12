'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

/**
 * Weekly Boss Battle card. One boss per ISO week, for everyone. Every
 * completed quest deals 1 damage; empty the HP bar before the week ends
 * for rewards. If the week runs out the boss simply slips away into the
 * mist. It will return. Nothing is ever lost.
 */
export default function WeeklyBossCard({ refreshKey = 0 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadBoss = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/boss/current', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      const json = await response.json();
      if (response.ok && json.boss) {
        setData(json);
      }
    } catch (error) {
      console.error('Error loading weekly boss:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoss();
  }, [loadBoss, refreshKey]);

  if (loading || !data?.boss) return null;

  const { boss, days_left: daysLeft } = data;
  const hpLeft = Math.max(0, boss.max_hp - boss.damage_dealt);
  const hpPercent = boss.max_hp > 0 ? (hpLeft / boss.max_hp) * 100 : 0;
  const defeated = boss.status === 'defeated';
  const retreated = boss.status === 'retreated';
  const daysText = daysLeft === 1 ? 'Last day this week' : `${daysLeft} days left this week`;

  return (
    <div
      className={`bg-[#1A1A2E] border-3 rounded-lg p-6 mb-6 transition-all ${
        defeated
          ? 'border-[#FFD93D] shadow-[0_0_25px_rgba(255,217,61,0.4)]'
          : 'border-[#FF6B6B] shadow-[0_0_20px_rgba(255,107,107,0.3)]'
      }`}
    >
      <div className="flex items-start gap-4">
        <motion.span
          className="text-5xl"
          animate={defeated ? { rotate: [0, -8, 8, 0] } : {}}
          transition={{ duration: 0.6 }}
        >
          {boss.boss_icon}
        </motion.span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3
              className={`text-xl font-black uppercase tracking-wide ${
                defeated ? 'text-[#FFD93D]' : 'text-[#FF6B6B]'
              }`}
            >
              {boss.boss_name}
            </h3>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#94a3b8] bg-[#0F3460] border-2 border-[#1A1A2E] rounded-full px-2.5 py-1">
              Weekly Boss
            </span>
          </div>
          <p className="text-sm text-[#E2E8F0] mt-1">{boss.boss_flavor}</p>

          {defeated ? (
            <div className="mt-3 bg-[#0F3460] border-2 border-[#FFD93D] rounded-lg p-3">
              <p className="font-black uppercase tracking-wide text-[#FFD93D] text-sm">
                🏆 Defeated! It dropped: 💰 {boss.reward?.gold || 0} gold
                {boss.reward?.equipment
                  ? ` and ${boss.reward.equipment.emoji} ${boss.reward.equipment.name}`
                  : ''}
                {boss.reward?.bonus_gold
                  ? ` and 💰 ${boss.reward.bonus_gold} bonus gold`
                  : ''}
              </p>
              <p className="text-xs text-[#E2E8F0] mt-1">
                A mighty victory. A new challenger arrives next week.
              </p>
            </div>
          ) : retreated ? (
            <p className="text-sm text-[#94a3b8] mt-3">
              The boss slips away into the mist. It will return. Nothing lost.
            </p>
          ) : (
            <>
              {/* HP bar: drains from full as damage is dealt */}
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black uppercase tracking-wide text-[#FF6B6B]">
                    HP
                  </span>
                  <span className="text-xs font-bold text-[#E2E8F0]">
                    {hpLeft} / {boss.max_hp}
                  </span>
                </div>
                <div className="h-4 bg-[#0F3460] rounded-full border-2 border-[#1A1A2E] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#7f1d1d]"
                    initial={false}
                    animate={{ width: `${hpPercent}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>
              <p className="text-sm text-[#E2E8F0] mt-2 font-bold">
                {hpLeft} HP left. Every quest you complete strikes the boss.
              </p>
              <p className="text-xs text-[#94a3b8] mt-1">{daysText}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
