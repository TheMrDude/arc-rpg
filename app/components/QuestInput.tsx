'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { trackEvent } from '@/lib/analytics';

interface QuestInputProps {
  onTransform: (task: string) => void;
  loading: boolean;
}

export default function QuestInput({ onTransform, loading }: QuestInputProps) {
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
          className="w-full px-6 py-5 text-lg sm:text-xl bg-[#16213E] border-3 border-[#00D4FF] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#FF6B4A] focus:ring-4 focus:ring-[#FF6B4A]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontSize: '18px' }} // Prevent iOS zoom
        />

        {/* Character counter */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
          {charCount}/100
        </div>
      </div>

      {/* Error message */}
      {task.length > 0 && task.trim().length < 3 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-[#E74C3C] mt-2 ml-2"
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
          w-full mt-6 px-8 py-5 rounded-xl font-black text-xl uppercase tracking-wide
          transition-all duration-200 shadow-lg
          ${isValid && !loading
            ? 'bg-[#FF6B4A] hover:bg-[#FF5733] text-white shadow-[#FF6B4A]/50 cursor-pointer'
            : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
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

      {/* Helpful hint */}
      <p className="text-center text-sm text-gray-400 mt-4">
        Try: "do laundry" • "finish report" • "exercise for 30 minutes"
      </p>
    </motion.form>
  );
}
