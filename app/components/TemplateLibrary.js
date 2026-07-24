'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase-client';
import confetti from 'canvas-confetti';

const CATEGORY_COLORS = {
  fitness: '#FF7B6B',
  work: '#4F7DF3',
  learning: '#FFC83D',
  health: '#3DD9A0',
  creative: '#B084F5',
  productivity: '#FFC83D',
  mindfulness: '#FF7B6B',
  social: '#3DD9A0',
};

function TemplateCard({ template, onUse }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="kq-card kq-card-hover p-5 cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{
                backgroundColor: CATEGORY_COLORS[template.category] || '#4F7DF3',
                color: '#243B5A',
              }}
            >
              {template.category}
            </span>
            {template.difficulty_level && (
              <span className="px-2 py-1 bg-cream rounded-full text-xs font-bold text-navy/60">
                {template.difficulty_level}
              </span>
            )}
          </div>

          <h3 className="kq-display text-xl font-black text-navy">{template.name}</h3>
          {template.description && (
            <p className="text-sm text-navy/60 mt-1">{template.description}</p>
          )}
        </div>

        <div className="text-sm text-hero-blue font-bold ml-4">
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
            className="mt-4 pt-4 border-t border-stone space-y-2"
          >
            {template.quests.map((quest, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-cream rounded-2xl border border-stone"
              >
                <span className="text-hero-blue font-bold text-sm">#{index + 1}</span>
                <div className="flex-1">
                  <p className="text-navy text-sm">{quest.text}</p>
                </div>
                <span className="px-2 py-1 bg-gold/20 rounded-full text-xs font-bold text-navy">
                  {quest.difficulty}
                </span>
              </div>
            ))}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onUse(template);
              }}
              className="kq-btn kq-btn-emerald w-full mt-4"
            >
              ✨ Use This Template
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!expanded && (
        <div className="text-xs text-navy/50 mt-2">
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
          className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          className="relative kq-card max-w-3xl w-full overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
        >
          {/* Header */}
          <div className="bg-cream p-6 border-b-2 border-stone">
            <h2 className="kq-display text-3xl font-black text-navy mb-2">{template.name}</h2>
            <p className="text-navy/60 text-sm">{template.description}</p>
          </div>

          {/* Quest Selection */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <p className="text-navy font-bold mb-4">
              Select quests to add ({selectedQuests.length} selected):
            </p>

            <div className="space-y-3">
              {template.quests.map((quest, index) => (
                <label
                  key={index}
                  className={
                    'flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ' +
                    (selectedQuests.includes(index)
                      ? 'bg-hero-blue/10 border-hero-blue'
                      : 'bg-cream border-stone hover:border-hero-blue')
                  }
                >
                  <input
                    type="checkbox"
                    checked={selectedQuests.includes(index)}
                    onChange={() => toggleQuest(index)}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <p className="text-navy font-bold">{quest.text}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs px-2 py-1 bg-gold/20 rounded-full text-navy font-bold">
                        {quest.difficulty}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-cream border-t-2 border-stone flex gap-3">
            <button
              onClick={onClose}
              disabled={isAdding}
              className="kq-btn kq-btn-ghost flex-1 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isAdding || selectedQuests.length === 0}
              className="kq-btn kq-btn-emerald flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
        colors: ['#FFC83D', '#4F7DF3', '#3DD9A0'],
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
      <div className="kq-card p-8 text-center">
        <p className="text-navy font-bold">Loading quest templates...</p>
      </div>
    );
  }

  return (
    <>
      <div className="kq-card p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="kq-display text-2xl font-black text-navy mb-2">
            📚 Quest Templates
          </h2>
          <p className="text-navy/60 text-sm">
            Ready-made quest packs to clone and customize
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={
                'px-4 py-2 rounded-full font-bold text-sm border-2 transition-all ' +
                (selectedCategory === category
                  ? 'bg-gold border-gold text-navy'
                  : 'bg-cream border-stone text-navy/60 hover:border-gold')
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
            <h3 className="kq-display text-2xl font-black text-navy mb-2">
              No templates found
            </h3>
            <p className="text-navy/60">Try selecting a different category</p>
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
