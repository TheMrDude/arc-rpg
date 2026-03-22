'use client';

export default function FirstTimeEmptyState({ onTryQuest }) {
  return (
    <div className="text-center py-10 px-6">
      <div className="text-5xl mb-4">🗡️</div>
      <h3 className="text-xl font-black uppercase tracking-wide text-[#00D4FF] mb-3">
        Your adventure begins here!
      </h3>
      <p className="text-[#E2E8F0] mb-2 max-w-md mx-auto">
        Every great hero starts with a single quest.
        Type any daily task above and watch the AI
        transform it into an epic adventure.
      </p>
      <button
        onClick={onTryQuest}
        className="mt-4 px-6 py-3 bg-[#00D4FF] hover:bg-[#00BBE6] text-[#0F3460] border-3 border-[#0F3460] rounded-lg font-black uppercase text-sm tracking-wide shadow-[0_5px_0_#0F3460] hover:shadow-[0_7px_0_#0F3460] hover:-translate-y-0.5 active:shadow-[0_2px_0_#0F3460] active:translate-y-1 transition-all"
      >
        ✨ Try your first quest now!
      </button>
    </div>
  );
}
