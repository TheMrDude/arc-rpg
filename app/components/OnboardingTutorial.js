'use client';

import { useState } from 'react';

export default function OnboardingTutorial({ profile, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to ARC RPG!",
      description: "Transform your boring to-do list into an epic adventure. Let me show you around!",
      highlight: null,
      position: "center"
    },
    {
      title: "Your Character",
      description: `You are a ${profile?.archetype?.toUpperCase()}. Your archetype influences how quests are narrated, making your tasks feel epic!`,
      highlight: "character",
      position: "top-left"
    },
    {
      title: "Create Your First Quest",
      description: "Type any task - like 'do laundry' or 'study for exam' - and watch our AI transform it into an epic quest!",
      highlight: "add-quest",
      position: "top"
    },
    {
      title: "Complete Quests to Level Up",
      description: "Check off quests to earn XP and Gold. Level up to unlock new abilities and equipment!",
      highlight: "quests",
      position: "bottom"
    },
    {
      title: "Build Your Streak",
      description: "Complete quests daily to build your streak and unlock comeback bonuses. Consistency is the key to victory!",
      highlight: "stats",
      position: "top"
    },
    {
      title: "You're Ready!",
      description: "Now go forth and conquer your tasks, adventurer. Your journey begins now!",
      highlight: null,
      position: "center"
    }
  ];

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" />

      {/* Tutorial Card */}
      <div className={`fixed z-[60] ${
        step.position === 'center'
          ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
          : step.position === 'top-left'
          ? 'top-32 left-8'
          : step.position === 'top'
          ? 'top-1/3 left-1/2 transform -translate-x-1/2'
          : step.position === 'bottom'
          ? 'bottom-32 left-1/2 transform -translate-x-1/2'
          : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
      } max-w-md w-full mx-4`}>
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-2xl p-6 border-2 border-yellow-400">
          {/* Progress Indicator */}
          <div className="flex gap-2 mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-all ${
                  index <= currentStep ? 'bg-yellow-400' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-3">{step.title}</h2>
            <p className="text-white/90 text-lg">{step.description}</p>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex-1 px-4 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 px-4 py-3 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg font-semibold transition"
            >
              {currentStep === steps.length - 1 ? "Let's Go!" : 'Next'}
            </button>
          </div>

          {/* Skip Option */}
          {currentStep < steps.length - 1 && (
            <button
              onClick={onSkip}
              className="w-full mt-3 text-white/70 hover:text-white text-sm transition"
            >
              Skip tutorial
            </button>
          )}
        </div>
      </div>

      {/* Highlight Overlays */}
      {step.highlight === 'character' && (
        <div className="fixed top-20 left-8 z-[55] pointer-events-none">
          <div className="w-96 h-40 border-4 border-yellow-400 rounded-xl animate-pulse" />
        </div>
      )}
      {step.highlight === 'stats' && (
        <div className="fixed top-32 left-8 z-[55] pointer-events-none">
          <div className="w-80 h-20 border-4 border-yellow-400 rounded-xl animate-pulse" />
        </div>
      )}
      {step.highlight === 'add-quest' && (
        <div className="fixed bottom-96 left-1/2 transform -translate-x-1/2 z-[55] pointer-events-none">
          <div className="w-[600px] h-24 border-4 border-yellow-400 rounded-xl animate-pulse" />
        </div>
      )}
      {step.highlight === 'quests' && (
        <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-[55] pointer-events-none">
          <div className="w-[600px] h-48 border-4 border-yellow-400 rounded-xl animate-pulse" />
        </div>
      )}
    </>
  );
}
