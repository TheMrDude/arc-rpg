'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAvailableQuestChains, getUserQuestChainProgress, startQuestChain, getDifficultyColor, getCategoryInfo } from '@/lib/questChains';

export default function QuestChainSelector({ userId, userLevel, onChainStarted }) {
  const [availableChains, setAvailableChains] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    loadChains();
  }, [userId, userLevel]);

  async function loadChains() {
    try {
      const [chains, progress] = await Promise.all([
        getAvailableQuestChains(userLevel),
        getUserQuestChainProgress(userId)
      ]);

      setAvailableChains(chains);
      setUserProgress(progress);
    } catch (error) {
      console.error('Error loading quest chains:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartChain(chainId) {
    setStarting(true);
    try {
      const result = await startQuestChain(userId, chainId);
      if (result.success) {
        if (onChainStarted) onChainStarted(chainId);
        await loadChains();
        setSelectedChain(null);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error starting chain:', error);
      alert('Failed to start quest chain');
    } finally {
      setStarting(false);
    }
  }

  const inProgressIds = userProgress.filter(p => !p.completed).map(p => p.chain_id);
  const completedIds = userProgress.filter(p => p.completed).map(p => p.chain_id);

  if (loading) {
    return <div className="text-[#E2E8F0]">Loading quest chains...</div>;
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableChains.map((chain, index) => {
          const inProgress = inProgressIds.includes(chain.id);
          const completed = completedIds.includes(chain.id);
          const categoryInfo = getCategoryInfo(chain.category);
          const difficultyColor = getDifficultyColor(chain.difficulty);

          return (
            <motion.div
              key={chain.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-gradient-to-br from-[#0F3460] to-[#1A1A2E] border-3 rounded-lg p-6 cursor-pointer transition-all ${
                completed
                  ? 'border-[#48BB78] opacity-75'
                  : inProgress
                  ? 'border-[#FFD93D] shadow-[0_0_20px_rgba(255,217,61,0.3)]'
                  : 'border-[#00D4FF] hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]'
              }`}
              onClick={() => !inProgress && !completed && setSelectedChain(chain)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{chain.icon}</span>
                  <div>
                    <h3 className="text-lg font-black text-[#FFD93D] uppercase">{chain.name}</h3>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span className="text-[#00D4FF]">{categoryInfo.icon} {categoryInfo.name}</span>
                      <span className={`font-bold ${difficultyColor}`}>{chain.difficulty.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                {completed && <span className="text-2xl">✅</span>}
                {inProgress && <span className="text-2xl">🔄</span>}
              </div>

              <p className="text-[#E2E8F0] text-sm mb-3">{chain.description}</p>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#E2E8F0]">{chain.total_steps} steps</span>
                <div className="flex gap-2">
                  <span className="text-[#FFD93D]">⚡ +{chain.completion_reward_xp} XP</span>
                  <span className="text-[#FFD93D]">💰 +{chain.completion_reward_gold} Gold</span>
                </div>
              </div>

              {inProgress && (
                <div className="mt-3 pt-3 border-t border-[#00D4FF]/30">
                  <span className="text-sm font-bold text-[#00D4FF]">In Progress - Continue in dashboard</span>
                </div>
              )}

              {completed && (
                <div className="mt-3 pt-3 border-t border-[#48BB78]/30">
                  <span className="text-sm font-bold text-[#48BB78]">✓ Completed!</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Chain Details Modal */}
      {selectedChain && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedChain(null)}
        >
          <motion.div
            className="bg-gradient-to-br from-[#1A1A2E] to-[#0F3460] border-4 border-[#FFD93D] rounded-xl p-8 max-w-lg w-full shadow-2xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-5xl">{selectedChain.icon}</span>
              <div>
                <h2 className="text-2xl font-black text-[#FFD93D] uppercase">{selectedChain.name}</h2>
                <span className={`text-sm font-bold ${getDifficultyColor(selectedChain.difficulty)}`}>
                  {selectedChain.difficulty.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="bg-black/30 rounded-lg p-4 mb-4 border-2 border-[#00D4FF]">
              <p className="text-[#E2E8F0] italic">"{selectedChain.lore_intro}"</p>
            </div>

            <p className="text-[#E2E8F0] mb-4">{selectedChain.description}</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-black/30 rounded p-3 border border-[#FFD93D]">
                <div className="text-xs text-[#E2E8F0] mb-1">Total Steps</div>
                <div className="text-xl font-black text-[#FFD93D]">{selectedChain.total_steps}</div>
              </div>
              <div className="bg-black/30 rounded p-3 border border-[#00D4FF]">
                <div className="text-xs text-[#E2E8F0] mb-1">Required Level</div>
                <div className="text-xl font-black text-[#00D4FF]">{selectedChain.unlocks_at_level}</div>
              </div>
              <div className="bg-black/30 rounded p-3 border border-[#48BB78]">
                <div className="text-xs text-[#E2E8F0] mb-1">XP Reward</div>
                <div className="text-xl font-black text-[#48BB78]">+{selectedChain.completion_reward_xp}</div>
              </div>
              <div className="bg-black/30 rounded p-3 border border-[#FFD93D]">
                <div className="text-xs text-[#E2E8F0] mb-1">Gold Reward</div>
                <div className="text-xl font-black text-[#FFD93D]">+{selectedChain.completion_reward_gold}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleStartChain(selectedChain.id)}
                disabled={starting}
                className="flex-1 bg-[#FFD93D] hover:bg-[#E6C335] text-[#1A1A2E] py-3 px-6 rounded-lg font-black uppercase tracking-wide border-3 border-[#0F3460] shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all disabled:opacity-50"
              >
                {starting ? 'Starting...' : 'Begin Quest Chain'}
              </button>
              <button
                onClick={() => setSelectedChain(null)}
                className="px-6 py-3 bg-[#0F3460] hover:bg-[#16213e] text-[#E2E8F0] rounded-lg font-bold uppercase tracking-wide border-2 border-[#1A1A2E] transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
