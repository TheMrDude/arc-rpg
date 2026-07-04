/**
 * Sound Manager for HabitQuest
 *
 * Synthesizes short tones with the Web Audio API instead of loading sound
 * files, so celebration audio has no external asset dependency. Public API
 * (play/setEnabled/setVolume/isEnabled) is unchanged so SoundProvider and
 * SoundSettings don't need to know how a sound is produced.
 */

// Each tone is a sequence of { freq, start, duration, type, gain } notes
// played relative to the call to play(). Times are in seconds.
const TONES = {
  'quest-complete': {
    volume: 0.5,
    notes: [
      { freq: 660, start: 0, duration: 0.16, type: 'sine', gain: 0.8 },
      { freq: 880, start: 0.05, duration: 0.18, type: 'sine', gain: 0.6 },
    ],
  },
  'level-up': {
    volume: 0.6,
    notes: [
      { freq: 523.25, start: 0, duration: 0.16, type: 'triangle', gain: 0.7 },
      { freq: 659.25, start: 0.14, duration: 0.16, type: 'triangle', gain: 0.75 },
      { freq: 783.99, start: 0.28, duration: 0.16, type: 'triangle', gain: 0.8 },
      { freq: 1046.5, start: 0.42, duration: 0.36, type: 'triangle', gain: 0.9 },
    ],
  },
  'chest': {
    volume: 0.55,
    notes: [
      { freq: 784, start: 0, duration: 0.1, type: 'square', gain: 0.5 },
      { freq: 1174.66, start: 0.09, duration: 0.22, type: 'sine', gain: 0.7 },
    ],
  },
  'quest-accept': {
    volume: 0.4,
    notes: [{ freq: 587.33, start: 0, duration: 0.12, type: 'sine', gain: 0.7 }],
  },
  'streak-milestone': {
    volume: 0.6,
    notes: [
      { freq: 523.25, start: 0, duration: 0.15, type: 'triangle', gain: 0.7 },
      { freq: 659.25, start: 0.12, duration: 0.3, type: 'triangle', gain: 0.8 },
    ],
  },
  'button-click': {
    volume: 0.3,
    notes: [{ freq: 440, start: 0, duration: 0.04, type: 'sine', gain: 0.5 }],
  },
  'error': {
    volume: 0.4,
    notes: [
      { freq: 392, start: 0, duration: 0.1, type: 'sine', gain: 0.6 },
      { freq: 311.13, start: 0.08, duration: 0.12, type: 'sine', gain: 0.5 },
    ],
  },
  'whoosh': {
    volume: 0.3,
    notes: [{ freq: 300, start: 0, duration: 0.1, type: 'sawtooth', gain: 0.25 }],
  },
};

class SoundManager {
  constructor() {
    this.enabled = false; // off by default, per game-feel sprint spec
    this.volume = 1.0;
    this.initialized = false;
    this.audioContext = null;

    if (typeof window !== 'undefined') {
      this.loadPreferences();
    }
  }

  /**
   * Create the AudioContext. Must run after a user gesture (browsers
   * suspend audio contexts created before any interaction).
   */
  async initialize() {
    if (this.initialized || typeof window === 'undefined') return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioContext = new AudioContextClass();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize SoundManager:', error);
    }
  }

  /**
   * Play a synthesized tone by name.
   */
  play(soundName) {
    if (!this.enabled || typeof window === 'undefined') return;
    if (!this.audioContext) return;

    const tone = TONES[soundName];
    if (!tone) return;

    try {
      const now = this.audioContext.currentTime;

      for (const note of tone.notes) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = note.type;
        oscillator.frequency.setValueAtTime(note.freq, now + note.start);

        const peakGain = note.gain * tone.volume * this.volume;
        const startTime = now + note.start;
        const endTime = startTime + note.duration;

        // Quick attack, smooth release so nothing clicks or startles.
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start(startTime);
        oscillator.stop(endTime + 0.02);
      }
    } catch (error) {
      console.error(`Failed to play sound ${soundName}:`, error);
    }
  }

  /**
   * Enable or disable all sounds.
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.savePreferences();
  }

  isEnabled() {
    return this.enabled;
  }

  /**
   * Set master volume (0.0 to 1.0).
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.savePreferences();
  }

  getVolume() {
    return this.volume;
  }

  loadPreferences() {
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

  savePreferences() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('habitquest_sounds_enabled', String(this.enabled));
      localStorage.setItem('habitquest_sounds_volume', String(this.volume));
    } catch (error) {
      console.error('Failed to save sound preferences:', error);
    }
  }

  destroy() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.initialized = false;
  }
}

// Export singleton instance
export const soundManager = new SoundManager();
