/**
 * Sound Manager for HabitQuest
 *
 * Handles all audio playback with user preferences and performance optimization
 * Research shows Day One's sounds are "most effective use anywhere"
 */

type SoundName =
  | 'quest-complete'
  | 'level-up'
  | 'quest-accept'
  | 'streak-milestone'
  | 'button-click'
  | 'error'
  | 'whoosh';

interface SoundConfig {
  path: string;
  volume: number;
  preload: boolean;
}

const SOUND_CONFIG: Record<SoundName, SoundConfig> = {
  'quest-complete': {
    path: '/sounds/quest-complete.mp3',
    volume: 0.5,
    preload: true
  },
  'level-up': {
    path: '/sounds/level-up.mp3',
    volume: 0.6,
    preload: true
  },
  'quest-accept': {
    path: '/sounds/quest-accept.mp3',
    volume: 0.4,
    preload: true
  },
  'streak-milestone': {
    path: '/sounds/streak-milestone.mp3',
    volume: 0.6,
    preload: true
  },
  'button-click': {
    path: '/sounds/button-click.mp3',
    volume: 0.3,
    preload: true
  },
  'error': {
    path: '/sounds/error.mp3',
    volume: 0.4,
    preload: true
  },
  'whoosh': {
    path: '/sounds/whoosh.mp3',
    volume: 0.3,
    preload: false
  }
};

class SoundManager {
  private sounds: Map<SoundName, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 1.0;
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadPreferences();
    }
  }

  /**
   * Initialize sound manager and preload sounds
   * Call this after first user interaction
   */
  async initialize(): Promise<void> {
    if (this.initialized || typeof window === 'undefined') return;

    try {
      // Preload sounds that are marked for preloading
      for (const [name, config] of Object.entries(SOUND_CONFIG)) {
        if (config.preload) {
          this.loadSound(name as SoundName);
        }
      }

      this.initialized = true;
      console.log('SoundManager initialized');
    } catch (error) {
      console.error('Failed to initialize SoundManager:', error);
    }
  }

  /**
   * Load a single sound file
   */
  private loadSound(name: SoundName): void {
    if (this.sounds.has(name)) return;

    const config = SOUND_CONFIG[name];
    const audio = new Audio(config.path);
    audio.volume = config.volume * this.volume;
    audio.preload = 'auto';

    this.sounds.set(name, audio);
  }

  /**
   * Play a sound by name
   */
  play(soundName: SoundName): void {
    if (!this.enabled || typeof window === 'undefined') return;

    try {
      // Load sound if not already loaded
      if (!this.sounds.has(soundName)) {
        this.loadSound(soundName);
      }

      const audio = this.sounds.get(soundName);
      if (!audio) return;

      // Reset to beginning if already playing
      audio.currentTime = 0;

      // Play sound
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Autoplay was blocked, user hasn't interacted yet
          console.log('Audio play was blocked:', error.message);
        });
      }
    } catch (error) {
      console.error(`Failed to play sound ${soundName}:`, error);
    }
  }

  /**
   * Play sound with custom volume override
   */
  playWithVolume(soundName: SoundName, volumeOverride: number): void {
    const audio = this.sounds.get(soundName);
    if (!audio) {
      this.loadSound(soundName);
      return this.playWithVolume(soundName, volumeOverride);
    }

    const originalVolume = audio.volume;
    audio.volume = volumeOverride * this.volume;
    this.play(soundName);

    // Reset volume after playing
    setTimeout(() => {
      audio.volume = originalVolume;
    }, 100);
  }

  /**
   * Enable or disable all sounds
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.savePreferences();
  }

  /**
   * Get current enabled state
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set master volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));

    // Update volume for all loaded sounds
    for (const [name, audio] of this.sounds) {
      const config = SOUND_CONFIG[name];
      audio.volume = config.volume * this.volume;
    }

    this.savePreferences();
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedEnabled = localStorage.getItem('habitquest_sounds_enabled');
      const savedVolume = localStorage.getItem('habitquest_sounds_volume');

      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true';
      }

      if (savedVolume !== null) {
        this.volume = parseFloat(savedVolume);
      }
    } catch (error) {
      console.error('Failed to load sound preferences:', error);
    }
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('habitquest_sounds_enabled', String(this.enabled));
      localStorage.setItem('habitquest_sounds_volume', String(this.volume));
    } catch (error) {
      console.error('Failed to save sound preferences:', error);
    }
  }

  /**
   * Cleanup all audio resources
   */
  destroy(): void {
    for (const audio of this.sounds.values()) {
      audio.pause();
      audio.src = '';
    }
    this.sounds.clear();
    this.initialized = false;
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

// Export type for use in other files
export type { SoundName };
