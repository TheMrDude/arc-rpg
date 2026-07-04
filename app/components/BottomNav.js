'use client';

import { ClipboardList, Map as MapIcon, User, BookOpen } from 'lucide-react';

/**
 * Mobile-only bottom tab bar so the core loops are reachable with a thumb.
 * Hidden on md+ where the top nav and tab bar handle navigation.
 */
export default function BottomNav({ active, onQuests, onMap, onCharacter, onJournal }) {
  const items = [
    { key: 'quests', label: 'Quests', Icon: ClipboardList, onClick: onQuests },
    { key: 'map', label: 'Map', Icon: MapIcon, onClick: onMap },
    { key: 'character', label: 'Character', Icon: User, onClick: onCharacter },
    { key: 'journal', label: 'Journal', Icon: BookOpen, onClick: onJournal },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0F172A]/95 backdrop-blur border-t-2 border-[#1E293B]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {items.map(({ key, label, Icon, onClick }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={onClick}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors"
              style={{ color: isActive ? '#00D4FF' : '#64748b' }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-black uppercase tracking-wide">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
