'use client';

export default function ActiveEffects({ effects }) {
  if (!effects || effects.length === 0) return null;

  return (
    <div className="bg-white border-2 border-hero-blue/20 rounded-candy shadow-candy px-4 py-2 mb-4">
      <div className="flex flex-wrap gap-3">
        {effects.map((effect) => (
          <div key={effect.id} className="flex items-center gap-2 text-sm">
            <span>{effect.effect_type === 'double_xp' ? '🔥' : '⚡'}</span>
            <span className="text-hero-blue font-bold">
              {effect.effect_type === 'double_xp'
                ? `2x XP (${effect.quests_remaining} quest${effect.quests_remaining > 1 ? 's' : ''})`
                : `+${effect.effect_value} bonus XP (${effect.quests_remaining} quest${effect.quests_remaining > 1 ? 's' : ''})`
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
