'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SelectArchetypePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedArchetype, setSelectedArchetype] = useState(null);

  const archetypes = [
    {
      id: 'warrior',
      name: 'Warrior',
      image: '/images/archetypes/warrior.png',
      description: 'Bold and action-oriented. Transform tasks into heroic battles and conquests.',
      style: 'Battle through challenges with courage and determination',
      traits: ['Courage', 'Action', 'Victory'],
    },
    {
      id: 'builder',
      name: 'Builder',
      image: '/images/archetypes/builder.png',
      description: 'Constructive and creative. Turn tasks into building projects and crafting endeavors.',
      style: 'Engineer solutions and construct your future',
      traits: ['Creation', 'Engineering', 'Progress'],
    },
    {
      id: 'shadow',
      name: 'Shadow',
      image: '/images/archetypes/shadow.png',
      description: 'Strategic and cunning. Approach tasks as stealth missions and strategic operations.',
      style: 'Navigate challenges with strategy and precision',
      traits: ['Strategy', 'Cunning', 'Precision'],
    },
    {
      id: 'sage',
      name: 'Sage',
      image: '/images/archetypes/sage.png',
      description: 'Wise and intellectual. Transform tasks into quests for knowledge and understanding.',
      style: 'Seek wisdom and enlightenment in every task',
      traits: ['Wisdom', 'Knowledge', 'Insight'],
    },
    {
      id: 'seeker',
      name: 'Seeker',
      image: '/images/archetypes/seeker.png',
      description: 'Curious and adventurous. Explore tasks as discovery adventures and expeditions.',
      style: 'Discover new horizons and uncharted territories',
      traits: ['Curiosity', 'Adventure', 'Discovery'],
    },
  ];

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Check if user already has an archetype
      const { data: profile } = await supabase
        .from('profiles')
        .select('archetype')
        .eq('id', user.id)
        .single();

      if (profile?.archetype) {
        // Already has archetype, go to dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectArchetype() {
    if (!selectedArchetype || saving) return;

    setSaving(true);
    try {
      // Use UPSERT to handle both insert and update cases
      // This works even if profile row doesn't exist yet
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            archetype: selectedArchetype
          },
          {
            onConflict: 'id',
            ignoreDuplicates: false
          }
        );

      if (error) {
        // If table doesn't exist, redirect to setup page
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.log('Tables not found, redirecting to setup...');
          alert('Database setup required. You will be redirected to the setup page.');
          router.push('/setup');
          return;
        }

        throw error;
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Error selecting archetype:', error);
      alert(`Failed to select archetype: ${error.message}\n\nPlease try again or contact support.`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] flex items-center justify-center">
        <div className="text-white text-xl font-black uppercase tracking-wide">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213e] to-[#0F3460] text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4 uppercase tracking-wide text-[#FF6B6B]">Choose Your Archetype</h1>
          <p className="text-xl text-[#00D4FF] mb-2 font-bold">
            Your archetype shapes how quests are narrated and influences your story
          </p>
          <p className="text-[#E2E8F0]">
            Don't worry - this affects style and flavor, not game mechanics!
          </p>
        </div>

        {/* Archetype Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {archetypes.map((archetype) => (
            <div
              key={archetype.id}
              onClick={() => setSelectedArchetype(archetype.id)}
              className={`rounded-lg p-6 cursor-pointer transition-all ${
                selectedArchetype === archetype.id
                  ? 'border-3 border-[#FFD93D] bg-[#1A1A2E] shadow-[0_0_30px_rgba(255,217,61,0.5)] scale-105'
                  : 'border-3 border-[#0F3460] bg-[#1A1A2E] hover:border-[#00D4FF] hover:scale-102'
              }`}
            >
              {/* Image */}
              <div className="flex justify-center mb-4">
                <img
                  src={archetype.image}
                  alt={archetype.name}
                  className="w-32 h-32 object-contain rounded-lg"
                />
              </div>

              {/* Name */}
              <h3 className="text-2xl font-black text-center mb-3 uppercase tracking-wide text-[#FF6B6B]">{archetype.name}</h3>

              {/* Description */}
              <p className="text-[#E2E8F0] text-center mb-4">{archetype.description}</p>

              {/* Style */}
              <div className="bg-[#0F3460] rounded-lg p-3 mb-4 border-2 border-[#1A1A2E]">
                <p className="text-sm text-[#FFD93D] italic text-center font-bold">
                  "{archetype.style}"
                </p>
              </div>

              {/* Traits */}
              <div className="flex justify-center gap-2 flex-wrap">
                {archetype.traits.map((trait) => (
                  <span
                    key={trait}
                    className="px-3 py-1 bg-[#00D4FF] text-[#1A1A2E] rounded-md text-xs font-black uppercase"
                  >
                    {trait}
                  </span>
                ))}
              </div>

              {/* Selected Indicator */}
              {selectedArchetype === archetype.id && (
                <div className="mt-4 text-center">
                  <span className="text-[#FFD93D] font-black uppercase tracking-wide">✓ Selected</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Confirm Button */}
        <div className="text-center">
          <button
            onClick={handleSelectArchetype}
            disabled={!selectedArchetype || saving}
            className={`px-12 py-4 rounded-lg font-black text-xl uppercase tracking-wide transition-all duration-100 ${
              selectedArchetype
                ? 'bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-3 border-[#0F3460] shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1'
                : 'bg-[#0F3460] text-[#1A1A2E] border-3 border-[#1A1A2E] cursor-not-allowed opacity-50'
            }`}
          >
            {saving ? 'Confirming...' : selectedArchetype ? `Begin as ${archetypes.find(a => a.id === selectedArchetype)?.name}` : 'Select an Archetype'}
          </button>
        </div>
      </div>
    </div>
  );
}
