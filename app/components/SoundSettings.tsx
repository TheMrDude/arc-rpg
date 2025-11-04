'use client';

import { motion } from 'framer-motion';
import { useSound } from './SoundProvider';

export default function SoundSettings() {
  const { enabled, setEnabled, volume, setVolume, play } = useSound();

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    // Play a test sound
    if (enabled && newVolume > 0) {
      play('button-click');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200"
    >
      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl">🔊</span>
        <div>
          <h3 className="text-2xl font-black text-gray-900">
            Sound Effects
          </h3>
          <p className="text-sm text-gray-600">
            Control audio feedback and volume
          </p>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
          <div>
            <p className="font-bold text-gray-900 mb-1">
              Sound Effects
            </p>
            <p className="text-sm text-gray-600">
              {enabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>

          <motion.button
            onClick={() => setEnabled(!enabled)}
            className={`
              relative w-16 h-8 rounded-full transition-colors
              ${enabled ? 'bg-green-500' : 'bg-gray-300'}
            `}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
              animate={{
                x: enabled ? 36 : 4
              }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30
              }}
            />
          </motion.button>
        </div>
      </div>

      {/* Volume Slider */}
      {enabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-900">
                Volume
              </p>
              <p className="text-sm font-semibold text-gray-600">
                {Math.round(volume * 100)}%
              </p>
            </div>

            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                value={volume * 100}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value) / 100)}
                className="w-full h-2 bg-gray-300 rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-5
                          [&::-webkit-slider-thumb]:h-5
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-purple-500
                          [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-webkit-slider-thumb]:shadow-md
                          [&::-moz-range-thumb]:w-5
                          [&::-moz-range-thumb]:h-5
                          [&::-moz-range-thumb]:rounded-full
                          [&::-moz-range-thumb]:bg-purple-500
                          [&::-moz-range-thumb]:cursor-pointer
                          [&::-moz-range-thumb]:border-0
                          [&::-moz-range-thumb]:shadow-md"
                style={{
                  background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${volume * 100}%, #d1d5db ${volume * 100}%, #d1d5db 100%)`
                }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>🔈 Quiet</span>
              <span>🔊 Loud</span>
            </div>
          </div>

          {/* Test Sound Button */}
          <button
            onClick={() => play('quest-complete')}
            className="w-full mt-4 py-3 px-6 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold transition-colors border-2 border-purple-300"
          >
            🎵 Test Sound
          </button>
        </motion.div>
      )}

      {/* Sound Types Info */}
      <div className="mt-6 bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
        <p className="text-sm font-bold text-blue-900 mb-2">
          🎧 Sound Types
        </p>
        <div className="space-y-1 text-xs text-blue-800">
          <p>• Quest completion chimes</p>
          <p>• Level up fanfares</p>
          <p>• Button click feedback</p>
          <p>• Streak milestone celebrations</p>
          <p>• Gentle error notifications</p>
        </div>
      </div>
    </motion.div>
  );
}
