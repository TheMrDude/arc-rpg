'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ONBOARDING TOUR COMPONENT
 *
 * Guides new users through key features with interactive tooltips.
 *
 * Usage:
 * const steps = [
 *   { target: '#quest-button', title: 'Create Quests', content: 'Click here to add new quests' },
 *   { target: '#skills', title: 'Skill Tree', content: 'Unlock powerful abilities' }
 * ];
 * <OnboardingTour steps={steps} onComplete={() => console.log('Done!')} />
 */

export default function OnboardingTour({
  steps = [],
  onComplete,
  onSkip,
  storageKey = 'onboarding-completed'
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetElement, setTargetElement] = useState(null);

  useEffect(() => {
    // Check if user has already completed onboarding
    const completed = localStorage.getItem(storageKey);
    if (!completed && steps.length > 0) {
      setIsActive(true);
    }
  }, [storageKey, steps.length]);

  useEffect(() => {
    if (!isActive || !steps[currentStep]) return;

    // Find and scroll to target element
    const target = document.querySelector(steps[currentStep].target);
    if (target) {
      setTargetElement(target);
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep, isActive, steps]);

  if (!isActive || !steps.length) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setIsActive(false);
    localStorage.setItem(storageKey, 'skipped');
    if (onSkip) onSkip();
  };

  const handleComplete = () => {
    setIsActive(false);
    localStorage.setItem(storageKey, 'completed');
    if (onComplete) onComplete();
  };

  const getTooltipPosition = () => {
    if (!targetElement) return { top: '50%', left: '50%' };

    const rect = targetElement.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    return {
      top: rect.bottom + scrollY + 20,
      left: rect.left + scrollX + rect.width / 2
    };
  };

  const position = getTooltipPosition();

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-40"
          onClick={handleSkip}
        />
      </AnimatePresence>

      {/* Highlight */}
      {targetElement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed z-50 pointer-events-none"
          style={{
            top: targetElement.getBoundingClientRect().top + window.scrollY - 4,
            left: targetElement.getBoundingClientRect().left + window.scrollX - 4,
            width: targetElement.offsetWidth + 8,
            height: targetElement.offsetHeight + 8,
            border: '4px solid #9333EA',
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
          }}
        />
      )}

      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed z-50 -translate-x-1/2"
        style={{
          top: position.top,
          left: position.left,
          maxWidth: '400px',
          width: '90%'
        }}
      >
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213e] border-3 border-purple-500 rounded-lg shadow-2xl p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="text-sm text-purple-400 mb-1">
                Step {currentStep + 1} of {steps.length}
              </div>
              <h3 className="text-xl font-bold text-white">{step.title}</h3>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <p className="text-gray-300 mb-6">{step.content}</p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                currentStep === 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              Previous
            </button>

            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Skip Tour
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

/**
 * Dashboard onboarding steps
 */
export const DASHBOARD_TOUR_STEPS = [
  {
    target: '.quest-input',
    title: 'Create Your First Quest',
    content: 'Transform your daily tasks into epic RPG quests! Type any task here and watch it become an adventure.'
  },
  {
    target: '.skill-tree-button',
    title: 'Unlock Skills',
    content: 'Earn skill points every 5 levels and unlock powerful abilities that boost your XP and enhance your story!'
  },
  {
    target: '.daily-bonus',
    title: 'Daily Login Bonus',
    content: 'Claim daily bonuses to earn gold and XP! Build streaks for bigger rewards.'
  },
  {
    target: '.profile-stats',
    title: 'Track Your Progress',
    content: 'Watch your level, XP, and streak grow as you complete quests and build habits!'
  }
];
