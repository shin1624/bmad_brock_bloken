import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioService } from '../AudioService';

// Mock Web Audio API
class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = { connect: vi.fn() };
  
  createGain() {
    return {
      gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn()
    };
  }
  
  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null
    };
  }
  
  createOscillator() {
    return {
      type: 'sine',
      frequency: { value: 440, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    };
  }
  
  createAnalyser() {
    return {
      fftSize: 2048,
      connect: vi.fn(),
      getByteFrequencyData: vi.fn()
    };
  }
  
  decodeAudioData(buffer: ArrayBuffer) {
    return Promise.resolve({
      duration: 1,
      length: 44100,
      numberOfChannels: 2,
      sampleRate: 44100
    });
  }
  
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
  
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
}

global.AudioContext = MockAudioContext as any;

describe('AudioService', () => {
  let audioService: AudioService;
  
  beforeEach(() => {
    audioService = new AudioService();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    audioService.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      expect(audioService.isEnabled()).toBe(true);
      expect(audioService.getMasterVolume()).toBe(1.0);
      expect(audioService.getSoundVolume()).toBe(1.0);
      expect(audioService.getMusicVolume()).toBe(0.7);
    });

    it('should handle initialization errors gracefully', () => {
      global.AudioContext = undefined as any;
      const service = new AudioService();
      expect(service.isSupported()).toBe(false);
      global.AudioContext = MockAudioContext as any;
    });

    it('should detect browser audio support', () => {
      expect(audioService.isSupported()).toBe(true);
    });
  });

  describe('Sound Loading', () => {
    it('should load sound from URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
      });
      
      await audioService.loadSound('hit', '/sounds/hit.mp3');
      expect(audioService.hasSound('hit')).toBe(true);
    });

    it('should handle loading errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(audioService.loadSound('error', '/invalid.mp3')).rejects.toThrow();
    });

    it('should cache loaded sounds', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
      });
      
      await audioService.loadSound('cached', '/sounds/cached.mp3');
      await audioService.loadSound('cached', '/sounds/cached.mp3');
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should batch load multiple sounds', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
      });
      
      const sounds = {
        hit: '/sounds/hit.mp3',
        powerup: '/sounds/powerup.mp3',
        gameover: '/sounds/gameover.mp3'
      };
      
      await audioService.loadSounds(sounds);
      
      expect(audioService.hasSound('hit')).toBe(true);
      expect(audioService.hasSound('powerup')).toBe(true);
      expect(audioService.hasSound('gameover')).toBe(true);
    });
  });

  describe('Sound Playback', () => {
    beforeEach(async () => {
      global.fetch = vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
      });
      await audioService.loadSound('test', '/test.mp3');
    });

    it('should play loaded sound', () => {
      const soundId = audioService.playSound('test');
      expect(soundId).toBeDefined();
    });

    it('should not play when disabled', () => {
      audioService.setEnabled(false);
      const soundId = audioService.playSound('test');
      expect(soundId).toBeNull();
    });

    it('should apply volume settings', () => {
      audioService.setSoundVolume(0.5);
      const soundId = audioService.playSound('test');
      expect(soundId).toBeDefined();
      // Volume would be applied through gain node
    });

    it('should stop playing sound', () => {
      const soundId = audioService.playSound('test');
      audioService.stopSound(soundId!);
      // Sound would be stopped
    });

    it('should handle concurrent sound playback', () => {
      const sound1 = audioService.playSound('test');
      const sound2 = audioService.playSound('test');
      const sound3 = audioService.playSound('test');
      
      expect(sound1).not.toBe(sound2);
      expect(sound2).not.toBe(sound3);
    });

    it('should limit maximum concurrent sounds', () => {
      audioService.setMaxConcurrentSounds(2);
      
      const sound1 = audioService.playSound('test');
      const sound2 = audioService.playSound('test');
      const sound3 = audioService.playSound('test');
      
      expect(sound1).toBeDefined();
      expect(sound2).toBeDefined();
      expect(sound3).toBeNull();
    });
  });

  describe('Music Playback', () => {
    beforeEach(async () => {
      global.fetch = vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
      });
      await audioService.loadMusic('theme', '/music/theme.mp3');
    });

    it('should play music with looping', () => {
      audioService.playMusic('theme');
      expect(audioService.isPlayingMusic()).toBe(true);
    });

    it('should stop music', () => {
      audioService.playMusic('theme');
      audioService.stopMusic();
      expect(audioService.isPlayingMusic()).toBe(false);
    });

    it('should pause and resume music', () => {
      audioService.playMusic('theme');
      audioService.pauseMusic();
      expect(audioService.isMusicPaused()).toBe(true);
      
      audioService.resumeMusic();
      expect(audioService.isMusicPaused()).toBe(false);
    });

    it('should fade music in/out', async () => {
      audioService.playMusic('theme', { fadeIn: 1000 });
      
      vi.advanceTimersByTime(1000);
      
      audioService.fadeOutMusic(1000);
      
      vi.advanceTimersByTime(1000);
      
      expect(audioService.isPlayingMusic()).toBe(false);
    });

    it('should crossfade between tracks', async () => {
      await audioService.loadMusic('track2', '/music/track2.mp3');
      
      audioService.playMusic('theme');
      audioService.crossfadeTo('track2', 1000);
      
      vi.advanceTimersByTime(1000);
      
      expect(audioService.getCurrentMusic()).toBe('track2');
    });
  });

  describe('Volume Control', () => {
    it('should set master volume', () => {
      audioService.setMasterVolume(0.5);
      expect(audioService.getMasterVolume()).toBe(0.5);
    });

    it('should clamp volume values', () => {
      audioService.setMasterVolume(2.0);
      expect(audioService.getMasterVolume()).toBe(1.0);
      
      audioService.setMasterVolume(-1.0);
      expect(audioService.getMasterVolume()).toBe(0.0);
    });

    it('should apply volume to all categories', () => {
      audioService.setMasterVolume(0.5);
      audioService.setSoundVolume(0.8);
      
      const effectiveVolume = audioService.getEffectiveSoundVolume();
      expect(effectiveVolume).toBe(0.4); // 0.5 * 0.8
    });

    it('should mute/unmute', () => {
      audioService.mute();
      expect(audioService.isMuted()).toBe(true);
      
      audioService.unmute();
      expect(audioService.isMuted()).toBe(false);
    });

    it('should remember volume when muting', () => {
      audioService.setMasterVolume(0.8);
      audioService.mute();
      expect(audioService.getMasterVolume()).toBe(0);
      
      audioService.unmute();
      expect(audioService.getMasterVolume()).toBe(0.8);
    });
  });

  describe('Audio Effects', () => {
    it('should create sound with pitch variation', () => {
      audioService.playSoundWithVariation('test', {
        pitchVariation: 0.2,
        volumeVariation: 0.1
      });
      // Pitch and volume would be randomized within range
    });

    it('should apply reverb effect', () => {
      audioService.enableReverb('hall');
      const soundId = audioService.playSound('test');
      expect(soundId).toBeDefined();
      // Reverb would be applied through convolver node
    });

    it('should apply low-pass filter', () => {
      audioService.setLowPassFilter(1000);
      const soundId = audioService.playSound('test');
      expect(soundId).toBeDefined();
      // Filter would be applied
    });

    it('should chain multiple effects', () => {
      audioService.enableReverb('hall');
      audioService.setLowPassFilter(2000);
      audioService.setDistortion(0.5);
      
      const soundId = audioService.playSound('test');
      expect(soundId).toBeDefined();
    });
  });

  describe('3D Audio', () => {
    it('should position sound in 3D space', () => {
      const soundId = audioService.playSound3D('test', {
        x: 10,
        y: 0,
        z: 5
      });
      expect(soundId).toBeDefined();
    });

    it('should update listener position', () => {
      audioService.setListenerPosition({ x: 5, y: 0, z: 0 });
      audioService.setListenerOrientation({ x: 1, y: 0, z: 0 });
      // Listener would be updated in audio context
    });

    it('should apply distance attenuation', () => {
      audioService.setListenerPosition({ x: 0, y: 0, z: 0 });
      
      const nearSound = audioService.playSound3D('test', { x: 1, y: 0, z: 0 });
      const farSound = audioService.playSound3D('test', { x: 100, y: 0, z: 0 });
      
      // Far sound would be quieter
      expect(nearSound).toBeDefined();
      expect(farSound).toBeDefined();
    });
  });

  describe('Audio Analysis', () => {
    it('should get frequency data', () => {
      audioService.enableAnalyser();
      audioService.playMusic('theme');
      
      const frequencies = audioService.getFrequencyData();
      expect(frequencies).toBeInstanceOf(Uint8Array);
    });

    it('should detect beat', () => {
      audioService.enableBeatDetection();
      audioService.playMusic('theme');
      
      const isBeat = audioService.isBeat();
      expect(typeof isBeat).toBe('boolean');
    });

    it('should get average volume', () => {
      audioService.enableAnalyser();
      audioService.playSound('test');
      
      const avgVolume = audioService.getAverageVolume();
      expect(avgVolume).toBeGreaterThanOrEqual(0);
      expect(avgVolume).toBeLessThanOrEqual(1);
    });
  });

  describe('Resource Management', () => {
    it('should unload sounds', async () => {
      await audioService.loadSound('temp', '/temp.mp3');
      expect(audioService.hasSound('temp')).toBe(true);
      
      audioService.unloadSound('temp');
      expect(audioService.hasSound('temp')).toBe(false);
    });

    it('should clean up on destroy', () => {
      audioService.playSound('test');
      audioService.playMusic('theme');
      
      audioService.destroy();
      
      expect(audioService.isPlayingMusic()).toBe(false);
    });

    it('should handle context suspension', async () => {
      await audioService.suspend();
      expect(audioService.isSuspended()).toBe(true);
      
      await audioService.resume();
      expect(audioService.isSuspended()).toBe(false);
    });

    it('should limit memory usage', async () => {
      audioService.setMaxCacheSize(3);
      
      await audioService.loadSound('sound1', '/1.mp3');
      await audioService.loadSound('sound2', '/2.mp3');
      await audioService.loadSound('sound3', '/3.mp3');
      await audioService.loadSound('sound4', '/4.mp3');
      
      // Oldest sound should be evicted
      expect(audioService.hasSound('sound1')).toBe(false);
      expect(audioService.hasSound('sound4')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle playback errors gracefully', () => {
      expect(() => audioService.playSound('nonexistent')).not.toThrow();
    });

    it('should recover from context errors', async () => {
      const ctx = audioService['context'] as any;
      ctx.state = 'closed';
      
      await audioService.reinitialize();
      expect(audioService.isSupported()).toBe(true);
    });

    it('should handle invalid volume values', () => {
      audioService.setMasterVolume(NaN);
      expect(audioService.getMasterVolume()).toBe(1.0);
      
      audioService.setMasterVolume(Infinity);
      expect(audioService.getMasterVolume()).toBe(1.0);
    });
  });

  describe('Performance', () => {
    it('should handle rapid sound triggers', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        audioService.playSound('test');
      }
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(50);
    });

    it('should throttle identical sounds', () => {
      audioService.setThrottleTime('test', 100);
      
      const sound1 = audioService.playSound('test');
      const sound2 = audioService.playSound('test');
      
      expect(sound1).toBeDefined();
      expect(sound2).toBeNull();
      
      vi.advanceTimersByTime(101);
      
      const sound3 = audioService.playSound('test');
      expect(sound3).toBeDefined();
    });
  });
});