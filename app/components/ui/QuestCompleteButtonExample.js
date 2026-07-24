'use client';

import { useState } from 'react';
import QuestCompleteButton from './QuestCompleteButton';

/**
 * Example usage of QuestCompleteButton component
 *
 * This demonstrates how to integrate the button into your quest system
 */
export default function QuestCompleteButtonExample() {
  const [completedQuests, setCompletedQuests] = useState([]);
  const [totalXP, setTotalXP] = useState(0);

  const handleQuestComplete = (questId, xpReward) => {
    console.log(`Quest ${questId} completed!`);

    // Add to completed quests
    setCompletedQuests(prev => [...prev, questId]);

    // Add XP
    setTotalXP(prev => prev + xpReward);

    // Here you would typically:
    // 1. Update the database via API call
    // 2. Update user profile
    // 3. Check for level ups
    // 4. Trigger any milestone celebrations

    // Example API call:
    // await fetch('/api/complete-quest', {
    //   method: 'POST',
    //   body: JSON.stringify({ questId, xpReward })
    // });
  };

  const exampleQuests = [
    {
      id: 'quest-1',
      title: 'Clean the Kitchen',
      description: 'Vanquish the chaos of dirty dishes',
      xpReward: 25,
      difficulty: 'easy'
    },
    {
      id: 'quest-2',
      title: 'Complete Morning Workout',
      description: 'Train your body and sharpen your mind',
      xpReward: 50,
      difficulty: 'medium'
    },
    {
      id: 'quest-3',
      title: 'Finish Project Presentation',
      description: 'Conquer the Dragon of Deadlines',
      xpReward: 100,
      difficulty: 'hard'
    }
  ];

  return (
    <div className="min-h-screen bg-cream p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="kq-display text-5xl font-black text-navy mb-2">
            Quest Log
          </h1>
          <div className="inline-block kq-card px-6 py-3">
            <p className="text-2xl font-bold text-hero-blue">
              Total XP: {totalXP}
            </p>
          </div>
        </div>

        {/* Quest Cards */}
        <div className="space-y-6">
          {exampleQuests.map(quest => {
            const isCompleted = completedQuests.includes(quest.id);

            return (
              <div
                key={quest.id}
                className={`
                  kq-card
                  p-6
                  transition-all duration-300
                  ${isCompleted ? 'opacity-60 scale-95' : 'opacity-100 scale-100'}
                `}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-navy mb-2">
                      {quest.title}
                    </h3>
                    <p className="text-navy/70 text-lg">
                      {quest.description}
                    </p>
                  </div>

                  {/* Difficulty Badge */}
                  <div className={`
                    kq-chip
                    px-3 py-1 font-bold text-sm
                    ${quest.difficulty === 'easy' ? 'bg-emerald/15 text-emerald' : ''}
                    ${quest.difficulty === 'medium' ? 'bg-gold/20 text-navy' : ''}
                    ${quest.difficulty === 'hard' ? 'bg-coral/15 text-coral' : ''}
                  `}>
                    {quest.difficulty}
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-end">
                  <QuestCompleteButton
                    onComplete={() => handleQuestComplete(quest.id, quest.xpReward)}
                    disabled={isCompleted}
                    questTitle={quest.title}
                    xpReward={quest.xpReward}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Completed Quests Counter */}
        {completedQuests.length > 0 && (
          <div className="mt-8 text-center">
            <div className="inline-block kq-btn kq-btn-emerald px-6 py-3 text-xl">
              🎉 {completedQuests.length} / {exampleQuests.length} Quests Completed!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
