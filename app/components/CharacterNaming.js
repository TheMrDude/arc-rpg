'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface CharacterNamingProps {
  onComplete: (name) => void;
  onSkip?: () => void;
  archetype?;
  className?;
}

const ARCHETYPE_SUGGESTIONS = {
  warrior: ['The Bold', 'The Valiant', 'The Fierce', 'The Relentless'],
  seeker: ['The Curious', 'The Wise', 'The Wanderer', 'The Explorer'],
  builder: ['The Steadfast', 'The Architect', 'The Craftsman', 'The Creator'],
  sage: ['The Thoughtful', 'The Ancient', 'The Learned', 'The Mystic']
};

export default function CharacterNaming({
  onComplete,
  onSkip,
  archetype = 'adventurer',
  className = ''
}: CharacterNamingProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const suggestions = ARCHETYPE_SUGGESTIONS[archetype as keyof typeof ARCHETYPE_SUGGESTIONS] || [
    'The Determined',
    'The Brave',
    'The Noble',
    'The Swift'
  ];

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Please enter a name for your hero');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Name must be less than 50 characters');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onComplete(trimmedName);
    } catch (err) {
      setError('Failed to save name. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-2xl mx-auto ${className}`}
    >
      {/* Character Silhouette Background */}
      <div className="absolute inset-0 opacity-5 overflow-hidden rounded-3xl pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-[400px] text-center"
        >
          ⚔️
        </motion.div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="text-7xl mb-4">
            {archetype === 'warrior' && '⚔️'}
            {archetype === 'seeker' && '🔮'}
            {archetype === 'builder' && '🛠️'}
            {archetype === 'sage' && '📚'}
            {!['warrior', 'seeker', 'builder', 'sage'].includes(archetype) && '✨'}
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-3">
            Name Your Hero
          </h2>

          <p className="text-xl text-gray-600 max-w-lg mx-auto">
            This is how your character will be known in your weekly story chapters
          </p>
        </motion.div>

        {/* Name Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="The Determined One"
            maxLength={50}
            className={`
              w-full text-2xl md:text-3xl p-6 rounded-2xl text-center font-bold
              border-4 focus:outline-none transition-all
              ${error
                ? 'border-red-400 focus:border-red-500'
                : 'border-gray-300 focus:border-purple-500'
              }
            `}
            autoFocus
          />

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-600 font-semibold mt-2 text-center"
            >
              {error}
            </motion.p>
          )}

          <p className="text-sm text-gray-500 mt-2 text-center">
            {name.length}/50 characters
          </p>
        </motion.div>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <p className="text-sm font-semibold text-gray-600 mb-3 text-center">
            Need inspiration? Try one of these:
          </p>

          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setName(suggestion)}
                className="px-4 py-2 bg-purple-100 hover:bg-purple-200 rounded-lg text-purple-800 font-semibold text-sm transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 mb-6"
        >
          <p className="text-sm font-bold text-purple-900 mb-3 text-center">
            ✨ Why name your character?
          </p>

          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">•</span>
              <span>Your name appears in personalized weekly story chapters</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">•</span>
              <span>Creates emotional attachment to your journey (85% increase!)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">•</span>
              <span>Named characters receive richer, more immersive narratives</span>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`
              w-full py-5 px-8 rounded-2xl
              font-black text-xl uppercase tracking-wide
              border-4 transition-all duration-200
              ${isSubmitting
                ? 'bg-gray-300 border-gray-500 text-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-br from-purple-500 to-pink-500 border-purple-900 text-white hover:shadow-xl cursor-pointer'
              }
            `}
            style={{
              boxShadow: !isSubmitting ? '0 6px 0 #581c87' : 'none'
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
              '✨ Claim This Name'
            )}
          </button>

          {onSkip && (
            <button
              onClick={handleSkip}
              className="w-full py-3 px-6 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors"
            >
              Skip for Now
            </button>
          )}
        </motion.div>

        {onSkip && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xs text-gray-500 text-center mt-4"
          >
            You can always change your character's name later in settings
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Compact inline variant for settings or profile pages
 */
export function CharacterNamingCompact({
  currentName,
  onSave
}: {
  currentName?;
  onSave: (name) => Promise<void>;
}) {
  const [name, setName] = useState(currentName || '');
  const [isEditing, setIsEditing] = useState(!currentName);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSave(name);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing && currentName) {
    return (
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
        <div>
          <p className="text-sm font-semibold text-gray-600">Character Name</p>
          <p className="text-lg font-black text-gray-900">{currentName}</p>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600 transition-colors"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border-2 border-purple-300">
      <p className="text-sm font-semibold text-gray-600 mb-2">Character Name</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter character name"
          className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none"
        />
        <button
          onClick={handleSave}
          disabled={isSaving || !name.trim()}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
            isSaving || !name.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-500 text-white hover:bg-purple-600'
          }`}
        >
          {isSaving ? '...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
