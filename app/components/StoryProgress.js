'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StoryProgress({ profile }) {
  const [expanded, setExpanded] = useState(false);

  if (!profile) return null;

  const currentThread = profile.current_story_thread;
  const storyProgress = profile.story_progress || {
    recent_events: [],
    ongoing_conflicts: [],
    npcs_met: [],
    thread_completion: 0,
    threads_completed: []
  };

  const hasActiveStory = currentThread && storyProgress.thread_completion > 0;
  const hasHistory = storyProgress.recent_events?.length > 0 ||
                     storyProgress.npcs_met?.length > 0 ||
                     storyProgress.ongoing_conflicts?.length > 0;

  if (!hasActiveStory && !hasHistory) return null;

  return (
    <div className="kq-card overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-cream/60 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="text-4xl">📖</span>
          <div className="text-left">
            <h3 className="kq-display text-xl font-black text-navy">
              {hasActiveStory ? 'Your Story' : 'Recent Adventures'}
            </h3>
            {hasActiveStory && (
              <p className="text-hero-blue font-bold text-sm">{currentThread}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hasActiveStory && (
            <div className="text-right">
              <p className="kq-display text-gold font-black text-2xl">
                {storyProgress.thread_completion}%
              </p>
              <p className="text-xs text-navy/50">complete</p>
            </div>
          )}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="text-hero-blue text-2xl"
          >
            ▼
          </motion.div>
        </div>
      </button>

      {/* Progress Bar - Always visible if active story */}
      {hasActiveStory && (
        <div className="px-6 pb-4">
          <div className="bg-cream rounded-full h-4 border-2 border-stone overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${storyProgress.thread_completion}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-hero-blue to-gold relative"
            >
              <motion.div
                animate={{
                  opacity: [0.5, 1, 0.5],
                  x: ['-100%', '200%']
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear'
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
              />
            </motion.div>
          </div>
        </div>
      )}

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t-2 border-stone"
          >
            <div className="p-6 space-y-6">
              {/* Recent Events */}
              {storyProgress.recent_events?.length > 0 && (
                <div>
                  <h4 className="kq-display text-lg font-black text-navy mb-3 flex items-center gap-2">
                    <span>⚡</span> Recent Events
                  </h4>
                  <div className="space-y-2">
                    {storyProgress.recent_events.slice(0, 5).map((event, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="text-sm text-navy/70 pl-4 border-l-2 border-hero-blue/50"
                      >
                        {event}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* NPCs Met */}
              {storyProgress.npcs_met?.length > 0 && (
                <div>
                  <h4 className="kq-display text-lg font-black text-navy mb-3 flex items-center gap-2">
                    <span>👥</span> Characters Met
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {storyProgress.npcs_met.map((npc, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="kq-chip text-hero-blue font-bold"
                      >
                        {npc}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ongoing Conflicts */}
              {storyProgress.ongoing_conflicts?.length > 0 && (
                <div>
                  <h4 className="kq-display text-lg font-black text-navy mb-3 flex items-center gap-2">
                    <span>⚔️</span> Ongoing Conflicts
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {storyProgress.ongoing_conflicts.map((conflict, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="px-3 py-1 bg-coral/12 border-2 border-coral rounded-lg text-sm text-coral font-bold"
                      >
                        vs. {conflict}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Stories */}
              {storyProgress.threads_completed?.length > 0 && (
                <div>
                  <h4 className="kq-display text-lg font-black text-navy mb-3 flex items-center gap-2">
                    <span>🏆</span> Completed Stories
                  </h4>
                  <div className="space-y-2">
                    {storyProgress.threads_completed.slice(-3).reverse().map((completed, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-3 bg-gold/12 border-2 border-gold rounded-lg"
                      >
                        <div className="text-navy font-bold">{completed.thread}</div>
                        <div className="text-xs text-navy/50 mt-1">
                          {new Date(completed.completed_at).toLocaleDateString()}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Story Tip */}
              <div className="bg-aqua/12 border-2 border-aqua/40 rounded-lg p-4">
                <p className="text-sm text-navy text-center">
                  💡 <strong>Complete quests with the same story thread</strong> to advance your narrative and unlock epic story conclusions!
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
