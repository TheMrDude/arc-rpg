'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function SeasonalEventsBanner({ userId }) {
  const [activeEvent, setActiveEvent] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadActiveEvent();
  }, []);

  async function loadActiveEvent() {
    try {
      // Get active event
      const { data: event, error: eventError } = await supabase
        .from('seasonal_events')
        .select('*')
        .eq('is_active', true)
        .single();

      if (eventError || !event) return;

      setActiveEvent(event);

      // Get challenges for this event
      const { data: challengesData } = await supabase
        .from('seasonal_challenges')
        .select('*')
        .eq('event_id', event.id)
        .order('difficulty');

      setChallenges(challengesData || []);

      // Get user progress
      if (userId) {
        const { data: progressData } = await supabase
          .from('user_seasonal_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('event_id', event.id);

        setUserProgress(progressData || []);
      }
    } catch (error) {
      console.error('Error loading seasonal event:', error);
    }
  }

  if (!activeEvent) return null;

  const themeColors = activeEvent.theme_colors || {};
  const primary = themeColors.primary || '#FFD93D';
  const secondary = themeColors.secondary || '#FF6B6B';

  const completedChallenges = userProgress.filter(p => p.completed).length;
  const totalChallenges = challenges.length;

  return (
    <>
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 cursor-pointer"
        onClick={() => setShowDetails(true)}
      >
        <div
          className="relative overflow-hidden rounded-xl border-4 p-6"
          style={{
            background: `linear-gradient(135deg, ${primary}22 0%, ${secondary}22 100%)`,
            borderColor: primary
          }}
        >
          {/* Animated Background */}
          <motion.div
            className="absolute inset-0 opacity-10"
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%']
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear'
            }}
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }}
          />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-6xl">{activeEvent.icon}</span>
              <div>
                <h2 className="text-2xl font-black uppercase text-white mb-1">{activeEvent.name}</h2>
                <p className="text-white/90">{activeEvent.description}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-white/75">
                  <span>🎯 {completedChallenges}/{totalChallenges} Challenges</span>
                  <span>📅 Ends: {new Date(activeEvent.end_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <button
              className="px-6 py-3 rounded-lg font-black uppercase text-sm tracking-wide transition-all hover:scale-105"
              style={{
                background: primary,
                color: '#1A1A2E',
                boxShadow: `0 5px 0 ${secondary}`
              }}
            >
              View Details
            </button>
          </div>
        </div>
      </motion.div>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              className="bg-gradient-to-br from-[#1A1A2E] to-[#0F3460] rounded-xl border-4 p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              style={{ borderColor: primary }}
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-6">
                <span className="text-6xl">{activeEvent.icon}</span>
                <div>
                  <h2 className="text-3xl font-black text-white uppercase">{activeEvent.name}</h2>
                  <p className="text-[#E2E8F0]">{activeEvent.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/30 rounded-lg p-4 border-2" style={{ borderColor: primary }}>
                  <div className="text-sm text-[#E2E8F0] mb-1">Progress</div>
                  <div className="text-2xl font-black" style={{ color: primary }}>
                    {completedChallenges}/{totalChallenges}
                  </div>
                </div>
                <div className="bg-black/30 rounded-lg p-4 border-2" style={{ borderColor: secondary }}>
                  <div className="text-sm text-[#E2E8F0] mb-1">Time Remaining</div>
                  <div className="text-2xl font-black" style={{ color: secondary }}>
                    {Math.ceil((new Date(activeEvent.end_date) - new Date()) / (1000 * 60 * 60 * 24))} days
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-black text-white uppercase mb-4">Challenges</h3>
              <div className="space-y-3">
                {challenges.map(challenge => {
                  const progress = userProgress.find(p => p.challenge_id === challenge.id);
                  const completed = progress?.completed || false;

                  return (
                    <div
                      key={challenge.id}
                      className={`bg-black/30 rounded-lg p-4 border-2 ${
                        completed ? 'border-[#48BB78]' : 'border-[#1A1A2E]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-[#FFD93D]">{challenge.challenge_name}</h4>
                          <p className="text-sm text-[#E2E8F0]">{challenge.challenge_description}</p>
                        </div>
                        {completed && <span className="text-2xl">✅</span>}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#E2E8F0]">
                          {progress?.progress || 0} / {challenge.target_value}
                        </span>
                        <div className="flex gap-2">
                          <span style={{ color: primary }}>⚡ +{challenge.xp_reward}</span>
                          <span style={{ color: secondary }}>💰 +{challenge.gold_reward}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setShowDetails(false)}
                className="w-full mt-6 bg-[#0F3460] hover:bg-[#16213e] text-[#E2E8F0] py-3 px-6 rounded-lg font-black uppercase tracking-wide transition-all"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
