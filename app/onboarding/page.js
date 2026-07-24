'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';



export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [questText, setQuestText] = useState('');
  const [transformedQuest, setTransformedQuest] = useState(null);
  const [guestQuests, setGuestQuests] = useState([]);
  const [totalXP, setTotalXP] = useState(0);
  const [isTransforming, setIsTransforming] = useState(false);
  const [error, setError] = useState(null);

  // Load guest quests from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('habitquest_guest_quests');
    if (saved) {
      const parsed = JSON.parse(saved);
      setGuestQuests(parsed.quests || []);
      setTotalXP(parsed.totalXP || 0);
    }
  }, []);

  // Save guest quests to localStorage
  const saveGuestQuests = (quests, xp) => {
    localStorage.setItem('habitquest_guest_quests', JSON.stringify({
      quests,
      totalXP: xp
    }));
  };

  // Transform mundane task to epic quest
  const transformQuest = async () => {
    if (!questText.trim()) {
      setError('Please enter a task to transform');
      return;
    }

    setIsTransforming(true);
    setError(null);

    try {
      const response = await fetch('/api/transform-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: questText,
          is_guest: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to transform quest');
      }

      const data = await response.json();
      setTransformedQuest(data);
      setStep(2);
    } catch (err) {
      setError('Failed to transform quest. Please try again.');
      console.error('Transform error:', err);
    } finally {
      setIsTransforming(false);
    }
  };

  // Accept the transformed quest
  const acceptQuest = () => {
    if (!transformedQuest) return;

    const newQuests = [...guestQuests, transformedQuest];
    const newTotalXP = totalXP + transformedQuest.xp_value;

    setGuestQuests(newQuests);
    setTotalXP(newTotalXP);
    saveGuestQuests(newQuests, newTotalXP);

    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#E8B44C', '#D4943C', '#FFD93D']
    });

    // Auto-advance to step 3 after 3 quests
    if (newQuests.length >= 3) {
      setTimeout(() => setStep(3), 1500);
    } else {
      // Reset for next quest
      setQuestText('');
      setTransformedQuest(null);
      setStep(1);
    }
  };

  // Try different words
  const tryAgain = () => {
    setTransformedQuest(null);
    setStep(1);
  };

  // Navigate to signup
  const handleSignup = () => {
    router.push('/signup?from=onboarding');
  };

  const getDifficultyStars = (difficulty) => {
    const stars = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
    return '⭐'.repeat(stars);
  };

  return (
    <div className="kidquest min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="kq-chip inline-block bg-white px-6 py-3 shadow-candy border-2 border-stone"
          >
            <p className="text-sm font-bold text-navy">
              {guestQuests.length} quest{guestQuests.length !== 1 ? 's' : ''} created • {totalXP} XP earned
            </p>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Input Quest */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="kq-card p-8 md:p-12"
            >
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="kq-display text-4xl md:text-5xl text-navy mb-4 text-center"
              >
                What do you want to accomplish today?
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-navy/60 mb-8 text-center"
              >
                Turn any mundane task into an epic quest
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <input
                  type="text"
                  value={questText}
                  onChange={(e) => setQuestText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && transformQuest()}
                  placeholder="e.g., clean kitchen"
                  className="kq-input w-full text-2xl p-6 mb-6"
                  autoFocus
                />

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-coral font-semibold mb-4 text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  onClick={transformQuest}
                  disabled={isTransforming || !questText.trim()}
                  className={`
                    kq-btn w-full py-5 px-8 text-2xl
                    ${isTransforming || !questText.trim()
                      ? 'bg-navy/10 text-navy/40 cursor-not-allowed'
                      : 'kq-btn-gold cursor-pointer'
                    }
                  `}
                >
                  {isTransforming ? (
                    <span className="flex items-center justify-center gap-3">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        ⚡
                      </motion.span>
                      Transforming...
                    </span>
                  ) : (
                    '✨ Transform into Quest'
                  )}
                </button>
              </motion.div>

              {/* Example Prompts */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8"
              >
                <p className="text-sm font-semibold text-navy/60 mb-3 text-center">
                  Try these examples:
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['clean kitchen', 'morning workout', 'finish report', 'call mom'].map((example) => (
                    <button
                      key={example}
                      onClick={() => setQuestText(example)}
                      className="kq-chip bg-gold/15 hover:bg-gold/25 text-navy font-semibold text-sm transition-colors px-4 py-2"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 2: Show Transformed Quest */}
          {step === 2 && transformedQuest && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="kq-card p-8 md:p-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="text-7xl text-center mb-6"
              >
                {transformedQuest.emoji}
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="kq-display text-4xl text-navy mb-6 text-center"
              >
                {transformedQuest.title}
              </motion.h2>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-coral/10 rounded-candy p-6 mb-6"
              >
                <p className="text-lg text-navy leading-relaxed italic">
                  {transformedQuest.description}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-6 mb-8"
              >
                <div className="bg-gold/15 border-2 border-gold rounded-candy px-6 py-3">
                  <p className="text-sm font-bold text-navy/70 mb-1">
                    XP Reward
                  </p>
                  <p className="text-3xl font-black text-navy">
                    +{transformedQuest.xp_value}
                  </p>
                </div>

                <div className="bg-purple/15 border-2 border-purple rounded-candy px-6 py-3">
                  <p className="text-sm font-bold text-navy/70 mb-1">
                    Difficulty
                  </p>
                  <p className="text-2xl">
                    {getDifficultyStars(transformedQuest.difficulty)}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3"
              >
                <button
                  onClick={acceptQuest}
                  className="kq-btn kq-btn-emerald w-full py-5 px-8 text-2xl"
                >
                  ⚔️ Accept This Quest
                </button>

                <button
                  onClick={tryAgain}
                  className="kq-btn kq-btn-ghost w-full py-4 px-6 text-lg"
                >
                  Try Different Words
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 3: Signup Prompt */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="kq-card p-8 md:p-12 text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 1, repeat: 3 }}
                className="text-8xl mb-6"
              >
                🎉
              </motion.div>

              <h2 className="kq-display text-5xl text-navy mb-4">
                You've Earned {totalXP} XP!
              </h2>

              <p className="text-2xl text-navy/70 mb-8">
                Save your progress and unlock even more features
              </p>

              <div className="bg-purple/10 rounded-candy p-8 mb-8">
                <h3 className="kq-display text-2xl text-navy mb-4">
                  Create a free account to unlock:
                </h3>

                <div className="space-y-3 text-left max-w-md mx-auto">
                  {[
                    '✨ Weekly Momentum meter, no streaks to lose',
                    '✨ Character progression and levels',
                    '✨ Weekly AI story chapters',
                    '✨ Cloud sync across all devices',
                    '✨ Achievement system',
                    '✨ Quest history and analytics'
                  ].map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 text-lg font-semibold text-navy"
                    >
                      <span>{benefit}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSignup}
                className="kq-btn kq-btn-gold w-full py-6 px-8 text-2xl mb-4"
              >
                🚀 Create Free Account
              </button>

              <p className="text-sm text-navy/60">
                Users who sign up after 3+ quests have <span className="font-bold text-purple">4x higher retention</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guest Quests List (always visible when quests exist) */}
        {guestQuests.length > 0 && step !== 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <h3 className="kq-display text-2xl text-navy mb-4 text-center">
              Your Quests ({guestQuests.length}/3)
            </h3>

            <div className="space-y-3">
              {guestQuests.map((quest, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="kq-card p-4 border-2 border-stone"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{quest.emoji}</span>
                    <div className="flex-1">
                      <h4 className="font-black text-navy">{quest.title}</h4>
                      <p className="text-sm text-navy/60">+{quest.xp_value} XP</p>
                    </div>
                    <span className="text-2xl">✅</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
