'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Props:

const MOOD_OPTIONS = [
  { value: 1, emoji: '😔', label: 'Struggling' },
  { value: 2, emoji: '😐', label: 'Okay' },
  { value: 3, emoji: '🙂', label: 'Good' },
  { value: 4, emoji: '😊', label: 'Great' },
  { value: 5, emoji: '🤩', label: 'Amazing' }
];

export default function ReflectionPrompt({
}) {
  show,
}) {
  onClose,
}) {
  questId,
}) {
  questTitle,
}) {
  onSubmit
}) {
  const [mood, setMood] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const charCount = reflection.length;
  const maxChars = 500;

  useEffect(() => {
    if (show) {
      // Reset state when modal opens
      setReflection('');
      setMood(3);
      setError('');
      setShowSuccess(false);
    }
  }, [show]);

  const handleSubmit = async () => {
    const trimmedReflection = reflection.trim();

    if (!trimmedReflection) {
      setError('Please write a brief reflection');
      return;
    }

    if (trimmedReflection.length > maxChars) {
      setError(`Reflection must be ${maxChars} characters or less`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(trimmedReflection, mood);
      setShowSuccess(true);

      // Close after showing success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reflection');
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleSkip}
          />

          {/* Modal Content */}
          <motion.div
            className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25
            }}
          >
            {showSuccess ? (
              // Success State
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-12 text-center"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ duration: 0.6 }}
                  className="text-8xl mb-4"
                >
                  ✨
                </motion.div>
                <h3 className="text-3xl font-black text-green-600 mb-2">
                  +10 XP Earned!
                </h3>
                <p className="text-gray-600 text-lg">
                  Thank you for reflecting
                </p>
              </motion.div>
            ) : (
              // Form State
              <>
                {/* Header */}
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="text-6xl mb-3"
                  >
                    🎉
                  </motion.div>
                  <h2 className="text-2xl font-black text-white mb-1">
                    Quest Complete!
                  </h2>
                  <p className="text-purple-100 font-semibold">
                    {questTitle}
                  </p>
                </div>

                {/* Body */}
                <div className="p-6">
                  {/* Prompt */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-4"
                  >
                    <p className="text-xl font-bold text-gray-800 mb-2 text-center">
                      How do you feel about this victory?
                    </p>
                    <p className="text-sm text-gray-600 text-center">
                      Optional • Earn +10 XP bonus for reflecting
                    </p>
                  </motion.div>

                  {/* Mood Selector */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-4"
                  >
                    <div className="flex justify-center gap-2 mb-2">
                      {MOOD_OPTIONS.map((option) => (
                        <motion.button
                          key={option.value}
                          onClick={() => setMood(option.value)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className={`
                            p-3 rounded-xl border-3 transition-all
                            ${mood === option.value
                              ? 'bg-purple-100 border-purple-500 scale-110'
                              : 'bg-gray-50 border-gray-300 hover:border-purple-300'
                            }
                          `}
                        >
                          <span className="text-3xl">{option.emoji}</span>
                        </motion.button>
                      ))}
                    </div>
                    <p className="text-center text-sm font-semibold text-gray-700">
                      {MOOD_OPTIONS.find(o => o.value === mood)?.label}
                    </p>
                  </motion.div>

                  {/* Reflection Textarea */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-4"
                  >
                    <textarea
                      value={reflection}
                      onChange={(e) => {
                        setReflection(e.target.value);
                        setError('');
                      }}
                      placeholder="I feel accomplished because..."
                      maxLength={maxChars}
                      rows={4}
                      className="w-full p-4 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none resize-none text-gray-800"
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p className={`text-xs ${charCount > maxChars - 50 ? 'text-red-600' : 'text-gray-500'}`}>
                        {charCount}/{maxChars} characters
                      </p>
                      {error && (
                        <p className="text-xs text-red-600 font-semibold">
                          {error}
                        </p>
                      )}
                    </div>
                  </motion.div>

                  {/* Info Box */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 mb-4"
                  >
                    <p className="text-xs text-blue-900 font-semibold text-center">
                      💡 Your reflections help personalize your weekly story chapters
                    </p>
                  </motion.div>

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="space-y-2"
                  >
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className={`
                        w-full py-4 px-6 rounded-xl
                        font-black text-lg uppercase
                        border-3 transition-all
                        ${isSubmitting
                          ? 'bg-gray-300 border-gray-500 text-gray-600 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-900 text-white hover:shadow-lg cursor-pointer'
                        }
                      `}
                      style={{
                        boxShadow: !isSubmitting ? '0 4px 0 #581c87' : 'none'
                      }}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            ⏳
                          </motion.span>
                          Saving...
                        </span>
                      ) : (
                        '✨ Save Reflection (+10 XP)'
                      )}
                    </button>

                    <button
                      onClick={handleSkip}
                      disabled={isSubmitting}
                      className="w-full py-3 px-6 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors disabled:opacity-50"
                    >
                      Skip for Now
                    </button>
                  </motion.div>

                  {/* Footer Note */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-xs text-gray-500 text-center mt-4"
                  >
                    Your reflections are private and help create your unique story
                  </motion.p>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
