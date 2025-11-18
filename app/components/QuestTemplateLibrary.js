'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function QuestTemplateLibrary({ profile }) {
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState({
    archetype: profile?.archetype || '',
    difficulty: '',
    category: ''
  });
  const supabase = createClient();

  useEffect(() => {
    loadTemplates();
    loadStats();
  }, [filter]);

  const loadTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.archetype) params.append('archetype', filter.archetype);
      if (filter.difficulty) params.append('difficulty', filter.difficulty);
      if (filter.category) params.append('category', filter.category);
      params.append('limit', '20');

      const response = await fetch(`/api/bulk-generate-quests?${params}`);
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('quest_templates')
        .select('archetype, difficulty, category');

      if (!error && data) {
        const archetypeCounts = {};
        const difficultyCounts = {};
        const categoryCounts = {};

        data.forEach(t => {
          archetypeCounts[t.archetype] = (archetypeCounts[t.archetype] || 0) + 1;
          difficultyCounts[t.difficulty] = (difficultyCounts[t.difficulty] || 0) + 1;
          categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
        });

        setStats({
          total: data.length,
          archetypes: archetypeCounts,
          difficulties: difficultyCounts,
          categories: categoryCounts
        });
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const generateBulkQuests = async (batchSize = 50) => {
    setGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/bulk-generate-quests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          batchSize: batchSize,
          archetype: null // Generate for all archetypes
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`🎉 Generated ${data.generated} quest templates!\n\n${JSON.stringify(data.breakdown, null, 2)}`);
        loadTemplates();
        loadStats();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Bulk generation failed:', err);
      alert('Failed to generate quest templates');
    } finally {
      setGenerating(false);
    }
  };

  const useTemplate = async (template) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Add quest to user's quest list
      const response = await fetch('/api/quests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          text: template.original_text,
          difficulty: template.difficulty,
          xp_value: template.xp_value
        })
      });

      if (response.ok) {
        // Increment used_count
        await supabase
          .from('quest_templates')
          .update({ used_count: template.used_count + 1 })
          .eq('id', template.id);

        alert('✅ Quest added to your active quests!');
      }
    } catch (err) {
      console.error('Failed to use template:', err);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-600';
      case 'medium': return 'bg-yellow-600';
      case 'hard': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213e] rounded-lg border-3 border-[#FFD93D] p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-black text-[#FFD93D] mb-2">📚 Quest Template Library</h2>
          <p className="text-gray-300">Pre-generated epic quests ready to use</p>
        </div>
        {profile?.is_admin && (
          <button
            onClick={() => generateBulkQuests(60)}
            disabled={generating}
            className="px-6 py-3 bg-[#FFD93D] hover:bg-[#FFC700] text-[#0F3460] border-3 border-[#0F3460] rounded-lg font-black uppercase tracking-wide shadow-lg disabled:opacity-50 transition-all hover:scale-105"
          >
            {generating ? '⚡ Generating...' : '⚡ Generate 60 Quests (Admin)'}
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="bg-[#0F3460]/50 rounded-lg p-4 mb-6 border-2 border-[#FFD93D]/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[#FFD93D] font-bold mb-2">Total Templates</p>
              <p className="text-white text-3xl font-black">{stats.total}</p>
            </div>
            <div>
              <p className="text-[#00D4FF] font-bold mb-2">By Difficulty</p>
              {Object.entries(stats.difficulties).map(([diff, count]) => (
                <p key={diff} className="text-white text-sm">
                  {diff}: <span className="font-bold">{count}</span>
                </p>
              ))}
            </div>
            <div>
              <p className="text-[#FF6B6B] font-bold mb-2">By Archetype</p>
              <div className="text-white text-sm max-h-20 overflow-y-auto">
                {Object.entries(stats.archetypes).map(([arch, count]) => (
                  <p key={arch}>
                    {arch}: <span className="font-bold">{count}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={filter.difficulty}
          onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
          className="px-4 py-2 bg-[#0F3460] text-white border-2 border-[#00D4FF] rounded-lg font-bold"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <select
          value={filter.archetype}
          onChange={(e) => setFilter({ ...filter, archetype: e.target.value })}
          className="px-4 py-2 bg-[#0F3460] text-white border-2 border-[#00D4FF] rounded-lg font-bold"
        >
          <option value="">All Archetypes</option>
          <option value="Warrior">Warrior</option>
          <option value="Mage">Mage</option>
          <option value="Rogue">Rogue</option>
          <option value="Cleric">Cleric</option>
          <option value="Bard">Bard</option>
          <option value="Ranger">Ranger</option>
        </select>

        <select
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          className="px-4 py-2 bg-[#0F3460] text-white border-2 border-[#00D4FF] rounded-lg font-bold"
        >
          <option value="">All Categories</option>
          <option value="productivity">Productivity</option>
          <option value="health">Health</option>
          <option value="learning">Learning</option>
          <option value="social">Social</option>
          <option value="creativity">Creativity</option>
          <option value="finance">Finance</option>
        </select>
      </div>

      {/* Template List */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-[#0F3460]/50 border-2 border-[#00D4FF]/30 rounded-lg p-4 hover:border-[#00D4FF] transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 ${getDifficultyColor(template.difficulty)} text-white text-xs font-black rounded-full uppercase`}>
                    {template.difficulty}
                  </span>
                  <span className="px-3 py-1 bg-purple-600 text-white text-xs font-black rounded-full">
                    {template.archetype}
                  </span>
                  <span className="px-3 py-1 bg-blue-600 text-white text-xs font-black rounded-full">
                    {template.category}
                  </span>
                  <span className="text-[#FFD93D] font-bold text-sm">
                    +{template.xp_value} XP
                  </span>
                </div>
                <p className="text-white font-bold mb-1">{template.original_text}</p>
                <p className="text-[#00D4FF] text-sm italic mb-2">{template.transformed_text}</p>
                {template.story_thread && (
                  <p className="text-gray-400 text-xs">Story: {template.story_thread}</p>
                )}
                <p className="text-gray-500 text-xs mt-1">Used {template.used_count} times</p>
              </div>
              <button
                onClick={() => useTemplate(template)}
                className="px-4 py-2 bg-[#FF6B6B] hover:bg-[#EE5A6F] text-white border-2 border-[#0F3460] rounded-lg font-black shadow-lg hover:scale-105 transition-all whitespace-nowrap"
              >
                Use Quest
              </button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-6xl mb-4">📖</p>
          <p className="text-xl mb-2">No templates yet</p>
          <p className="text-sm">Generate quest templates to build your library!</p>
        </div>
      )}
    </div>
  );
}
