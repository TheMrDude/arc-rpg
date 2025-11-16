'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function JourneyMap({ profile, onRegionClick }) {
  const [mapRegions, setMapRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [hoveredRegion, setHoveredRegion] = useState(null);

  useEffect(() => {
    loadMapRegions();
  }, []);

  async function loadMapRegions() {
    try {
      const { data, error } = await supabase
        .from('map_regions')
        .select('*')
        .order('unlock_order', { ascending: true });

      if (error) throw error;
      setMapRegions(data || []);
    } catch (error) {
      console.error('Error loading map regions:', error);
    } finally {
      setLoading(false);
    }
  }

  const revealedRegions = profile?.map_regions_revealed || [];
  const currentRegion = profile?.current_map_region || 'starting_village';
  const progressPercentage = profile?.map_progress_percentage || 0;

  // Map SVG viewBox dimensions
  const mapWidth = 140;
  const mapHeight = 120;

  function isRegionRevealed(regionId) {
    return revealedRegions.includes(regionId);
  }

  function isRegionCurrent(regionId) {
    return regionId === currentRegion;
  }

  function getRegionColor(region) {
    const themeColors = {
      village: '#8B4513',
      forest: '#228B22',
      mountain: '#708090',
      cave: '#4B0082',
      library: '#DAA520',
      volcanic: '#DC143C',
      garden: '#32CD32',
      shadow: '#2F4F4F',
      celestial: '#4169E1',
      ethereal: '#9370DB'
    };
    return themeColors[region.aesthetic_theme] || '#666';
  }

  function getRegionIcon(theme) {
    const icons = {
      village: '🏡',
      forest: '🌲',
      mountain: '⛰️',
      cave: '🗻',
      library: '📚',
      volcanic: '🌋',
      garden: '🌸',
      shadow: '🌑',
      celestial: '⭐',
      ethereal: '✨'
    };
    return icons[theme] || '📍';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-amber-700">Loading your journey map...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Map Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-amber-900">Journey Progress</span>
          <span className="text-sm font-bold text-amber-700">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-amber-200 rounded-full h-3 border-2 border-amber-700 shadow-inner">
          <motion.div
            className="bg-gradient-to-r from-amber-600 to-amber-500 h-full rounded-full shadow-lg"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Ancient Map Container */}
      <div className="relative bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 rounded-lg border-4 border-amber-800 shadow-2xl overflow-hidden">
        {/* Parchment Texture Overlay */}
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.3'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px'
          }}
        />

        {/* Map SVG */}
        <svg
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          className="w-full h-auto min-h-[500px] relative"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
        >
          {/* Decorative Border */}
          <defs>
            <pattern id="borderPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 0 10 L 10 0 L 20 10 L 10 20 Z" fill="#8B4513" opacity="0.3" />
            </pattern>

            {/* Glow effect for current location */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Fog of war pattern */}
            <pattern id="fogPattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="3" fill="#999" opacity="0.3" />
              <circle cx="20" cy="15" r="2" fill="#888" opacity="0.4" />
              <circle cx="15" cy="25" r="2.5" fill="#777" opacity="0.35" />
            </pattern>
          </defs>

          {/* Path connecting revealed regions */}
          {mapRegions.map((region, index) => {
            if (index === 0 || !isRegionRevealed(region.id)) return null;
            const prevRegion = mapRegions[index - 1];
            if (!isRegionRevealed(prevRegion.id)) return null;

            return (
              <motion.path
                key={`path-${region.id}`}
                d={`M ${prevRegion.coordinates_x} ${prevRegion.coordinates_y} Q ${
                  (prevRegion.coordinates_x + region.coordinates_x) / 2
                } ${
                  (prevRegion.coordinates_y + region.coordinates_y) / 2 - 5
                } ${region.coordinates_x} ${region.coordinates_y}`}
                stroke="#8B4513"
                strokeWidth="0.5"
                fill="none"
                strokeDasharray="2,2"
                opacity="0.6"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: index * 0.2 }}
              />
            );
          })}

          {/* Map Regions */}
          {mapRegions.map((region, index) => {
            const revealed = isRegionRevealed(region.id);
            const isCurrent = isRegionCurrent(region.id);
            const isHovered = hoveredRegion === region.id;

            return (
              <g key={region.id}>
                {/* Region Circle */}
                <motion.circle
                  cx={region.coordinates_x}
                  cy={region.coordinates_y}
                  r={isCurrent ? 4 : 3}
                  fill={revealed ? getRegionColor(region) : '#999'}
                  opacity={revealed ? 1 : 0.4}
                  stroke={isCurrent ? '#FFD700' : '#4A3520'}
                  strokeWidth={isCurrent ? 1.5 : 0.8}
                  className="cursor-pointer transition-all"
                  filter={isCurrent ? 'url(#glow)' : 'none'}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: revealed ? 1 : 0.6,
                    opacity: revealed ? 1 : 0.4
                  }}
                  transition={{ delay: index * 0.15, duration: 0.5 }}
                  onMouseEnter={() => revealed && setHoveredRegion(region.id)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  onClick={() => revealed && setSelectedRegion(region)}
                />

                {/* Current Location Pulse */}
                {isCurrent && (
                  <motion.circle
                    cx={region.coordinates_x}
                    cy={region.coordinates_y}
                    r={4}
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth="0.5"
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{
                      scale: [1, 1.8, 1],
                      opacity: [0.8, 0, 0.8]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  />
                )}

                {/* Fog of War for unrevealed regions */}
                {!revealed && (
                  <circle
                    cx={region.coordinates_x}
                    cy={region.coordinates_y}
                    r={5}
                    fill="url(#fogPattern)"
                    opacity="0.8"
                  />
                )}

                {/* Region Label (only for revealed) */}
                {revealed && (
                  <motion.text
                    x={region.coordinates_x}
                    y={region.coordinates_y - 6}
                    textAnchor="middle"
                    className="text-[3px] font-semibold pointer-events-none select-none"
                    fill="#4A3520"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: isHovered ? 1 : 0.7, y: 0 }}
                    transition={{ delay: index * 0.15 + 0.3 }}
                  >
                    {region.name}
                  </motion.text>
                )}
              </g>
            );
          })}

          {/* Character Marker at Current Position */}
          {currentRegion && (
            <motion.g
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            >
              <circle
                cx={profile?.map_position_x || 10}
                cy={profile?.map_position_y || 10}
                r={2.5}
                fill="#DC143C"
                stroke="#FFD700"
                strokeWidth="0.5"
              />
              <motion.text
                x={profile?.map_position_x || 10}
                y={(profile?.map_position_y || 10) - 4}
                textAnchor="middle"
                className="text-[4px] font-bold"
                fill="#DC143C"
                animate={{ y: [(profile?.map_position_y || 10) - 4, (profile?.map_position_y || 10) - 5, (profile?.map_position_y || 10) - 4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                YOU
              </motion.text>
            </motion.g>
          )}
        </svg>

        {/* Decorative Corners */}
        <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-800 opacity-50" />
        <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-800 opacity-50" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-800 opacity-50" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-800 opacity-50" />
      </div>

      {/* Region Details Modal */}
      <AnimatePresence>
        {selectedRegion && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedRegion(null)}
          >
            <motion.div
              className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-lg border-4 border-amber-800 p-6 max-w-md w-full shadow-2xl"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-4xl">{getRegionIcon(selectedRegion.aesthetic_theme)}</span>
                  <div>
                    <h3 className="text-xl font-bold text-amber-900">{selectedRegion.name}</h3>
                    <span className="text-xs text-amber-700 uppercase tracking-wide">
                      {selectedRegion.region_type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRegion(null)}
                  className="text-amber-800 hover:text-amber-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              <p className="text-amber-800 mb-4 italic border-l-4 border-amber-600 pl-3">
                "{selectedRegion.lore_text}"
              </p>

              <p className="text-amber-900 mb-4">{selectedRegion.description}</p>

              <div className="bg-amber-100 rounded p-3 border-2 border-amber-300">
                <div className="text-sm text-amber-800 space-y-1">
                  <div className="flex justify-between">
                    <span>Required Level:</span>
                    <span className="font-bold">{selectedRegion.required_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Required Quests:</span>
                    <span className="font-bold">{selectedRegion.required_quests}</span>
                  </div>
                  {isRegionCurrent(selectedRegion.id) && (
                    <div className="mt-2 pt-2 border-t border-amber-400">
                      <span className="text-amber-700 font-bold flex items-center">
                        <span className="mr-2">📍</span>
                        Current Location
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="mt-4 bg-amber-50 rounded-lg border-2 border-amber-300 p-3">
        <h4 className="text-sm font-bold text-amber-900 mb-2">Map Legend</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-amber-800">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-600 border border-amber-900" />
            <span>Explored</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-400 border border-amber-900" />
            <span>Undiscovered</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-600 border-2 border-yellow-400" />
            <span>Your Location</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-purple-600 border border-amber-900" />
            <span>Milestone</span>
          </div>
        </div>
      </div>
    </div>
  );
}
