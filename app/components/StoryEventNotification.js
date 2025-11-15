'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StoryEventNotification({ userId }) {
  const [event, setEvent] = useState(null);
  const [showEvent, setShowEvent] = useState(false);

  useEffect(() => {
    if (userId) {
      checkForNewEvents();
    }
  }, [userId]);

  async function checkForNewEvents() {
    try {
      const { getSupabaseClient } = await import('@/lib/supabase-client');
      const supabase = getSupabaseClient();

      // Get unviewed story events
      const { data: events } = await supabase
        .from('story_events')
        .select('*')
        .eq('user_id', userId)
        .eq('viewed', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (events && events.length > 0) {
        setEvent(events[0]);
        setShowEvent(true);
      }
    } catch (error) {
      console.error('Error checking story events:', error);
    }
  }

  async function markEventAsViewed() {
    if (!event) return;

    try {
      const { getSupabaseClient } = await import('@/lib/supabase-client');
      const supabase = getSupabaseClient();

      await supabase
        .from('story_events')
        .update({ viewed: true })
        .eq('id', event.id);

      setShowEvent(false);
      setEvent(null);
    } catch (error) {
      console.error('Error marking event as viewed:', error);
    }
  }

  if (!event) return null;

  const eventData = event.event_data || {};
  const rewards = event.rewards || {};

  return (
    <AnimatePresence>
      {showEvent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 52, 96, 0.95)' }}
          onClick={markEventAsViewed}
        >
          {/* Event Card */}
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-[#1A1A2E] border-3 border-[#FFD93D] rounded-lg p-8 max-w-md w-full shadow-[0_0_40px_rgba(255,217,61,0.4)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', duration: 0.8 }}
              className="text-center mb-6"
            >
              <span className="text-8xl">{eventData.emoji || '✨'}</span>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black text-center text-[#FFD93D] mb-4"
              style={{ fontFamily: 'VT323, monospace' }}
            >
              {eventData.title || 'A Story Event!'}
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-white text-center mb-6"
            >
              {eventData.description || 'Something unexpected happened on your journey!'}
            </motion.p>

            {/* NPC Info (if applicable) */}
            {eventData.npc_name && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-[#0F3460] border-2 border-[#00D4FF] rounded-lg p-4 mb-6"
              >
                <div className="text-[#00D4FF] font-bold text-center mb-2">
                  {eventData.npc_name}
                </div>
                <div className="text-sm text-gray-300 text-center">
                  {eventData.npc_description}
                </div>
              </motion.div>
            )}

            {/* Rewards */}
            {(rewards.gold || rewards.xp) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-2 gap-4 mb-6"
              >
                {rewards.gold !== undefined && rewards.gold !== 0 && (
                  <div className="bg-[#0F3460] border-2 border-[#FFD93D] rounded-lg p-3 text-center">
                    <div className="text-3xl mb-1">💰</div>
                    <div className="text-[#FFD93D] font-black text-xl" style={{ fontFamily: 'VT323, monospace' }}>
                      {rewards.gold > 0 ? '+' : ''}{rewards.gold}
                    </div>
                    <div className="text-xs text-gray-400">GOLD</div>
                  </div>
                )}
                {rewards.xp && rewards.xp > 0 && (
                  <div className="bg-[#0F3460] border-2 border-[#00D4FF] rounded-lg p-3 text-center">
                    <div className="text-3xl mb-1">⭐</div>
                    <div className="text-[#00D4FF] font-black text-xl" style={{ fontFamily: 'VT323, monospace' }}>
                      +{rewards.xp}
                    </div>
                    <div className="text-xs text-gray-400">XP</div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Level Up Notice */}
            {rewards.level_up && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className="bg-[#FFD93D] text-[#0F3460] rounded-lg p-3 mb-6 text-center font-black"
                style={{ fontFamily: 'VT323, monospace' }}
              >
                🎉 LEVEL UP! You are now level {rewards.new_level}!
              </motion.div>
            )}

            {/* Continue Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              onClick={markEventAsViewed}
              className="w-full py-4 bg-gradient-to-r from-[#FFD93D] to-[#00D4FF] text-[#0F3460] font-black text-xl rounded-lg border-3 border-[#0F3460] shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all"
              style={{ fontFamily: 'VT323, monospace' }}
            >
              CONTINUE ADVENTURE
            </motion.button>

            {/* Hint */}
            <p className="text-xs text-center text-gray-400 mt-4">
              💡 Story events happen randomly during your journey. Check back daily!
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
