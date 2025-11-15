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
    <div className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,212,255,0.2)]">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-[#0F3460] transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="text-4xl">📖</span>
          <div className="text-left">
            <h3 className="text-xl font-black text-[#FFD93D]" style={{ fontFamily: 'VT323, monospace' }}>
              {hasActiveStory ? 'YOUR STORY' : 'RECENT ADVENTURES'}
            </h3>
            {hasActiveStory && (
              <p className="text-[#00D4FF] font-bold text-sm">{currentThread}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hasActiveStory && (
            <div className="text-right">
              <p className="text-[#FFD93D] font-black text-2xl" style={{ fontFamily: 'VT323, monospace' }}>
                {storyProgress.thread_completion}%
              </p>
              <p className="text-xs text-gray-400">COMPLETE</p>
            </div>
          )}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="text-[#00D4FF] text-2xl"
          >
            ▼
          </motion.div>
        </div>
      </button>

      {/* Progress Bar - Always visible if active story */}
      {hasActiveStory && (
        <div className="px-6 pb-4">
          <div className="bg-[#0F3460] rounded-full h-4 border-2 border-[#00D4FF] border-opacity-30 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${storyProgress.thread_completion}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-[#00D4FF] to-[#FFD93D] relative"
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
            className="border-t-3 border-[#0F3460]"
          >
            <div className="p-6 space-y-6">
              {/* Recent Events */}
              {storyProgress.recent_events?.length > 0 && (
                <div>
                  <h4 className="text-lg font-black text-[#FFD93D] mb-3 flex items-center gap-2" style={{ fontFamily: 'VT323, monospace' }}>
                    <span>⚡</span> RECENT EVENTS
                  </h4>
                  <div className="space-y-2">
                    {storyProgress.recent_events.slice(0, 5).map((event, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="text-sm text-gray-300 pl-4 border-l-2 border-[#00D4FF] border-opacity-50"
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
                  <h4 className="text-lg font-black text-[#FFD93D] mb-3 flex items-center gap-2" style={{ fontFamily: 'VT323, monospace' }}>
                    <span>👥</span> CHARACTERS MET
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {storyProgress.npcs_met.map((npc, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="px-3 py-1 bg-[#0F3460] border-2 border-[#00D4FF] border-opacity-50 rounded-full text-sm text-[#00D4FF] font-bold"
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
                  <h4 className="text-lg font-black text-[#FFD93D] mb-3 flex items-center gap-2" style={{ fontFamily: 'VT323, monospace' }}>
                    <span>⚔️</span> ONGOING CONFLICTS
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {storyProgress.ongoing_conflicts.map((conflict, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="px-3 py-1 bg-[#1A1A2E] border-2 border-[#FF6B6B] border-opacity-70 rounded-lg text-sm text-[#FF6B6B] font-bold"
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
                  <h4 className="text-lg font-black text-[#FFD93D] mb-3 flex items-center gap-2" style={{ fontFamily: 'VT323, monospace' }}>
                    <span>🏆</span> COMPLETED STORIES
                  </h4>
                  <div className="space-y-2">
                    {storyProgress.threads_completed.slice(-3).reverse().map((completed, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-3 bg-[#0F3460] border-2 border-[#FFD93D] border-opacity-50 rounded-lg"
                      >
                        <div className="text-[#FFD93D] font-bold">{completed.thread}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(completed.completed_at).toLocaleDateString()}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Story Tip */}
              <div className="bg-[#0F3460] border-2 border-[#00D4FF] border-opacity-30 rounded-lg p-4">
                <p className="text-sm text-[#00D4FF] text-center">
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
