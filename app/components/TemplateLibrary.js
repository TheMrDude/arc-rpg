'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase-client';
import confetti from 'canvas-confetti';

const CATEGORY_COLORS = {
  fitness: '#FF6B6B',
  work: '#00D4FF',
  learning: '#FFD93D',
  health: '#48BB78',
  creative: '#9333EA',
  productivity: '#F59E0B',
  mindfulness: '#EC4899',
  social: '#10B981',
};

function TemplateCard({ template, onUse }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#0F3460] p-5 rounded-lg border-2 border-[#1A1A2E] hover:border-[#00D4FF] transition-all cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-black uppercase"
              style={{
                backgroundColor: CATEGORY_COLORS[template.category] || '#00D4FF',
                color: '#1A1A2E',
              }}
            >
              {template.category}
            </span>
            {template.difficulty_level && (
              <span className="px-2 py-1 bg-[#1A1A2E] rounded text-xs font-bold text-gray-400">
                {template.difficulty_level}
              </span>
            )}
          </div>

          <h3 className="text-xl font-black text-[#FFD93D]">{template.name}</h3>
          {template.description && (
            <p className="text-sm text-gray-300 mt-1">{template.description}</p>
          )}
        </div>

        <div className="text-sm text-[#00D4FF] font-bold ml-4">
          {template.quests?.length || 0} quests
        </div>
      </div>

      {/* Quest Preview */}
      <AnimatePresence>
        {expanded && template.quests && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pt-4 border-t border-gray-700 space-y-2"
          >
            {template.quests.map((quest, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-[#1A1A2E] rounded border border-gray-700"
              >
                <span className="text-[#00D4FF] font-bold text-sm">#{index + 1}</span>
                <div className="flex-1">
                  <p className="text-white text-sm">{quest.text}</p>
                </div>
                <span className="px-2 py-1 bg-[#0F3460] rounded text-xs font-bold text-[#FFD93D] uppercase">
                  {quest.difficulty}
                </span>
              </div>
            ))}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onUse(template);
              }}
              className="w-full mt-4 py-3 px-6 bg-[#48BB78] hover:bg-[#38a169] text-white border-3 border-[#0F3460] rounded-lg font-black uppercase text-sm tracking-wide shadow-[0_3px_0_#0F3460] hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 transition-all"
            >
              ✨ Use This Template
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!expanded && (
        <div className="text-xs text-gray-400 mt-2">
          Click to expand and see quests
        </div>
      )}
    </motion.div>
  );
}

function UseTemplateModal({ template, show, onClose, onConfirm, archetype }) {
  const [selectedQuests, setSelectedQuests] = useState([]);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (show && template) {
      // Select all quests by default
      setSelectedQuests(template.quests.map((_, i) => i));
    }
  }, [show, template]);

  const toggleQuest = (index) => {
    if (selectedQuests.includes(index)) {
      setSelectedQuests(selectedQuests.filter((i) => i !== index));
    } else {
      setSelectedQuests([...selectedQuests, index]);
    }
  };

  const handleConfirm = async () => {
    if (selectedQuests.length === 0) return;

    setIsAdding(true);
    const questsToAdd = selectedQuests.map((i) => template.quests[i]);
    await onConfirm(questsToAdd);
    setIsAdding(false);
    onClose();
  };

  if (!show || !template) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          className="relative bg-[#1A1A2E] rounded-2xl shadow-[0_0_40px_rgba(0,212,255,0.3)] max-w-3xl w-full overflow-hidden border-3 border-[#00D4FF]"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0F3460] to-[#1A1A2E] p-6 border-b-3 border-[#00D4FF]">
            <h2 className="text-3xl font-black text-[#FFD93D] mb-2">{template.name}</h2>
            <p className="text-gray-300 text-sm">{template.description}</p>
          </div>

          {/* Quest Selection */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <p className="text-white font-bold mb-4">
              Select quests to add ({selectedQuests.length} selected):
            </p>

            <div className="space-y-3">
              {template.quests.map((quest, index) => (
                <label
                  key={index}
                  className={
                    'flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ' +
                    (selectedQuests.includes(index)
                      ? 'bg-[#00D4FF] bg-opacity-20 border-[#00D4FF]'
                      : 'bg-[#0F3460] border-gray-700 hover:border-[#00D4FF]')
                  }
                >
                  <input
                    type="checkbox"
                    checked={selectedQuests.includes(index)}
                    onChange={() => toggleQuest(index)}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <p className="text-white font-bold">{quest.text}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs px-2 py-1 bg-[#1A1A2E] rounded text-[#FFD93D] font-bold uppercase">
                        {quest.difficulty}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-[#0F3460] border-t-3 border-[#1A1A2E] flex gap-3">
            <button
              onClick={onClose}
              disabled={isAdding}
              className="flex-1 py-3 px-6 bg-transparent border-2 border-gray-500 hover:border-gray-400 text-gray-400 hover:text-gray-300 font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isAdding || selectedQuests.length === 0}
              className={
                'flex-1 py-3 px-6 rounded-lg font-black uppercase border-3 transition-all ' +
                (isAdding || selectedQuests.length === 0
                  ? 'bg-gray-600 border-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-[#48BB78] border-[#0F3460] text-white hover:shadow-[0_5px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_1px_0_#0F3460] active:translate-y-1 shadow-[0_3px_0_#0F3460]')
              }
            >
              {isAdding ? 'Adding...' : `Add ${selectedQuests.length} Quest${selectedQuests.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function TemplateLibrary({ isPremium, archetype, onQuestsAdded }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showUseModal, setShowUseModal] = useState(false);

  useEffect(() => {
    if (isPremium) {
      loadTemplates();
    }
  }, [isPremium]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/templates/list', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = (template) => {
    setSelectedTemplate(template);
    setShowUseModal(true);
  };

  const handleAddQuests = async (quests) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Transform and add each quest
      for (const quest of quests) {
        const xpValues = { easy: 10, medium: 25, hard: 50 };

        // Transform the quest text
        const transformResponse = await fetch('/api/transform-quest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            questText: quest.text,
            archetype,
            difficulty: quest.difficulty,
          }),
        });

        const transformData = await transformResponse.json();
        const transformedText = transformData.transformedText || quest.text;

        // Insert the quest
        await supabase.from('quests').insert({
          user_id: session.user.id,
          original_text: quest.text,
          transformed_text: transformedText,
          difficulty: quest.difficulty,
          xp_value: xpValues[quest.difficulty],
          completed: false,
        });
      }

      // Success confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD93D', '#00D4FF', '#48BB78'],
      });

      // Notify parent to reload quests
      if (onQuestsAdded) {
        onQuestsAdded();
      }
    } catch (error) {
      console.error('Error adding quests from template:', error);
      alert('Failed to add some quests. Please try again.');
    }
  };

  if (!isPremium) {
    return null;
  }

  const categories = ['all', ...new Set(templates.map((t) => t.category))];
  const filteredTemplates =
    selectedCategory === 'all'
      ? templates
      : templates.filter((t) => t.category === selectedCategory);

  if (loading) {
    return (
      <div className="bg-[#1A1A2E] border-3 border-[#FFD93D] rounded-lg p-8 text-center">
        <p className="text-white font-bold">Loading quest templates...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#1A1A2E] border-3 border-[#FFD93D] rounded-lg p-6 shadow-[0_0_20px_rgba(255,217,61,0.3)]">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-black text-[#FFD93D] uppercase tracking-wide mb-2">
            📚 Quest Templates
          </h2>
          <p className="text-gray-300 text-sm">
            Professional quest packs to clone and customize
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={
                'px-4 py-2 rounded-lg font-bold text-sm border-2 transition-all ' +
                (selectedCategory === category
                  ? 'bg-[#FFD93D] border-[#FFD93D] text-[#1A1A2E]'
                  : 'bg-[#0F3460] border-gray-600 text-gray-300 hover:border-[#FFD93D]')
              }
            >
              {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-7xl mb-4">📚</div>
            <h3 className="text-2xl font-black text-[#FFD93D] mb-2">
              No templates found
            </h3>
            <p className="text-gray-300">Try selecting a different category</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={handleUseTemplate}
              />
            ))}
          </div>
        )}
      </div>

      <UseTemplateModal
        template={selectedTemplate}
        show={showUseModal}
        onClose={() => setShowUseModal(false)}
        onConfirm={handleAddQuests}
        archetype={archetype}
      />
    </>
  );
}
