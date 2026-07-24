'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface QuestStep {
  id: string;
  chain_id: string;
  step_number: number;
  title: string;
  description: string;
  story_text: string;
  reward_gold: number;
  reward_xp: number;
}

interface QuestProgress {
  id: string;
  user_id: string;
  chain_id: string;
  current_step: number;
  status: string;
}

interface WelcomeQuestChainProps {
  userId: string;
  /** Bump to re-fetch progress (e.g. after a quest completion or reflection). */
  refreshKey?: number;
}

export default function WelcomeQuestChain({ userId, refreshKey = 0 }: WelcomeQuestChainProps) {
  const [progress, setProgress] = useState<QuestProgress | null>(null);
  const [steps, setSteps] = useState<QuestStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [progressRes, stepsRes] = await Promise.all([
        supabase
          .from('user_quest_chain_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('chain_id', 'welcome_quest')
          .single(),
        supabase
          .from('quest_chain_steps')
          .select('*')
          .eq('chain_id', 'welcome_quest')
          .order('step_number'),
      ]);

      if (progressRes.data) {
        // Fire the Hero Established celebration exactly once: when we watch
        // the chain flip from in_progress to completed during this session
        setProgress((prev) => {
          if (prev && prev.status !== 'completed' && progressRes.data.status === 'completed') {
            setShowCelebration(true);
          }
          return progressRes.data;
        });
      }
      if (stepsRes.data) setSteps(stepsRes.data);
    } catch {
      // Not enrolled or data unavailable
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) loadData();
  }, [userId, loadData, refreshKey]);

  if (loading || !progress || !steps.length) return null;

  const isComplete = progress.status === 'completed';
  const currentStepNum = progress.current_step;
  const currentStep = steps.find((s) => s.step_number === currentStepNum);
  const totalSteps = steps.length;
  const progressPercent = isComplete
    ? 100
    : ((currentStepNum - 1) / totalSteps) * 100;

  if (isComplete && !showCelebration) {
    // Already completed, don't show the card
    return null;
  }

  return (
    <div className="mb-8">
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCelebration(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 12 }}
              className="kq-card border-2 border-gold rounded-candy p-8 max-w-md w-full text-center shadow-candy-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="text-8xl mb-4"
              >
                🏆
              </motion.div>
              <h2 className="kq-display text-3xl text-navy mb-2">
                Hero Established!
              </h2>
              <p className="text-navy/70 mb-4">
                You&apos;ve completed the Welcome Quest chain. Your adventure truly begins now.
              </p>
              <div className="bg-emerald/10 border-2 border-emerald rounded-candy p-4 mb-6">
                <div className="text-sm text-navy/60 font-bold mb-2">
                  Total Rewards Earned
                </div>
                <div className="flex justify-center gap-6">
                  <div>
                    <span className="text-2xl font-black text-gold">
                      {steps.reduce((sum, s) => sum + s.reward_gold, 0)}
                    </span>
                    <span className="text-sm text-navy/60 ml-1">Gold</span>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-hero-blue">
                      {steps.reduce((sum, s) => sum + s.reward_xp, 0)}
                    </span>
                    <span className="text-sm text-navy/60 ml-1">XP</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCelebration(false)}
                className="kq-btn kq-btn-gold"
              >
                Continue Your Journey
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="kq-card border-2 border-coral/40 rounded-candy p-6 shadow-candy"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📜</span>
            <div>
              <h3 className="kq-display text-lg text-coral">
                Welcome to the Quest
              </h3>
              <p className="text-xs text-navy/50">
                Step {currentStepNum} of {totalSteps}
              </p>
            </div>
          </div>
          {currentStep && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gold font-bold">
                +{currentStep.reward_gold} Gold
              </span>
              <span className="text-hero-blue font-bold">
                +{currentStep.reward_xp} XP
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="h-2 bg-stone rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-coral to-gold rounded-full"
            />
          </div>
        </div>

        {/* Step milestones */}
        <div className="flex justify-between mb-5 overflow-x-auto gap-1">
          {steps.map((step) => {
            const isCompleted = step.step_number < currentStepNum;
            const isCurrent = step.step_number === currentStepNum;
            return (
              <div
                key={step.step_number}
                className="flex flex-col items-center min-w-[40px]"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black mb-1 transition-all ${
                    isCompleted
                      ? 'bg-emerald text-white'
                      : isCurrent
                      ? 'bg-coral text-white ring-2 ring-coral/50'
                      : 'bg-stone text-navy/40 border border-stone'
                  }`}
                >
                  {isCompleted ? '✓' : step.step_number}
                </div>
                <span
                  className={`text-[9px] text-center leading-tight max-w-[50px] ${
                    isCurrent
                      ? 'text-coral font-bold'
                      : isCompleted
                      ? 'text-navy/60'
                      : 'text-navy/40'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current step narrative */}
        {currentStep && (
          <div className="bg-coral/5 border border-coral/20 rounded-candy p-4">
            <h4 className="text-base font-black text-navy mb-2">
              {currentStep.title}
            </h4>
            <p className="text-sm text-gold/90 italic mb-3 leading-relaxed">
              &ldquo;{currentStep.story_text}&rdquo;
            </p>
            <p className="text-sm text-navy/70">{currentStep.description}</p>
          </div>
        )}

        {/* Completed steps summary */}
        {currentStepNum > 1 && (
          <div className="mt-4 pt-3 border-t border-stone">
            <details className="group">
              <summary className="text-xs text-navy/50 font-bold cursor-pointer hover:text-navy/70 transition-colors">
                Completed Steps ({currentStepNum - 1})
              </summary>
              <div className="mt-2 space-y-1">
                {steps
                  .filter((s) => s.step_number < currentStepNum)
                  .map((step) => (
                    <div
                      key={step.step_number}
                      className="flex items-center justify-between text-xs py-1"
                    >
                      <span className="text-navy/60 flex items-center gap-2">
                        <span className="text-emerald">✓</span>
                        {step.title}
                      </span>
                      <span className="text-navy/40">
                        +{step.reward_gold}g +{step.reward_xp}xp
                      </span>
                    </div>
                  ))}
              </div>
            </details>
          </div>
        )}
      </motion.div>
    </div>
  );
}
