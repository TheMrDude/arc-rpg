'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { trackEvent } from '@/lib/analytics';

interface QuestInputProps {
  onTransform: (task: string) => void;
  loading: boolean;
  remainingPreviews?: number;
}

export default function QuestInput({ onTransform, loading, remainingPreviews }: QuestInputProps) {
  const [task, setTask] = useState('');
  const [hasTyped, setHasTyped] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTask(value);

    if (!hasTyped && value.length > 0) {
      setHasTyped(true);
      trackEvent('quest_input_started', { length: value.length });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task.trim().length >= 3 && !loading) {
      onTransform(task.trim());
    }
  };

  const isValid = task.trim().length >= 3 && task.length <= 100;
  const charCount = task.length;

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="relative">
        <input
          type="text"
          value={task}
          onChange={handleChange}
          placeholder="What do you want to accomplish today?"
          disabled={loading}
          maxLength={100}
          aria-label="Enter your habit or task"
          className="kq-input w-full px-6 py-5 text-lg sm:text-xl focus:ring-4 focus:ring-coral/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontSize: '18px' }} // Prevent iOS zoom
        />

        {/* Character counter */}
        <div aria-live="polite" className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-navy/50">
          {charCount}/100
        </div>
      </div>

      {/* Error message */}
      {task.length > 0 && task.trim().length < 3 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          role="alert"
          className="text-sm text-coral mt-2 ml-2"
        >
          Give us a bit more detail!
        </motion.p>
      )}

      {/* Transform button */}
      <motion.button
        type="submit"
        disabled={!isValid || loading}
        whileHover={isValid && !loading ? { scale: 1.02 } : {}}
        whileTap={isValid && !loading ? { scale: 0.98 } : {}}
        className={`
          w-full mt-6
          ${isValid && !loading
            ? 'kq-btn kq-btn-gold text-xl cursor-pointer'
            : 'kq-btn text-xl bg-navy/10 text-navy/40 cursor-not-allowed opacity-50'
          }
        `}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Transforming...
          </span>
        ) : (
          '⚔️ Transform My Quest →'
        )}
      </motion.button>

      {/* Urgency message */}
      {remainingPreviews !== undefined && remainingPreviews <= 2 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-coral/12 border-2 border-coral rounded-candy"
        >
          <p className="text-center text-sm text-coral font-bold">
            {remainingPreviews === 0 ? (
              '🔥 No previews left today! Sign up to continue your adventure.'
            ) : remainingPreviews === 1 ? (
              '⚡ Only 1 preview left today! Make it count.'
            ) : (
              '⏰ Only 2 previews left today!'
            )}
          </p>
        </motion.div>
      )}

      {/* Helpful hint */}
      <p className="text-center text-sm text-navy/50 mt-4">
        Try: "do laundry" • "finish report" • "exercise for 30 minutes"
      </p>
    </motion.form>
  );
}
