'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { soundManager, SoundName } from '@/lib/audio/SoundManager';

interface SoundContextType {
  play: (sound: SoundName) => void;
  enabled;
  setEnabled: (enabled) => void;
  volume;
  setVolume: (volume) => void;
  isInitialized;
}

const SoundContext = createContext<SoundContextType | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(soundManager.isEnabled());
  const [volume, setVolumeState] = useState(soundManager.getVolume());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize sound manager on first user interaction
    const initializeOnInteraction = () => {
      soundManager.initialize().then(() => {
        setIsInitialized(true);
      });

      // Remove listeners after first interaction
      document.removeEventListener('click', initializeOnInteraction);
      document.removeEventListener('keydown', initializeOnInteraction);
    };

    document.addEventListener('click', initializeOnInteraction);
    document.addEventListener('keydown', initializeOnInteraction);

    return () => {
      document.removeEventListener('click', initializeOnInteraction);
      document.removeEventListener('keydown', initializeOnInteraction);
    };
  }, []);

  const play = (sound: SoundName) => {
    soundManager.play(sound);
  };

  const setEnabled = (newEnabled) => {
    soundManager.setEnabled(newEnabled);
    setEnabledState(newEnabled);
  };

  const setVolume = (newVolume) => {
    soundManager.setVolume(newVolume);
    setVolumeState(newVolume);
  };

  return (
    <SoundContext.Provider
      value={{
        play,
        enabled,
        setEnabled,
        volume,
        setVolume,
        isInitialized
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within SoundProvider');
  }
  return context;
}
