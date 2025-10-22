'use client';

import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="max-w-6xl mx-auto px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6">ARC RPG</h1>
          <p className="text-2xl text-gray-300 mb-8">
            Turn your boring to-do list into an epic RPG adventure
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/signup')}
              className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black rounded-lg font-bold text-lg transition"
            >
              Start Free
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-lg transition"
            >
              Login
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-gray-800/50 p-8 rounded-xl backdrop-blur-sm">
            <div className="text-4xl mb-4">⚔️</div>
            <h3 className="text-xl font-bold mb-2">Choose Your Archetype</h3>
            <p className="text-gray-400">Warrior, Builder, Shadow, Sage, or Seeker - pick your path</p>
          </div>
          <div className="bg-gray-800/50 p-8 rounded-xl backdrop-blur-sm">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="text-xl font-bold mb-2">AI-Powered Quests</h3>
            <p className="text-gray-400">Claude transforms boring tasks into epic adventures</p>
          </div>
          <div className="bg-gray-800/50 p-8 rounded-xl backdrop-blur-sm">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-xl font-bold mb-2">Level Up</h3>
            <p className="text-gray-400">Gain XP, unlock skills, defeat boss battles</p>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/pricing')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition"
          >
            View Pricing
          </button>
        </div>
      </div>
    </div>
  );
}
