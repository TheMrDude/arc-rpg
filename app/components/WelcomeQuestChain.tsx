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
}

export default function WelcomeQuestChain({ userId }: WelcomeQuestChainProps) {
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

      if (progressRes.data) setProgress(progressRes.data);
      if (stepsRes.data) setSteps(stepsRes.data);
    } catch {
      // Not enrolled or data unavailable
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) loadData();
  }, [userId, loadData]);

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
              className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border-4 border-[#F59E0B] rounded-2xl p-8 max-w-md w-full text-center shadow-[0_0_80px_rgba(245,158,11,0.4)]"
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
              <h2 className="text-3xl font-black uppercase text-[#F59E0B] mb-2">
                Hero Established!
              </h2>
              <p className="text-gray-300 mb-4">
                You&apos;ve completed the Welcome Quest chain. Your adventure truly begins now.
              </p>
              <div className="bg-[#0F3460] border-2 border-[#10B981] rounded-xl p-4 mb-6">
                <div className="text-sm text-gray-400 uppercase font-bold mb-2">
                  Total Rewards Earned
                </div>
                <div className="flex justify-center gap-6">
                  <div>
                    <span className="text-2xl font-black text-[#F59E0B]">
                      {steps.reduce((sum, s) => sum + s.reward_gold, 0)}
                    </span>
                    <span className="text-sm text-gray-400 ml-1">Gold</span>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-[#00D4FF]">
                      {steps.reduce((sum, s) => sum + s.reward_xp, 0)}
                    </span>
                    <span className="text-sm text-gray-400 ml-1">XP</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCelebration(false)}
                className="px-8 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-xl font-black uppercase transition-all hover:scale-105"
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
        className="bg-gradient-to-br from-[#16213E] to-[#0F3460] border-3 border-[#FF6B35] rounded-2xl p-6 shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📜</span>
            <div>
              <h3 className="text-lg font-black uppercase text-[#FF6B35]">
                Welcome to the Quest
              </h3>
              <p className="text-xs text-gray-400">
                Step {currentStepNum} of {totalSteps}
              </p>
            </div>
          </div>
          {currentStep && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[#F59E0B] font-bold">
                +{currentStep.reward_gold} Gold
              </span>
              <span className="text-[#00D4FF] font-bold">
                +{currentStep.reward_xp} XP
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="h-2 bg-[#1E293B] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-[#FF6B35] to-[#F59E0B] rounded-full"
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
                      ? 'bg-[#10B981] text-white'
                      : isCurrent
                      ? 'bg-[#FF6B35] text-white ring-2 ring-[#FF6B35]/50'
                      : 'bg-[#1E293B] text-gray-600 border border-gray-700'
                  }`}
                >
                  {isCompleted ? '✓' : step.step_number}
                </div>
                <span
                  className={`text-[9px] text-center leading-tight max-w-[50px] ${
                    isCurrent
                      ? 'text-[#FF6B35] font-bold'
                      : isCompleted
                      ? 'text-gray-400'
                      : 'text-gray-600'
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
          <div className="bg-[#0F172A]/60 border border-[#FF6B35]/20 rounded-xl p-4">
            <h4 className="text-base font-black text-white mb-2">
              {currentStep.title}
            </h4>
            <p className="text-sm text-[#F59E0B]/90 italic mb-3 leading-relaxed">
              &ldquo;{currentStep.story_text}&rdquo;
            </p>
            <p className="text-sm text-gray-300">{currentStep.description}</p>
          </div>
        )}

        {/* Completed steps summary */}
        {currentStepNum > 1 && (
          <div className="mt-4 pt-3 border-t border-gray-700/50">
            <details className="group">
              <summary className="text-xs text-gray-500 font-bold uppercase cursor-pointer hover:text-gray-300 transition-colors">
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
                      <span className="text-gray-400 flex items-center gap-2">
                        <span className="text-[#10B981]">✓</span>
                        {step.title}
                      </span>
                      <span className="text-gray-600">
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
