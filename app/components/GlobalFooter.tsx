'use client';

interface GlobalFooterProps {
  className?: string;
}

export default function GlobalFooter({ className = '' }: GlobalFooterProps) {
  return (
    <footer className={`mt-auto py-8 px-4 border-t border-gray-700/50 ${className}`}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center text-gray-400 text-sm">
          <p>&copy; 2025-2026 HabitQuest. Transform your life, one epic quest at a time.</p>
        </div>
      </div>
    </footer>
  );
}
