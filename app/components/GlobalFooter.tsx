'use client';

import ShareToSocial from './ShareToSocial';

interface GlobalFooterProps {
  className?: string;
}

export default function GlobalFooter({ className = '' }: GlobalFooterProps) {
  return (
    <footer className={`mt-auto py-8 px-4 border-t border-gray-700/50 ${className}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Share Section */}
        <div>
          <ShareToSocial
            content={{
              title: 'HabitQuest - Turn Your Life Into An Epic RPG! 🎮⚔️',
              description: 'Transform boring tasks into epic quests with AI-powered gamification. Join me on this legendary adventure!',
              hashtags: ['HabitQuest', 'Gamification', 'Productivity', 'RPG', 'AI'],
            }}
            title="📢 Share HabitQuest"
            compact={false}
          />
        </div>

        {/* Footer Text */}
        <div className="text-center text-gray-400 text-sm pt-4">
          <p>© 2024 HabitQuest. Transform your life, one epic quest at a time.</p>
        </div>
      </div>
    </footer>
  );
}
