'use client';

export default function CompactCharacterCard({ profile, creature, isPremium }) {
  if (!profile) return null;

  const xpInLevel = profile.xp % 100;
  const xpProgress = (xpInLevel / 100) * 100;
  const xpNeeded = (profile.level || 1) * 100;
  const isFounder = isPremium && profile.premium_since;

  return (
    <div className="bg-[#1A1A2E] border-3 border-[#00D4FF] rounded-lg p-4 mb-6 shadow-[0_0_20px_rgba(0,212,255,0.3)]">
      {/* Mobile: stack, Desktop: row */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        {/* Avatar */}
        {profile.archetype && (
          <div className="flex-shrink-0">
            <img
              src={`/images/archetypes/${profile.archetype}.png`}
              alt={profile.archetype}
              className="w-20 h-20 object-cover rounded-lg border-2 border-[#FFD93D] shadow-[0_0_12px_rgba(255,217,61,0.4)]"
            />
          </div>
        )}

        {/* Stats */}
        <div className="flex-1 min-w-0 w-full">
          {/* Row 1: Name + Level + Badges + Streak + Gold */}
          <div className="flex items-center justify-between flex-wrap gap-x-3 gap-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide text-[#FF6B6B]">
                {profile.archetype}
              </h1>
              <span className="text-sm font-black text-[#00D4FF]">
                LV {profile.level}
              </span>
              {isFounder && (
                <span className="px-1.5 py-0.5 border border-[#00D4FF] text-[#00D4FF] rounded text-[10px] font-black uppercase">
                  ⚡ Founder
                </span>
              )}
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

          {/* Row 2: XP Bar (full width, text below) */}
          <div className="mt-2">
            <div className="h-3 bg-[#0F3460] rounded-full overflow-hidden border border-[#1A1A2E]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${xpProgress}%`,
                  background: 'linear-gradient(90deg, #22d3ee, #f43f5e)',
                }}
              />
            </div>
            <p className="text-xs text-[#94a3b8] font-bold mt-1 text-center">
              {xpInLevel} / 100 XP
            </p>
          </div>

          {/* Row 3: Companion + Skill points */}
          <div className="flex items-center justify-between mt-1">
            {creature ? (
              <div className="flex items-center gap-2">
                {creature.image ? (
                  <img
                    src={creature.image}
                    alt={creature.name}
                    className="w-5 h-5 object-contain rounded"
                  />
                ) : (
                  <span className="text-sm">{creature.emoji}</span>
                )}
                <span className="text-xs text-[#E2E8F0] truncate">{creature.name}</span>
              </div>
            ) : <div />}
            {profile.skill_points > 0 && (
              <p className="text-xs text-[#FFD93D] font-black">
                💎 {profile.skill_points} Skill Pt{profile.skill_points > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
