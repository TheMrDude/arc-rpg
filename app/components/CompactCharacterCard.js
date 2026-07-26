'use client';

export default function CompactCharacterCard({ profile, creature, isPremium }) {
  if (!profile) return null;

  const xpInLevel = profile.xp % 100;
  const xpProgress = (xpInLevel / 100) * 100;
  const xpNeeded = (profile.level || 1) * 100;

  return (
    <div className="kq-card p-4 mb-6">
      {/* Mobile: stack, Desktop: row */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        {/* Avatar */}
        {profile.archetype && (
          <div className="flex-shrink-0">
            <img
              src={`/images/archetypes/${profile.archetype}.png`}
              alt={profile.archetype}
              className="w-20 h-20 object-cover rounded-candy border-2 border-gold"
            />
          </div>
        )}

        {/* Stats */}
        <div className="flex-1 min-w-0 w-full">
          {/* Row 1: Name + Level + Badges + Streak + Gold */}
          <div className="flex items-center justify-between flex-wrap gap-x-3 gap-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="kq-display text-lg sm:text-xl font-black text-coral">
                {profile.archetype}
              </h1>
              <span className="text-sm font-black text-hero-blue">
                LV {profile.level}
              </span>
              {isPremium && (
                <span className="px-2 py-0.5 bg-gold text-navy rounded-full text-xs font-black uppercase">
                  PRO
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              {profile.current_streak > 0 && (
                <span className="text-coral font-black" title="Days active in a row">
                  🔥 {profile.current_streak}
                </span>
              )}
              <span className="text-gold font-black" title="Gold">
                💰 {(profile.gold || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Row 2: XP Bar (full width, text below) */}
          <div className="mt-2">
            <div className="h-3 bg-cream rounded-full overflow-hidden border border-stone">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${xpProgress}%`,
                  background: 'linear-gradient(90deg, #57D7F5, #FF7B6B)',
                }}
              />
            </div>
            <p className="text-xs text-navy/60 font-bold mt-1 text-center">
              {xpInLevel} / 100 XP
            </p>
          </div>

          {/* Row 3: Companion + Skill points */}
          <div className="flex items-center justify-between mt-1">
            {creature ? (
              <div className="flex items-center gap-2">
                {creature.portrait || creature.image ? (
                  <img
                    src={creature.portrait || creature.image}
                    alt={creature.name}
                    className="w-5 h-5 object-cover rounded"
                  />
                ) : (
                  <span className="text-sm">{creature.emoji}</span>
                )}
                <span className="text-xs text-navy/70 truncate">{creature.name}</span>
              </div>
            ) : <div />}
            {profile.skill_points > 0 && (
              <p className="text-xs text-gold font-black">
                💎 {profile.skill_points} Skill Pt{profile.skill_points > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
