/**
 * Audio System Implementation for Power-Up Sound Effects
 * Story 4.2, Task 6: Audio feedback for power-up events
 */
import { PowerUpType } from '../entities/PowerUp';

// Audio event types
export enum AudioEvent {
  PowerUpCollect = 'powerup_collect',
  PowerUpActivate = 'powerup_activate',
  PowerUpExpire = 'powerup_expire',
  PowerUpStack = 'powerup_stack',
  MultiBallSplit = 'multiball_split',
  PaddleResize = 'paddle_resize',
  SpeedChange = 'speed_change'
}

// Audio configuration
export interface AudioConfig {
  masterVolume: number;
  sfxVolume: number;
  enableSpatialAudio: boolean;
  audioContext?: AudioContext;
  maxSimultaneousSounds: number;
}

// Sound effect definition
export interface SoundEffect {
  id: string;
  event: AudioEvent;
  powerUpType?: PowerUpType;
  variant?: string;
  frequency: number;
  duration: number;
  volume: number;
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';
  envelope?: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

/**
 * AudioSystem Class
 * Manages procedural audio generation for power-up events
 */
export class AudioSystem {
  private audioContext: AudioContext;
  private config: AudioConfig;
  private activeSounds: Map<string, { gain: GainNode; oscillator: OscillatorNode }> = new Map();
  private soundQueue: Array<{ effect: SoundEffect; time: number }> = [];
  private isInitialized: boolean = false;

  // Default sound effects library
  private static readonly SOUND_LIBRARY: { [event in AudioEvent]: Partial<SoundEffect> } = {
    [AudioEvent.PowerUpCollect]: {
      frequency: 800,
      duration: 0.3,
      volume: 0.6,
      waveform: 'sine',
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 }
    },
    [AudioEvent.PowerUpActivate]: {
      frequency: 440,
      duration: 0.5,
      volume: 0.8,
      waveform: 'square',
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.25 }
    },
    [AudioEvent.PowerUpExpire]: {
      frequency: 200,
      duration: 0.8,
      volume: 0.4,
      waveform: 'sawtooth',
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.2, release: 0.4 }
    },
    [AudioEvent.PowerUpStack]: {
      frequency: 600,
      duration: 0.2,
      volume: 0.5,
      waveform: 'triangle',
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.8, release: 0.15 }
    },
    [AudioEvent.MultiBallSplit]: {
      frequency: 1000,
      duration: 0.4,
      volume: 0.7,
      waveform: 'sine',
      envelope: { attack: 0.02, decay: 0.15, sustain: 0.4, release: 0.25 }
    },
    [AudioEvent.PaddleResize]: {
      frequency: 300,
      duration: 0.6,
      volume: 0.6,
      waveform: 'square',
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.6, release: 0.1 }
    },
    [AudioEvent.SpeedChange]: {
      frequency: 500,
      duration: 0.3,
      volume: 0.5,
      waveform: 'triangle',
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.18 }
    }
  };

  constructor(config?: Partial<AudioConfig>) {
    this.config = {
      masterVolume: 0.7,
      sfxVolume: 0.8,
      enableSpatialAudio: false,
      maxSimultaneousSounds: 8,
      ...config
    };

    // Use provided AudioContext or create new one
    this.audioContext = this.config.audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  /**
   * Initialize the audio system
   */
  public async initialize(): Promise<void> {
    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isInitialized = true;
      console.log('AudioSystem: Initialized successfully');

    } catch (error) {
      console.error('AudioSystem: Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Play a power-up sound effect
   */
  public playPowerUpSound(
    event: AudioEvent,
    powerUpType?: PowerUpType,
    variant?: string,
    position?: { x: number; y: number }
  ): void {
    if (!this.isInitialized) {
      console.warn('AudioSystem: Not initialized, sound not played');
      return;
    }

    try {
      const effect = this.createSoundEffect(event, powerUpType, variant);
      this.playSound(effect, position);

    } catch (error) {
      console.error('AudioSystem: Failed to play sound:', error);
    }
  }

  /**
   * Create a sound effect definition
   */
  private createSoundEffect(
    event: AudioEvent,
    powerUpType?: PowerUpType,
    variant?: string
  ): SoundEffect {
    const base = AudioSystem.SOUND_LIBRARY[event];
    let modifications = {};

    // Apply power-up specific modifications
    if (powerUpType) {
      modifications = this.getPowerUpAudioModifications(powerUpType, variant);
    }

    return {
      id: `${event}_${powerUpType || 'generic'}_${Date.now()}`,
      event,
      powerUpType,
      variant,
      frequency: base.frequency || 440,
      duration: base.duration || 0.5,
      volume: base.volume || 0.5,
      waveform: base.waveform || 'sine',
      envelope: base.envelope || { attack: 0.1, decay: 0.1, sustain: 0.8, release: 0.2 },
      ...modifications
    };
  }

  /**
   * Get audio modifications for specific power-up types
   */
  private getPowerUpAudioModifications(powerUpType: PowerUpType, variant?: string): Partial<SoundEffect> {
    const modifications: { [type in PowerUpType]: Partial<SoundEffect> } = {
      [PowerUpType.MultiBall]: {
        frequency: 1200,
        waveform: 'sine',
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3 }
      },
      [PowerUpType.PaddleSize]: {
        frequency: variant === 'large' ? 200 : 400,
        waveform: 'square',
        volume: 0.6,
        envelope: { attack: 0.1, decay: 0.3, sustain: 0.5, release: 0.2 }
      },
      [PowerUpType.BallSpeed]: {
        frequency: variant === 'fast' ? 800 : 300,
        waveform: 'triangle',
        duration: variant === 'fast' ? 0.2 : 0.6,
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.15 }
      },
      [PowerUpType.Penetration]: {
        frequency: 1500,
        waveform: 'sawtooth',
        volume: 0.7,
        envelope: { attack: 0.05, decay: 0.4, sustain: 0.2, release: 0.35 }
      },
      [PowerUpType.Magnet]: {
        frequency: 600,
        waveform: 'sine',
        volume: 0.5,
        envelope: { attack: 0.2, decay: 0.2, sustain: 0.6, release: 0.3 }
      }
    };

    return modifications[powerUpType] || {};
  }

  /**
   * Play a sound effect with Web Audio API
   */
  private playSound(effect: SoundEffect, position?: { x: number; y: number }): void {
    // Limit simultaneous sounds
    if (this.activeSounds.size >= this.config.maxSimultaneousSounds) {
      this.stopOldestSound();
    }

    try {
      // Create oscillator and gain nodes
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Configure oscillator
      oscillator.type = effect.waveform;
      oscillator.frequency.setValueAtTime(effect.frequency, this.audioContext.currentTime);

      // Configure gain (volume)
      const finalVolume = effect.volume * this.config.sfxVolume * this.config.masterVolume;
      
      // Apply ADSR envelope
      const envelope = effect.envelope!;
      const currentTime = this.audioContext.currentTime;
      const attackTime = currentTime + envelope.attack;
      const decayTime = attackTime + envelope.decay;
      const releaseStartTime = currentTime + effect.duration - envelope.release;

      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(finalVolume, attackTime);
      gainNode.gain.linearRampToValueAtTime(finalVolume * envelope.sustain, decayTime);
      gainNode.gain.setValueAtTime(finalVolume * envelope.sustain, releaseStartTime);
      gainNode.gain.linearRampToValueAtTime(0, releaseStartTime + envelope.release);

      // Spatial audio (if enabled and position provided)
      if (this.config.enableSpatialAudio && position) {
        this.applySpatialAudio(gainNode, position);
      }

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Start and schedule stop
      oscillator.start(currentTime);
      oscillator.stop(currentTime + effect.duration);

      // Track active sound
      this.activeSounds.set(effect.id, { gain: gainNode, oscillator });

      // Clean up when finished
      oscillator.onended = () => {
        this.activeSounds.delete(effect.id);
      };

    } catch (error) {
      console.error('AudioSystem: Error playing sound:', error);
    }
  }

  /**
   * Apply spatial audio positioning
   */
  private applySpatialAudio(gainNode: GainNode, position: { x: number; y: number }): void {
    // Simple panning based on X position (assuming screen width of 800)
    const panValue = (position.x - 400) / 400; // -1 to 1
    const clampedPan = Math.max(-1, Math.min(1, panValue));

    // Create stereo panner if available
    if (this.audioContext.createStereoPanner) {
      const panner = this.audioContext.createStereoPanner();
      panner.pan.setValueAtTime(clampedPan, this.audioContext.currentTime);
      gainNode.connect(panner);
      panner.connect(this.audioContext.destination);
    }
  }

  /**
   * Stop the oldest active sound to make room for new ones
   */
  private stopOldestSound(): void {
    const [oldestId] = this.activeSounds.keys();
    if (oldestId) {
      const sound = this.activeSounds.get(oldestId);
      if (sound) {
        sound.oscillator.stop();
        this.activeSounds.delete(oldestId);
      }
    }
  }

  /**
   * Stop all currently playing sounds
   */
  public stopAllSounds(): void {
    for (const [id, sound] of this.activeSounds) {
      sound.oscillator.stop();
    }
    this.activeSounds.clear();
  }

  /**
   * Update audio system configuration
   */
  public updateConfig(newConfig: Partial<AudioConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('AudioSystem: Configuration updated');
  }

  /**
   * Get current audio system status
   */
  public getStatus(): {
    isInitialized: boolean;
    activeSounds: number;
    maxSounds: number;
    masterVolume: number;
    sfxVolume: number;
  } {
    return {
      isInitialized: this.isInitialized,
      activeSounds: this.activeSounds.size,
      maxSounds: this.config.maxSimultaneousSounds,
      masterVolume: this.config.masterVolume,
      sfxVolume: this.config.sfxVolume
    };
  }

  /**
   * Cleanup and dispose of audio resources
   */
  public dispose(): void {
    this.stopAllSounds();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.isInitialized = false;
    console.log('AudioSystem: Disposed');
  }

  /**
   * Factory method to create and initialize audio system
   */
  public static async create(config?: Partial<AudioConfig>): Promise<AudioSystem> {
    const audioSystem = new AudioSystem(config);
    await audioSystem.initialize();
    return audioSystem;
  }
}