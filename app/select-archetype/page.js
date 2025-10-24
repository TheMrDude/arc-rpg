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
      const { error } = await supabase
        .from('profiles')
        .update({ archetype: selectedArchetype })
        .eq('id', user.id);

      if (error) throw error;

      router.push('/dashboard');
    } catch (error) {
      console.error('Error selecting archetype:', error);
      alert('Failed to select archetype. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Choose Your Archetype</h1>
          <p className="text-xl text-gray-300 mb-2">
            Your archetype shapes how quests are narrated and influences your story
          </p>
          <p className="text-gray-400">
            Don't worry - this affects style and flavor, not game mechanics!
          </p>
        </div>

        {/* Archetype Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {archetypes.map((archetype) => (
            <div
              key={archetype.id}
              onClick={() => setSelectedArchetype(archetype.id)}
              className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                selectedArchetype === archetype.id
                  ? 'border-yellow-500 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 scale-105'
                  : 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:scale-102'
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
              <h3 className="text-2xl font-bold text-center mb-3">{archetype.name}</h3>

              {/* Description */}
              <p className="text-gray-300 text-center mb-4">{archetype.description}</p>

              {/* Style */}
              <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-400 italic text-center">
                  "{archetype.style}"
                </p>
              </div>

              {/* Traits */}
              <div className="flex justify-center gap-2 flex-wrap">
                {archetype.traits.map((trait) => (
                  <span
                    key={trait}
                    className="px-3 py-1 bg-purple-600/50 rounded-full text-xs font-semibold"
                  >
                    {trait}
                  </span>
                ))}
              </div>

              {/* Selected Indicator */}
              {selectedArchetype === archetype.id && (
                <div className="mt-4 text-center">
                  <span className="text-yellow-400 font-bold">✓ Selected</span>
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
            className={`px-12 py-4 rounded-lg font-bold text-xl transition-all ${
              selectedArchetype
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? 'Confirming...' : selectedArchetype ? `Begin as ${archetypes.find(a => a.id === selectedArchetype)?.name}` : 'Select an Archetype'}
          </button>
        </div>
      </div>
    </div>
  );
}
