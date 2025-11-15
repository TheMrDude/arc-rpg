'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase-client';
import confetti from 'canvas-confetti';

const ARCHETYPES = [
  {
    value: 'warrior',
    name: 'Warrior',
    emoji: '⚔️',
    description: 'The path of discipline and unwavering consistency. Face each challenge head-on with courage.',
    color: '#FF6B6B',
  },
  {
    value: 'seeker',
    name: 'Seeker',
    emoji: '🔍',
    description: 'The journey of curiosity and endless exploration. Discover new territories and expand your horizons.',
    color: '#00D4FF',
  },
  {
    value: 'builder',
    name: 'Builder',
    emoji: '🏗️',
    description: 'The craft of systems and creation. Construct lasting foundations through methodical progress.',
    color: '#FFD93D',
  },
  {
    value: 'shadow',
    name: 'Shadow',
    emoji: '🌙',
    description: 'The realm of introspection and depth. Transform from within through self-awareness and reflection.',
    color: '#9333EA',
  },
  {
    value: 'sage',
    name: 'Sage',
    emoji: '📖',
    description: 'The pursuit of wisdom and understanding. Master life through knowledge and thoughtful action.',
    color: '#48BB78',
  },
];

export default function ArchetypeSwitcher({ currentArchetype, isPremium, onSwitch }) {
  const [show, setShow] = useState(false);
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [canSwitch, setCanSwitch] = useState(false);
  const [nextSwitchDate, setNextSwitchDate] = useState(null);
  const [daysUntilSwitch, setDaysUntilSwitch] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (show && isPremium) {
      checkSwitchEligibility();
    }
  }, [show, isPremium]);

  const checkSwitchEligibility = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/archetype/can-switch', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setCanSwitch(data.can_switch);
        if (data.next_switch_date) {
          setNextSwitchDate(new Date(data.next_switch_date));
          const now = new Date();
          const next = new Date(data.next_switch_date);
          const diffTime = Math.abs(next - now);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysUntilSwitch(diffDays);
        }
      }
    } catch (error) {
      console.error('Error checking switch eligibility:', error);
    }
  };

  const handleSwitchArchetype = async () => {
    if (!selectedArchetype || selectedArchetype.value === currentArchetype) {
      setShowConfirm(false);
      return;
    }

    setIsSwitching(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/archetype/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          new_archetype: selectedArchetype.value,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to switch archetype');
      }

      // Success confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [selectedArchetype.color, '#FFD93D', '#00D4FF'],
      });

      // Close modals and refresh
      setShowConfirm(false);
      setShow(false);

      // Call parent callback to reload profile
      if (onSwitch) {
        onSwitch();
      }
    } catch (error) {
      console.error('Error switching archetype:', error);
      alert(error.message || 'Failed to switch archetype');
    } finally {
      setIsSwitching(false);
    }
  };

  if (!isPremium) {
    return null;
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setShow(true)}
        className="px-4 py-2 bg-[#9333EA] hover:bg-[#7C3AED] text-white border-3 border-[#1A1A2E] rounded-lg font-bold uppercase text-sm tracking-wide transition-all shadow-[0_3px_0_#1A1A2E] hover:shadow-[0_5px_0_#1A1A2E] hover:-translate-y-0.5 active:shadow-[0_1px_0_#1A1A2E] active:translate-y-1"
      >
        🎭 Switch Archetype
      </button>

      {/* Archetype Selector Modal */}
      <AnimatePresence>
        {show && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
              onClick={() => setShow(false)}
            />

            <motion.div
              className="relative bg-[#1A1A2E] rounded-2xl shadow-[0_0_40px_rgba(147,51,234,0.5)] max-w-4xl w-full overflow-hidden border-3 border-[#9333EA]"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#9333EA] to-[#7C3AED] p-6 border-b-3 border-[#1A1A2E]">
                <h2
                  className="text-4xl font-black text-white text-center uppercase tracking-wide"
                  style={{ fontFamily: 'VT323, monospace' }}
                >
                  🎭 Choose Your Path
                </h2>
                <p className="text-purple-100 text-center mt-2">
                  {canSwitch
                    ? 'Transform your hero and embrace a new journey'
                    : `Next switch available in ${daysUntilSwitch} day${daysUntilSwitch !== 1 ? 's' : ''}`}
                </p>
              </div>

              {/* Archetypes Grid */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="grid md:grid-cols-2 gap-4">
                  {ARCHETYPES.map((archetype) => {
                    const isCurrent = archetype.value === currentArchetype;

                    return (
                      <motion.button
                        key={archetype.value}
                        onClick={() => {
                          if (canSwitch && !isCurrent) {
                            setSelectedArchetype(archetype);
                            setShowConfirm(true);
                          }
                        }}
                        disabled={!canSwitch && !isCurrent}
                        className={
                          'p-6 rounded-lg border-3 text-left transition-all relative overflow-hidden ' +
                          (isCurrent
                            ? `bg-gradient-to-br from-[${archetype.color}] to-[#1A1A2E] border-[${archetype.color}] shadow-[0_0_20px_${archetype.color}]`
                            : canSwitch
                            ? 'bg-[#0F3460] border-[#1A1A2E] hover:border-[#9333EA] hover:scale-105'
                            : 'bg-[#0F3460] border-gray-700 opacity-50 cursor-not-allowed')
                        }
                        whileHover={canSwitch && !isCurrent ? { scale: 1.05 } : {}}
                      >
                        {isCurrent && (
                          <div className="absolute top-3 right-3 px-3 py-1 bg-[#FFD93D] text-[#1A1A2E] rounded-full font-black text-xs uppercase">
                            ✓ Current
                          </div>
                        )}

                        <div className="text-5xl mb-3">{archetype.emoji}</div>

                        <h3
                          className="text-2xl font-black mb-2 uppercase"
                          style={{ color: archetype.color }}
                        >
                          {archetype.name}
                        </h3>

                        <p className="text-gray-300 text-sm leading-relaxed">
                          {archetype.description}
                        </p>

                        {!isCurrent && canSwitch && (
                          <div className="mt-4 text-[#9333EA] font-bold text-sm">
                            → Click to switch
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {!canSwitch && (
                  <div className="mt-6 p-4 bg-[#FF6B6B] bg-opacity-20 border-2 border-[#FF6B6B] rounded-lg">
                    <p className="text-white font-bold text-center">
                      ⏰ You can switch archetypes once every 7 days.
                      {nextSwitchDate && (
                        <span className="block mt-1 text-sm">
                          Next available: {nextSwitchDate.toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 bg-[#0F3460] border-t-3 border-[#1A1A2E]">
                <button
                  onClick={() => setShow(false)}
                  className="w-full py-3 px-6 bg-transparent border-2 border-gray-500 hover:border-gray-400 text-gray-400 hover:text-gray-300 font-bold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Confirmation Modal */}
        {showConfirm && selectedArchetype && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-90 backdrop-blur-md" />

            <motion.div
              className="relative bg-[#1A1A2E] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border-4 border-[#FFD93D]"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <div className="p-8 text-center">
                <div className="text-7xl mb-4">{selectedArchetype.emoji}</div>

                <h3 className="text-3xl font-black text-[#FFD93D] mb-4">
                  Become the {selectedArchetype.name}?
                </h3>

                <p className="text-white mb-2">
                  This will change your story tone and future quest transformations.
                </p>

                <p className="text-gray-400 text-sm mb-6">
                  You can switch again in 7 days.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={isSwitching}
                    className="flex-1 py-3 px-6 bg-transparent border-2 border-gray-500 hover:border-gray-400 text-gray-400 hover:text-gray-300 font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleSwitchArchetype}
                    disabled={isSwitching}
                    className={
                      'flex-1 py-3 px-6 rounded-lg font-black uppercase border-3 transition-all ' +
                      (isSwitching
                        ? 'bg-gray-600 border-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-[#9333EA] border-[#0F3460] text-white hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 shadow-[0_3px_0_#0F3460]')
                    }
                  >
                    {isSwitching ? 'Transforming...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
