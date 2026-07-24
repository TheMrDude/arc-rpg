'use client';

interface GlobalFooterProps {
  className?: string;
}

export default function GlobalFooter({ className = '' }: GlobalFooterProps) {
  return (
    <footer className={`mt-auto py-8 px-4 border-t border-stone ${className}`}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center text-navy/50 text-sm font-bold">
          <p>&copy; 2025-2026 HabitQuest. Turn real habits into an epic adventure.</p>
        </div>
      </div>
    </footer>
  );
}
