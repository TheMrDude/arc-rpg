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
    <div className="min-h-screen bg-gradient-to-br from-[#2C1810] via-[#3d2817] to-[#2C1810] p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black text-[#E8B44C] mb-2">
            Quest Log
          </h1>
          <div className="inline-block bg-[#2C1810] border-4 border-[#E8B44C] rounded-lg px-6 py-3">
            <p className="text-2xl font-bold text-[#E8B44C]">
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
                  bg-gradient-to-br from-[#D4943C] to-[#E8B44C]
                  rounded-2xl border-4 border-[#2C1810]
                  p-6 shadow-2xl
                  transition-all duration-300
                  ${isCompleted ? 'opacity-60 scale-95' : 'opacity-100 scale-100'}
                `}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-[#2C1810] mb-2">
                      {quest.title}
                    </h3>
                    <p className="text-[#2C1810] text-lg">
                      {quest.description}
                    </p>
                  </div>

                  {/* Difficulty Badge */}
                  <div className={`
                    px-3 py-1 rounded-lg font-bold text-sm uppercase
                    ${quest.difficulty === 'easy' ? 'bg-green-500 text-white' : ''}
                    ${quest.difficulty === 'medium' ? 'bg-yellow-500 text-[#2C1810]' : ''}
                    ${quest.difficulty === 'hard' ? 'bg-red-500 text-white' : ''}
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
            <div className="inline-block bg-green-500 text-white px-6 py-3 rounded-lg border-4 border-green-700 font-bold text-xl">
              🎉 {completedQuests.length} / {exampleQuests.length} Quests Completed!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
