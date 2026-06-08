'use client';

import { useState } from 'react';
import { WORLD_REGIONS, getUnlockStatus, getUnlockProgress } from '@/lib/world-regions';

// ─── REGION PANEL ─────────────────────────────────────────────────────────────

function RegionPanel({ region, locked, playerData, onClose }) {
  const progress = locked ? getUnlockProgress(region, playerData) : null;
  const pct = progress ? Math.round((progress.current / progress.required) * 100) : 0;

  return (
    <div
      className="flex flex-col gap-4 p-5 rounded-xl"
      style={{
        background: '#0f172a',
        border: '1px solid rgba(244,197,83,0.25)',
        minWidth: 0,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{region.icon}</span>
            <span
              className="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded"
              style={{
                background: locked ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                color: locked ? '#f87171' : '#4ade80',
                border: `1px solid ${locked ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
              }}
            >
              {locked ? '🔒 Locked' : '✓ Unlocked'}
            </span>
          </div>
          <h3 className="text-lg font-black text-white leading-tight">{region.name}</h3>
          <p className="text-xs italic" style={{ color: region.color }}>{region.subtitle}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors text-lg leading-none flex-shrink-0 mt-1"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Lore */}
      <div>
        {locked ? (
          <div className="relative">
            <p
              className="text-sm text-gray-300 leading-relaxed italic"
              style={{ filter: 'blur(4px)', userSelect: 'none' }}
            >
              {region.lore}
            </p>
            <div
              className="absolute inset-0 flex items-center justify-center rounded"
              style={{ background: 'rgba(15,23,42,0.6)' }}
            >
              <p className="text-xs text-gray-400 text-center px-2">
                Complete your quest to reveal the lore of this region.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-300 leading-relaxed italic">{region.lore}</p>
        )}
      </div>

      {/* Meta */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs uppercase tracking-wide">Theme</span>
          <span className="text-gray-300">{region.habitTheme}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs uppercase tracking-wide">Unlock</span>
          <span className="text-gray-300 text-xs">{region.unlockCondition}</span>
        </div>
      </div>

      {/* Progress bar for locked regions */}
      {locked && progress && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs" style={{ color: '#f4c553' }}>
              {progress.current} / {progress.required} {progress.label}
            </span>
          </div>
          <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(to right, #f4c553, #f43f5e)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WORLD MAP ────────────────────────────────────────────────────────────────

export default function WorldMap({ playerData, isDM }) {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [dmView, setDmView] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isRegionLocked = (region) => {
    if (isDM && dmView) return false;
    return !getUnlockStatus(region, playerData);
  };

  const handleRegionClick = (region) => {
    setSelectedRegion(prev => prev?.id === region.id ? null : region);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start">

      {/* ── MAP CONTAINER ───────────────────────────────────────────────── */}
      <div className="w-full md:flex-1 min-w-0">

        {/* DM Toggle */}
        {isDM && (
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setDmView(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all"
              style={{
                background: dmView ? 'rgba(244,197,83,0.2)' : 'rgba(255,255,255,0.05)',
                border: dmView ? '1px solid rgba(244,197,83,0.5)' : '1px solid rgba(255,255,255,0.1)',
                color: dmView ? '#f4c553' : '#9ca3af',
              }}
            >
              👁 {dmView ? 'DM View ON' : 'DM View OFF'}
            </button>
            {dmView && (
              <span
                className="text-xs font-black uppercase tracking-widest px-2 py-1 rounded"
                style={{ background: 'rgba(244,197,83,0.15)', color: '#f4c553', border: '1px solid rgba(244,197,83,0.3)' }}
              >
                DM ONLY
              </span>
            )}
          </div>
        )}

        {/* Map image + hotspot overlay */}
        {/* aspect-ratio ~3:4 matches a portrait fantasy map */}
        <div
          className="relative w-full overflow-hidden rounded-xl"
          style={{ aspectRatio: '3/4' }}
        >
          {/* Parchment placeholder (shown when image hasn't loaded or failed) */}
          {(imgError || true) && (
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse at 30% 20%, #2d1f0e 0%, #1a1208 40%, #0f0a05 100%)',
              }}
            >
              {/* Parchment texture overlay */}
              <div className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `
                    radial-gradient(ellipse at 70% 80%, rgba(139,90,43,0.4) 0%, transparent 60%),
                    radial-gradient(ellipse at 20% 60%, rgba(74,55,28,0.3) 0%, transparent 50%),
                    radial-gradient(ellipse at 50% 30%, rgba(101,68,32,0.2) 0%, transparent 60%)
                  `
                }}
              />
              {/* Map grid lines */}
              <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                {[10,20,30,40,50,60,70,80,90].map(n => (
                  <g key={n}>
                    <line x1={n} y1="0" x2={n} y2="100" stroke="#c8a96e" strokeWidth="0.3" />
                    <line x1="0" y1={n} x2="100" y2={n} stroke="#c8a96e" strokeWidth="0.3" />
                  </g>
                ))}
              </svg>
              {/* Compass rose */}
              <div className="absolute bottom-4 right-4 text-4xl opacity-30">🧭</div>
              {/* Placeholder label */}
              {imgError && (
                <div className="absolute top-2 left-0 right-0 flex justify-center">
                  <span className="text-xs text-amber-900/60 italic">
                    Drop world-map.png into /public/ to replace this placeholder
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actual map image — rendered on top of placeholder */}
          <img
            src="/world-map.png"
            alt="World of HabitQuest"
            className="absolute inset-0 w-full h-full object-fill"
            onLoad={() => setImgError(false)}
            onError={() => setImgError(true)}
            style={{ display: imgError ? 'none' : 'block' }}
          />

          {/* Hotspot + fog overlay — percentage positioned divs */}
          {WORLD_REGIONS.map((region) => {
            const { x, y, w, h } = region.hotspot;
            const locked = isRegionLocked(region);
            const hovered = hoveredRegion === region.id;
            const selected = selectedRegion?.id === region.id;

            return (
              <div
                key={region.id}
                className="absolute"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${w}%`,
                  height: `${h}%`,
                  cursor: 'pointer',
                  zIndex: selected || hovered ? 10 : 5,
                }}
                onClick={() => handleRegionClick(region)}
                onMouseEnter={() => setHoveredRegion(region.id)}
                onMouseLeave={() => setHoveredRegion(null)}
              >
                {/* Fog layer */}
                {locked && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                    style={{
                      background: 'rgba(0,0,0,0.75)',
                      borderRadius: '3px',
                      backdropFilter: 'blur(1px)',
                    }}
                  >
                    <span style={{ fontSize: 'clamp(10px, 1.8vw, 18px)', lineHeight: 1 }}>🔒</span>
                    <span
                      className="text-center leading-tight"
                      style={{
                        fontSize: 'clamp(5px, 0.9vw, 9px)',
                        color: '#6b7280',
                        maxWidth: '90%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {region.name}
                    </span>
                  </div>
                )}

                {/* Hover/selected highlight for unlocked regions */}
                {!locked && (
                  <div
                    className="absolute inset-0 transition-all duration-150"
                    style={{
                      borderRadius: '3px',
                      border: selected
                        ? '2px solid #f4c553'
                        : hovered
                        ? '1px solid rgba(244,197,83,0.6)'
                        : '1px solid transparent',
                      background: selected
                        ? 'rgba(244,197,83,0.18)'
                        : hovered
                        ? 'rgba(244,197,83,0.08)'
                        : 'transparent',
                      boxShadow: selected ? '0 0 12px rgba(244,197,83,0.3)' : 'none',
                    }}
                  />
                )}

                {/* Region name label on hover (unlocked only) */}
                {!locked && (hovered || selected) && (
                  <div
                    className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded text-white z-20 pointer-events-none"
                    style={{
                      fontSize: 'clamp(7px, 1vw, 11px)',
                      background: 'rgba(15,23,42,0.9)',
                      border: '1px solid rgba(244,197,83,0.3)',
                    }}
                  >
                    {region.icon} {region.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgba(244,197,83,0.3)', border: '1px solid #f4c553' }} />
            Unlocked region
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgba(0,0,0,0.72)' }} />
            Locked — click to see unlock condition
          </span>
          <span className="ml-auto text-gray-600 italic">
            LVL {playerData?.level || 1} · {playerData?.totalCheckins || 0} check-ins · {playerData?.longestStreak || 0}-day streak
          </span>
        </div>
      </div>

      {/* ── REGION PANEL (desktop: right side; mobile: below map) ─────── */}
      <div
        className="w-full md:w-72 flex-shrink-0"
        style={{ minHeight: selectedRegion ? 0 : undefined }}
      >
        {selectedRegion ? (
          <RegionPanel
            region={selectedRegion}
            locked={isRegionLocked(selectedRegion)}
            playerData={playerData}
            onClose={() => setSelectedRegion(null)}
          />
        ) : (
          <div
            className="rounded-xl p-5 text-center"
            style={{
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(244,197,83,0.1)',
            }}
          >
            <div className="text-3xl mb-2">🗺️</div>
            <p className="text-sm text-gray-500">
              Click any region on the map to explore it.
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Unlock new territories by building your habits.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
