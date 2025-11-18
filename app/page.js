'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 lg:mb-24"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 sm:mb-6 uppercase tracking-wide text-[#FF6B6B] drop-shadow-[0_0_15px_rgba(255,107,107,0.5)]">
              HabitQuest
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#00D4FF] mb-8 sm:mb-10 lg:mb-12 font-bold tracking-wide max-w-3xl mx-auto px-4"
          >
            Turn Your Life Into an Epic RPG Adventure
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-base sm:text-lg text-[#E2E8F0] mb-8 sm:mb-10 max-w-2xl mx-auto px-4"
          >
            Transform boring tasks into legendary quests. Level up your character. Unlock epic rewards.
            <span className="text-[#FFD93D] font-bold"> Your journey starts here.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4"
          >
            <button
              onClick={() => router.push('/signup')}
              className="w-full sm:w-auto px-8 py-4 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-3 border-[#0F3460] rounded-lg font-black text-base sm:text-lg uppercase tracking-wide transition-all duration-200 shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transform hover:scale-105"
            >
              🚀 Start Free Adventure
            </button>
            <button
              onClick={() => router.push('/login')}
              className="w-full sm:w-auto px-8 py-4 bg-transparent hover:bg-[#00D4FF]/10 text-[#00D4FF] border-3 border-[#00D4FF] rounded-lg font-black text-base sm:text-lg uppercase tracking-wide transition-all duration-200 shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:shadow-[0_0_25px_rgba(0,212,255,0.5)] transform hover:scale-105"
            >
              Login
            </button>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 sm:mt-12 flex flex-wrap justify-center items-center gap-6 sm:gap-8 text-sm sm:text-base text-[#E2E8F0]/80"
          >
            <div className="flex items-center gap-2">
              <span className="text-[#FFD93D] text-xl">⭐</span>
              <span className="font-bold">AI-Powered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#00D4FF] text-xl">🎮</span>
              <span className="font-bold">Gamified Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#FF6B6B] text-xl">🔥</span>
              <span className="font-bold">Daily Streaks</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-16 lg:mb-24 px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="bg-[#1A1A2E] p-6 sm:p-8 rounded-lg border-3 border-[#FF6B6B] shadow-[0_0_20px_rgba(255,107,107,0.3)] hover:shadow-[0_0_30px_rgba(255,107,107,0.5)] transition-all duration-300"
          >
            <div className="text-4xl sm:text-5xl mb-4">⚔️</div>
            <h3 className="text-lg sm:text-xl font-black mb-3 uppercase text-[#FF6B6B]">Choose Your Archetype</h3>
            <p className="text-sm sm:text-base text-[#E2E8F0] leading-relaxed">
              Warrior, Builder, Shadow, Sage, or Seeker - pick the path that defines your legend
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="bg-[#1A1A2E] p-6 sm:p-8 rounded-lg border-3 border-[#00D4FF] shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.5)] transition-all duration-300"
          >
            <div className="text-4xl sm:text-5xl mb-4">✨</div>
            <h3 className="text-lg sm:text-xl font-black mb-3 uppercase text-[#00D4FF]">AI-Powered Quests</h3>
            <p className="text-sm sm:text-base text-[#E2E8F0] leading-relaxed">
              Claude AI transforms your daily tasks into personalized epic adventures
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="bg-[#1A1A2E] p-6 sm:p-8 rounded-lg border-3 border-[#FFD93D] shadow-[0_0_20px_rgba(255,217,61,0.3)] hover:shadow-[0_0_30px_rgba(255,217,61,0.5)] transition-all duration-300 sm:col-span-2 lg:col-span-1"
          >
            <div className="text-4xl sm:text-5xl mb-4">📈</div>
            <h3 className="text-lg sm:text-xl font-black mb-3 uppercase text-[#FFD93D]">Level Up Your Life</h3>
            <p className="text-sm sm:text-base text-[#E2E8F0] leading-relaxed">
              Gain XP, unlock powerful skills, conquer boss battles, and watch your real progress soar
            </p>
          </motion.div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="text-center px-4"
        >
          <div className="bg-gradient-to-r from-[#1A1A2E] to-[#0F3460] p-8 sm:p-12 rounded-xl border-3 border-[#FFD93D] shadow-[0_0_30px_rgba(255,217,61,0.4)] max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-[#FFD93D] mb-4">
              Ready to Begin?
            </h2>
            <p className="text-base sm:text-lg text-[#E2E8F0] mb-8 max-w-xl mx-auto">
              Join heroes who've already transformed their lives. Premium features unlock even more power.
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="px-8 py-4 bg-[#FFD93D] hover:bg-[#E6C335] text-[#1A1A2E] border-3 border-[#0F3460] rounded-lg font-black text-base sm:text-lg uppercase tracking-wide transition-all duration-200 shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transform hover:scale-105"
            >
              ⚡ View Premium Features
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
