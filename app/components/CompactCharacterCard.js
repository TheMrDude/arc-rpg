'use client';

export default function CompactCharacterCard({ profile, creature, isPremium }) {
  if (!profile) return null;

  const xpForLevel = (profile.level || 1) * 100;
  const xpProgress = ((profile.xp % 100) / 100) * 100;

  return (
    <div className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-4 mb-6 shadow-[0_0_20px_rgba(0,212,255,0.3)]">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        {profile.archetype && (
          <div className="flex-shrink-0">
            <img
              src={`/images/archetypes/${profile.archetype}.png`}
              alt={profile.archetype}
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border-2 border-[#FFD93D] shadow-[0_0_12px_rgba(255,217,61,0.4)]"
            />
          </div>
        )}

        {/* Stats */}
        <div className="flex-1 min-w-0">
          {/* Top row: Name + Level + Streak */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide text-[#FF6B6B] truncate">
                {profile.archetype}
              </h1>
              <span className="text-sm font-black text-[#00D4FF]">
                LV {profile.level}
              </span>
              {isPremium && (
                <span className="px-2 py-0.5 bg-[#FFD93D] text-[#1A1A2E] rounded text-xs font-black uppercase">
                  PRO
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              {profile.current_streak > 0 && (
                <span className="text-[#FF6B6B] font-black" title="Current streak">
                  🔥 {profile.current_streak}
                </span>
              )}
              <span className="text-[#FFD93D] font-black" title="Gold">
                💰 {(profile.gold || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* XP Bar */}
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-3 bg-[#0F3460] rounded-full overflow-hidden border border-[#1A1A2E]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${xpProgress}%`,
                    background: 'linear-gradient(90deg, #22d3ee, #f43f5e)',
                  }}
                />
              </div>
              <span className="text-xs text-[#94a3b8] font-bold whitespace-nowrap">
                {profile.xp % 100}/{100} XP
              </span>
            </div>
          </div>

          {/* Companion (inline, only if unlocked) */}
          {creature && (
            <div className="flex items-center gap-2 mt-2">
              {creature.image ? (
                <img
                  src={creature.image}
                  alt={creature.name}
                  className="w-6 h-6 object-contain rounded"
                />
              ) : (
                <span className="text-sm">{creature.emoji}</span>
              )}
              <span className="text-xs text-[#E2E8F0] truncate">{creature.name}</span>
            </div>
          )}

          {/* Skill points notification */}
          {profile.skill_points > 0 && (
            <p className="text-xs text-[#FFD93D] font-black mt-1">
              💎 {profile.skill_points} Skill Point{profile.skill_points > 1 ? 's' : ''} Available!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
