'use client';

export default function FirstTimeEmptyState({ onTryQuest }) {
  return (
    <div className="text-center py-10 px-6 kq-card">
      <div className="text-5xl mb-4">🗡️</div>
      <h3 className="kq-display text-xl text-hero-blue mb-3">
        Your adventure begins here!
      </h3>
      <p className="text-navy/70 mb-2 max-w-md mx-auto">
        Every great hero starts with a single quest.
        Type any daily task above and watch the AI
        transform it into an epic adventure.
      </p>
      <button
        onClick={onTryQuest}
        className="kq-btn kq-btn-gold mt-4"
      >
        ✨ Try your first quest now!
      </button>
    </div>
  );
}
