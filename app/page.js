'use client';

import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] text-white">
      <div className="max-w-6xl mx-auto px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-black mb-6 uppercase tracking-wide text-[#FF6B6B]">
            HabitQuest
          </h1>
          <p className="text-2xl text-[#00D4FF] mb-8 font-bold tracking-wide">
            Turn your boring to-do list into an epic RPG adventure
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/signup')}
              className="px-8 py-4 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-3 border-[#0F3460] rounded-lg font-black text-lg uppercase tracking-wide transition-all duration-100 shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1"
            >
              Start Free
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-4 bg-[#00D4FF] hover:bg-[#00B8E6] text-[#1A1A2E] border-3 border-[#0F3460] rounded-lg font-black text-lg uppercase tracking-wide transition-all duration-100 shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1"
            >
              Login
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-[#1A1A2E] p-8 rounded-lg border-3 border-[#FF6B6B] shadow-[0_0_20px_rgba(255,107,107,0.3)]">
            <div className="text-4xl mb-4">⚔️</div>
            <h3 className="text-xl font-black mb-2 uppercase text-[#FF6B6B]">Choose Your Archetype</h3>
            <p className="text-[#E2E8F0]">Warrior, Builder, Shadow, Sage, or Seeker - pick your path</p>
          </div>
          <div className="bg-[#1A1A2E] p-8 rounded-lg border-3 border-[#00D4FF] shadow-[0_0_20px_rgba(0,212,255,0.3)]">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="text-xl font-black mb-2 uppercase text-[#00D4FF]">AI-Powered Quests</h3>
            <p className="text-[#E2E8F0]">Claude transforms boring tasks into epic adventures</p>
          </div>
          <div className="bg-[#1A1A2E] p-8 rounded-lg border-3 border-[#FFD93D] shadow-[0_0_20px_rgba(255,217,61,0.3)]">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-xl font-black mb-2 uppercase text-[#FFD93D]">Level Up</h3>
            <p className="text-[#E2E8F0]">Gain XP, unlock skills, defeat boss battles</p>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/pricing')}
            className="px-6 py-3 bg-[#FFD93D] hover:bg-[#E6C335] text-[#1A1A2E] border-3 border-[#0F3460] rounded-lg font-black uppercase tracking-wide transition-all duration-100 shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1"
          >
            View Pricing
          </button>
        </div>
      </div>
    </div>
  );
}
