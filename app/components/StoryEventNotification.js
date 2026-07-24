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
          style={{ backgroundColor: 'rgba(36, 59, 90, 0.75)' }}
          onClick={markEventAsViewed}
        >
          {/* Event Card */}
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="kq-card border-2 border-gold p-8 max-w-md w-full shadow-candy-lg"
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
              className="kq-display text-3xl text-center text-navy mb-4"
            >
              {eventData.title || 'A Story Event!'}
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-navy/80 text-center mb-6"
            >
              {eventData.description || 'Something unexpected happened on your journey!'}
            </motion.p>

            {/* NPC Info (if applicable) */}
            {eventData.npc_name && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-hero-blue/10 border-2 border-hero-blue rounded-2xl p-4 mb-6"
              >
                <div className="text-hero-blue font-bold text-center mb-2">
                  {eventData.npc_name}
                </div>
                <div className="text-sm text-navy/70 text-center">
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
                  <div className="bg-gold/15 border-2 border-gold rounded-2xl p-3 text-center">
                    <div className="text-3xl mb-1">💰</div>
                    <div className="kq-display text-xl text-navy">
                      {rewards.gold > 0 ? '+' : ''}{rewards.gold}
                    </div>
                    <div className="text-xs text-navy/60">Gold</div>
                  </div>
                )}
                {rewards.xp && rewards.xp > 0 && (
                  <div className="bg-hero-blue/10 border-2 border-hero-blue rounded-2xl p-3 text-center">
                    <div className="text-3xl mb-1">⭐</div>
                    <div className="kq-display text-xl text-hero-blue">
                      +{rewards.xp}
                    </div>
                    <div className="text-xs text-navy/60">XP</div>
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
                className="bg-gold text-navy rounded-2xl p-3 mb-6 text-center font-black"
              >
                🎉 Level up! You are now level {rewards.new_level}!
              </motion.div>
            )}

            {/* Continue Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              onClick={markEventAsViewed}
              className="kq-btn kq-btn-gold w-full py-4 text-xl"
            >
              Continue Adventure
            </motion.button>

            {/* Hint */}
            <p className="text-xs text-center text-navy/50 mt-4">
              💡 Story events happen randomly during your journey. Check back daily!
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
