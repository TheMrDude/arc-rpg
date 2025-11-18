'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const [userCount, setUserCount] = useState(1247);
  const [activeNow, setActiveNow] = useState(89);
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 });

  // Simulate live user counter (creates FOMO)
  useEffect(() => {
    const interval = setInterval(() => {
      setUserCount(prev => prev + Math.floor(Math.random() * 3));
      setActiveNow(prev => Math.max(50, prev + Math.floor(Math.random() * 10) - 4));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for founder's deal (scarcity)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) {
          seconds = 59;
          minutes--;
          if (minutes < 0) {
            minutes = 59;
            hours--;
            if (hours < 0) {
              hours = 23;
            }
          }
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const testimonials = [
    { name: "Sarah M.", text: "Lost 15 lbs by turning exercise into epic quests. I'm addicted!", level: 47 },
    { name: "Mike R.", text: "Finally kept a 90-day streak. This gamification actually works!", level: 62 },
    { name: "Alex T.", text: "Went from procrastinator to productivity beast in 30 days.", level: 38 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white overflow-hidden">
      {/* Floating particles background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-20 left-10 w-2 h-2 bg-[#FF5733] rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-[#7C3AED] rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-40 left-1/4 w-2 h-2 bg-[#10B981] rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 right-1/3 w-3 h-3 bg-[#F59E0B] rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      {/* Live Activity Bar (Social Proof) */}
      <div className="bg-gradient-to-r from-[#7C3AED] to-[#FF5733] py-3 px-4 text-center font-bold text-sm animate-fade-in">
        <span className="inline-block mr-2">🔥</span>
        <span className="animate-pulse">{activeNow} heroes online now</span>
        <span className="mx-4">•</span>
        <span>{userCount.toLocaleString()} quests completed today</span>
        <span className="mx-4">•</span>
        <span className="text-[#FCD34D]">⚡ FOUNDER'S DEAL ENDING IN {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-20 animate-slide-in-up">
          <h1 className="text-5xl sm:text-7xl font-black mb-6 uppercase tracking-wide">
            <span className="bg-gradient-to-r from-[#FF5733] to-[#7C3AED] bg-clip-text text-transparent">
              Stop Failing
            </span>
            <br />
            <span className="text-white">Start Conquering</span>
          </h1>

          <p className="text-xl sm:text-3xl mb-4 font-bold text-transparent bg-gradient-to-r from-[#10B981] to-[#3B82F6] bg-clip-text">
            Turn Your Boring To-Do List Into An Epic RPG Adventure
          </p>

          <p className="text-lg sm:text-xl mb-8 text-gray-300 max-w-3xl mx-auto">
            Join <span className="text-[#F59E0B] font-black">{userCount.toLocaleString()}+ achievers</span> who transformed their habits into legendary quests.
            AI-powered. Scientifically addictive. <span className="text-[#10B981] font-bold">Actually fun.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={() => router.push('/signup')}
              className="btn-retro btn-primary text-xl px-10 py-5 transform hover:scale-105"
            >
              🚀 Start Free Adventure
            </button>
            <button
              onClick={() => router.push('/pricing')}
              className="btn-retro btn-secondary text-xl px-10 py-5 transform hover:scale-105"
            >
              ⚡ Get Founder's Deal - $47
            </button>
          </div>

          <p className="text-sm text-gray-400">✓ No credit card required  ✓ 2-minute setup  ✓ Works on any device</p>
        </div>

        {/* Before/After Transformation */}
        <div className="grid md:grid-cols-2 gap-8 mb-20 max-w-5xl mx-auto">
          <div className="card-retro border-red-500 text-center p-8 opacity-70">
            <div className="text-6xl mb-4">😫</div>
            <h3 className="text-2xl font-black mb-4 text-red-400">BEFORE HABITQUEST</h3>
            <ul className="text-left space-y-3 text-gray-300">
              <li>❌ Boring to-do lists you never finish</li>
              <li>❌ Zero motivation to start tasks</li>
              <li>❌ Streaks die after 3 days max</li>
              <li>❌ Productivity apps gather dust</li>
              <li>❌ Feel guilty about wasted potential</li>
            </ul>
          </div>

          <div className="card-retro-success text-center p-8 transform hover:scale-105">
            <div className="text-6xl mb-4">🔥</div>
            <h3 className="text-2xl font-black mb-4 text-[#10B981]">AFTER HABITQUEST</h3>
            <ul className="text-left space-y-3 text-white font-semibold">
              <li>✅ Epic quests you're excited to crush</li>
              <li>✅ Dopamine rush from leveling up</li>
              <li>✅ 90+ day streaks feel effortless</li>
              <li>✅ Actually look forward to daily tasks</li>
              <li>✅ Become the hero of your own story</li>
            </ul>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <h2 className="text-4xl sm:text-5xl font-black text-center mb-12 uppercase">
            <span className="bg-gradient-to-r from-[#F59E0B] to-[#FF5733] bg-clip-text text-transparent">
              Your 3-Step Transformation
            </span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-retro-primary text-center p-8 transform hover:scale-105 animate-slide-in-up" style={{animationDelay: '0.1s'}}>
              <div className="text-6xl mb-4">⚔️</div>
              <div className="text-4xl font-black text-[#FF5733] mb-3">STEP 1</div>
              <h3 className="text-2xl font-black mb-3 uppercase">Choose Your Archetype</h3>
              <p className="text-gray-300">Warrior, Builder, Shadow, Sage, or Seeker. Your personality, your path.</p>
            </div>

            <div className="card-retro-secondary text-center p-8 transform hover:scale-105 animate-slide-in-up" style={{animationDelay: '0.2s'}}>
              <div className="text-6xl mb-4">✨</div>
              <div className="text-4xl font-black text-[#7C3AED] mb-3">STEP 2</div>
              <h3 className="text-2xl font-black mb-3 uppercase">AI Transforms Tasks</h3>
              <p className="text-gray-300">"Do laundry" becomes "Purify your battle garments at the Sacred Washery"</p>
            </div>

            <div className="card-retro-success text-center p-8 transform hover:scale-105 animate-slide-in-up" style={{animationDelay: '0.3s'}}>
              <div className="text-6xl mb-4">📈</div>
              <div className="text-4xl font-black text-[#10B981] mb-3">STEP 3</div>
              <h3 className="text-2xl font-black mb-3 uppercase">Level Up Your Life</h3>
              <p className="text-gray-300">Earn XP, unlock skills, defeat bosses, and become legendary.</p>
            </div>
          </div>
        </div>

        {/* Social Proof - Testimonials */}
        <div className="mb-20">
          <h2 className="text-4xl font-black text-center mb-12">
            HEROES ARE TALKING
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="card-retro p-6 animate-slide-in-up" style={{animationDelay: `${i * 0.1}s`}}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-black text-lg text-[#F59E0B]">{testimonial.name}</div>
                  <div className="text-sm bg-gradient-to-r from-[#7C3AED] to-[#FF5733] px-3 py-1 rounded-full font-black">
                    LVL {testimonial.level}
                  </div>
                </div>
                <p className="text-gray-300 italic">"{testimonial.text}"</p>
                <div className="mt-3 text-[#10B981] font-bold">⭐⭐⭐⭐⭐</div>
              </div>
            ))}
          </div>
        </div>

        {/* Free vs Premium Comparison (Strategic Friction) */}
        <div className="mb-20 max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black text-center mb-12">
            <span className="bg-gradient-to-r from-[#FF5733] to-[#7C3AED] bg-clip-text text-transparent">
              FREE IS GOOD. FOUNDER'S IS LEGENDARY.
            </span>
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Tier */}
            <div className="card-retro border-gray-500 p-8">
              <h3 className="text-3xl font-black mb-6 text-gray-400">FREE ADVENTURER</h3>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <span className="text-[#10B981] text-xl">✓</span>
                  <span>Basic quest transformation</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#10B981] text-xl">✓</span>
                  <span>5 archetypes to choose from</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#10B981] text-xl">✓</span>
                  <span>Level up to 50</span>
                </div>
                <div className="flex items-start gap-3 opacity-50">
                  <span className="text-red-500 text-xl">✗</span>
                  <span>No recurring quests</span>
                </div>
                <div className="flex items-start gap-3 opacity-50">
                  <span className="text-red-500 text-xl">✗</span>
                  <span>No skill trees</span>
                </div>
                <div className="flex items-start gap-3 opacity-50">
                  <span className="text-red-500 text-xl">✗</span>
                  <span>No seasonal events</span>
                </div>
                <div className="flex items-start gap-3 opacity-50">
                  <span className="text-red-500 text-xl">✗</span>
                  <span>No equipment boosts</span>
                </div>
                <div className="flex items-start gap-3 opacity-50">
                  <span className="text-red-500 text-xl">✗</span>
                  <span>No archetype switching</span>
                </div>
              </div>
              <button
                onClick={() => router.push('/signup')}
                className="w-full btn-retro bg-gray-600 hover:bg-gray-500 border-gray-700 text-white py-4"
              >
                Start Free
              </button>
            </div>

            {/* Premium Tier */}
            <div className="card-retro border-[#FF5733] p-8 relative transform hover:scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#FF5733] to-[#7C3AED] px-6 py-2 rounded-full font-black text-sm">
                🔥 BEST VALUE - LIMITED TIME
              </div>

              <h3 className="text-3xl font-black mb-6 bg-gradient-to-r from-[#FF5733] to-[#7C3AED] bg-clip-text text-transparent">
                FOUNDER'S LIFETIME
              </h3>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-[#FF5733]">$47</span>
                  <span className="text-gray-400 line-through text-xl">$297</span>
                </div>
                <div className="text-sm text-[#10B981] font-bold">ONE-TIME PAYMENT • LIFETIME ACCESS</div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <span className="text-[#10B981] text-xl font-black">✓</span>
                  <span className="font-semibold">Everything in Free, PLUS:</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#10B981] text-xl font-black">✓</span>
                  <span><strong>Recurring Quests</strong> - Automate daily/weekly habits</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#10B981] text-xl font-black">✓</span>
                  <span><strong>Skill Trees</strong> - Unlock powerful abilities</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#10B981] text-xl font-black">✓</span>
                  <span><strong>Equipment Shop</strong> - Boost XP gains by 50%</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#10B981] text-xl font-black">✓</span>
                  <span><strong>Archetype Switching</strong> - Change class anytime</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#10B981] text-xl font-black">✓</span>
                  <span><strong>Seasonal Events</strong> - Exclusive challenges & rewards</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#10B981] text-xl font-black">✓</span>
                  <span><strong>AI-Powered Journal</strong> - Transform reflections into epic stories</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#10B981] text-xl font-black">✓</span>
                  <span><strong>Premium Support</strong> - Priority help from the team</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#F59E0B] text-xl font-black">⚡</span>
                  <span className="text-[#F59E0B] font-black">All future features included FREE forever</span>
                </div>
              </div>

              <button
                onClick={() => router.push('/pricing')}
                className="w-full btn-retro btn-primary text-xl py-5 animate-pulse"
              >
                ⚡ Claim Founder's Deal - $47
              </button>

              <p className="text-center text-sm mt-4 text-gray-400">
                ⏰ Deal expires in {timeLeft.hours}h {timeLeft.minutes}m • Only 23 spots left
              </p>
            </div>
          </div>
        </div>

        {/* Risk Reversal */}
        <div className="max-w-4xl mx-auto mb-20 text-center">
          <h2 className="text-3xl font-black mb-6">ZERO RISK. ALL REWARD.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card-retro p-6">
              <div className="text-4xl mb-3">⚡</div>
              <div className="font-black mb-2">Instant Access</div>
              <p className="text-gray-300 text-sm">Start your adventure in 2 minutes</p>
            </div>
            <div className="card-retro p-6">
              <div className="text-4xl mb-3">🔒</div>
              <div className="font-black mb-2">Secure Payment</div>
              <p className="text-gray-300 text-sm">Stripe-powered, bank-level security</p>
            </div>
            <div className="card-retro p-6">
              <div className="text-4xl mb-3">💎</div>
              <div className="font-black mb-2">Lifetime Updates</div>
              <p className="text-gray-300 text-sm">All future features included FREE</p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mb-12 card-retro-primary p-12 max-w-4xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black mb-6">
            YOUR TRANSFORMATION STARTS NOW
          </h2>
          <p className="text-xl mb-8 text-gray-300">
            Join {userCount.toLocaleString()}+ heroes who stopped procrastinating and started conquering.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/signup')}
              className="btn-retro btn-primary text-2xl px-12 py-6 transform hover:scale-105"
            >
              🚀 Start Free Now
            </button>
            <button
              onClick={() => router.push('/pricing')}
              className="btn-retro btn-secondary text-2xl px-12 py-6 transform hover:scale-105 animate-pulse"
            >
              ⚡ Get Lifetime Deal - $47
            </button>
          </div>
          <p className="text-sm mt-6 text-gray-400">
            ⏰ Founder's deal expires in {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm border-t border-gray-700 pt-8">
          <p className="mb-4">
            <button onClick={() => router.push('/login')} className="text-[#3B82F6] hover:text-[#2563EB] font-bold">
              Already have an account? Login →
            </button>
          </p>
          <p>© 2024 HabitQuest. Transform your life, one epic quest at a time.</p>
        </div>
      </div>
    </div>
  );
}
