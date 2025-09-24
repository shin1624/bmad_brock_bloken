/**
 * Enhanced AudioService tests for 90% coverage
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioService } from '../AudioService';
import type { AudioConfig, SoundEffect, MusicTrack } from '@/types/audio.types';

describe('AudioService - Enhanced Tests', () => {
  let audioService: AudioService;
  let mockAudioContext: any;
  let mockAudio: any;
  
  beforeEach(() => {
    // Mock Web Audio API
    mockAudioContext = {
      createGain: vi.fn(() => ({
        connect: vi.fn(),
        gain: { value: 1, setValueAtTime: vi.fn() }
      })),
      createOscillator: vi.fn(() => ({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        frequency: { value: 440 },
        type: 'sine'
      })),
      createBiquadFilter: vi.fn(() => ({
        connect: vi.fn(),
        frequency: { value: 1000 },
        Q: { value: 1 },
        type: 'lowpass'
      })),
      createDynamicsCompressor: vi.fn(() => ({
        connect: vi.fn(),
        threshold: { value: -24 },
        knee: { value: 30 },
        ratio: { value: 12 },
        attack: { value: 0.003 },
        release: { value: 0.25 }
      })),
      destination: {},
      currentTime: 0,
      state: 'running',
      resume: vi.fn(),
      suspend: vi.fn()
    };
    
    global.AudioContext = vi.fn(() => mockAudioContext);
    
    // Mock HTML Audio Element
    mockAudio = {
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
      load: vi.fn(),
      volume: 1,
      currentTime: 0,
      duration: 60,
      src: '',
      loop: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    
    global.Audio = vi.fn(() => mockAudio);
    
    audioService = new AudioService();
  });
  
  afterEach(() => {
    audioService.dispose();
    vi.clearAllMocks();
  });
  
  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(audioService.isEnabled()).toBe(true);
      expect(audioService.getMasterVolume()).toBe(1);
    });
    
    it('should initialize with custom config', () => {
      const config: AudioConfig = {
        masterVolume: 0.5,
        soundVolume: 0.7,
        musicVolume: 0.3,
        enabled: true
      };
      
      audioService = new AudioService(config);
      expect(audioService.getMasterVolume()).toBe(0.5);
      expect(audioService.getSoundVolume()).toBe(0.7);
      expect(audioService.getMusicVolume()).toBe(0.3);
    });
    
    it('should handle missing AudioContext gracefully', () => {
      delete (global as any).AudioContext;
      
      expect(() => {
        audioService = new AudioService();
      }).not.toThrow();
      
      expect(audioService.isSupported()).toBe(false);
    });
  });
  
  describe('Sound Effects', () => {
    it('should load sound effect', async () => {
      await audioService.loadSound('hit', '/sounds/hit.mp3');
      expect(audioService.hasSound('hit')).toBe(true);
    });
    
    it('should play sound effect', async () => {
      await audioService.loadSound('hit', '/sounds/hit.mp3');
      await audioService.playSound('hit');
      
      expect(mockAudio.play).toHaveBeenCalled();
    });
    
    it('should play sound with options', async () => {
      await audioService.loadSound('hit', '/sounds/hit.mp3');
      await audioService.playSound('hit', {
        volume: 0.5,
        pitch: 1.2,
        pan: -0.5
      });
      
      expect(mockAudio.volume).toBe(0.5);
    });
    
    it('should handle sound not found', async () => {
      const result = await audioService.playSound('nonexistent');
      expect(result).toBe(false);
    });
    
    it('should stop sound effect', async () => {
      await audioService.loadSound('hit', '/sounds/hit.mp3');
      const soundId = await audioService.playSound('hit');
      
      audioService.stopSound(soundId);
      expect(mockAudio.pause).toHaveBeenCalled();
    });
    
    it('should play one-shot sound', async () => {
      await audioService.playOneShot('/sounds/explosion.mp3', 0.8);
      expect(mockAudio.play).toHaveBeenCalled();
      expect(mockAudio.volume).toBe(0.8);
    });
    
    it('should handle sound pooling', async () => {
      await audioService.loadSound('laser', '/sounds/laser.mp3', { poolSize: 3 });
      
      // Play multiple instances
      const ids = [];
      for (let i = 0; i < 5; i++) {
        ids.push(await audioService.playSound('laser'));
      }
      
      expect(ids.filter(id => id !== null)).toHaveLength(3); // Pool size limit
    });
  });
  
  describe('Music Playback', () => {
    it('should load music track', async () => {
      await audioService.loadMusic('theme', '/music/theme.mp3');
      expect(audioService.hasMusic('theme')).toBe(true);
    });
    
    it('should play music track', async () => {
      await audioService.loadMusic('theme', '/music/theme.mp3');
      await audioService.playMusic('theme');
      
      expect(mockAudio.play).toHaveBeenCalled();
      expect(mockAudio.loop).toBe(true);
    });
    
    it('should fade in music', async () => {
      vi.useFakeTimers();
      
      await audioService.loadMusic('theme', '/music/theme.mp3');
      await audioService.playMusic('theme', { fadeIn: 1000 });
      
      expect(mockAudio.volume).toBeLessThan(1);
      
      vi.advanceTimersByTime(1000);
      
      vi.useRealTimers();
    });
    
    it('should fade out music', async () => {
      vi.useFakeTimers();
      
      await audioService.loadMusic('theme', '/music/theme.mp3');
      await audioService.playMusic('theme');
      
      audioService.stopMusic(1000); // 1 second fade out
      
      vi.advanceTimersByTime(500);
      expect(mockAudio.volume).toBeLessThan(1);
      
      vi.advanceTimersByTime(500);
      expect(mockAudio.pause).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
    
    it('should crossfade between tracks', async () => {
      await audioService.loadMusic('theme1', '/music/theme1.mp3');
      await audioService.loadMusic('theme2', '/music/theme2.mp3');
      
      await audioService.playMusic('theme1');
      await audioService.crossfadeTo('theme2', 2000);
      
      expect(mockAudio.play).toHaveBeenCalledTimes(2);
    });
    
    it('should handle music queue', async () => {
      await audioService.loadMusic('track1', '/music/track1.mp3');
      await audioService.loadMusic('track2', '/music/track2.mp3');
      
      audioService.queueMusic(['track1', 'track2']);
      await audioService.playNextInQueue();
      
      expect(mockAudio.play).toHaveBeenCalled();
    });
  });
  
  describe('Volume Control', () => {
    it('should set master volume', () => {
      audioService.setMasterVolume(0.5);
      expect(audioService.getMasterVolume()).toBe(0.5);
    });
    
    it('should set sound volume', () => {
      audioService.setSoundVolume(0.7);
      expect(audioService.getSoundVolume()).toBe(0.7);
    });
    
    it('should set music volume', () => {
      audioService.setMusicVolume(0.3);
      expect(audioService.getMusicVolume()).toBe(0.3);
    });
    
    it('should mute all audio', () => {
      audioService.mute();
      expect(audioService.isMuted()).toBe(true);
      expect(audioService.getMasterVolume()).toBe(0);
    });
    
    it('should unmute and restore volume', () => {
      const originalVolume = audioService.getMasterVolume();
      audioService.mute();
      audioService.unmute();
      
      expect(audioService.isMuted()).toBe(false);
      expect(audioService.getMasterVolume()).toBe(originalVolume);
    });
    
    it('should apply volume to playing sounds', async () => {
      await audioService.loadSound('hit', '/sounds/hit.mp3');
      await audioService.playSound('hit');
      
      audioService.setSoundVolume(0.5);
      expect(mockAudio.volume).toBeLessThanOrEqual(0.5);
    });
  });
  
  describe('3D Spatial Audio', () => {
    it('should create 3D sound source', () => {
      const source = audioService.create3DSound('/sounds/ambient.mp3', {
        position: { x: 10, y: 0, z: 5 },
        orientation: { x: 0, y: 0, z: 1 }
      });
      
      expect(source).toBeDefined();
    });
    
    it('should update listener position', () => {
      audioService.setListenerPosition({ x: 0, y: 0, z: 0 });
      audioService.setListenerOrientation({ x: 0, y: 0, z: -1 });
      
      // Verify spatial audio calculations
      const source = audioService.create3DSound('/sounds/test.mp3', {
        position: { x: 10, y: 0, z: 0 }
      });
      
      expect(source.calculatePanning()).toBeCloseTo(1, 1); // Right channel
    });
    
    it('should calculate distance attenuation', () => {
      const source = audioService.create3DSound('/sounds/test.mp3', {
        position: { x: 100, y: 0, z: 0 },
        maxDistance: 1000,
        refDistance: 1
      });
      
      audioService.setListenerPosition({ x: 0, y: 0, z: 0 });
      
      const volume = source.calculateVolume();
      expect(volume).toBeLessThan(1);
      expect(volume).toBeGreaterThan(0);
    });
  });
  
  describe('Audio Effects', () => {
    it('should apply reverb effect', () => {
      const reverb = audioService.createReverb({
        roomSize: 0.7,
        damping: 0.5,
        wetLevel: 0.3,
        dryLevel: 0.7
      });
      
      expect(reverb).toBeDefined();
      expect(mockAudioContext.createConvolver).toHaveBeenCalled();
    });
    
    it('should apply delay effect', () => {
      const delay = audioService.createDelay({
        time: 0.5,
        feedback: 0.4,
        mix: 0.3
      });
      
      expect(delay).toBeDefined();
    });
    
    it('should apply distortion effect', () => {
      const distortion = audioService.createDistortion({
        amount: 50,
        oversample: '4x'
      });
      
      expect(distortion).toBeDefined();
    });
    
    it('should chain multiple effects', async () => {
      await audioService.loadSound('guitar', '/sounds/guitar.mp3');
      
      const chain = audioService.createEffectChain([
        { type: 'distortion', params: { amount: 30 } },
        { type: 'delay', params: { time: 0.3 } },
        { type: 'reverb', params: { roomSize: 0.5 } }
      ]);
      
      await audioService.playSound('guitar', { effects: chain });
      
      expect(mockAudio.play).toHaveBeenCalled();
    });
  });
  
  describe('Audio Analysis', () => {
    it('should analyze frequency spectrum', () => {
      const analyzer = audioService.createAnalyzer();
      const frequencies = analyzer.getFrequencyData();
      
      expect(frequencies).toBeDefined();
      expect(frequencies.length).toBeGreaterThan(0);
    });
    
    it('should detect beat', () => {
      const beatDetector = audioService.createBeatDetector();
      const isBeat = beatDetector.detect();
      
      expect(typeof isBeat).toBe('boolean');
    });
    
    it('should measure peak levels', () => {
      const levels = audioService.getPeakLevels();
      
      expect(levels).toHaveProperty('left');
      expect(levels).toHaveProperty('right');
      expect(levels.left).toBeGreaterThanOrEqual(0);
      expect(levels.left).toBeLessThanOrEqual(1);
    });
  });
  
  describe('Preloading and Caching', () => {
    it('should preload multiple sounds', async () => {
      const sounds = [
        { name: 'hit', url: '/sounds/hit.mp3' },
        { name: 'miss', url: '/sounds/miss.mp3' },
        { name: 'powerup', url: '/sounds/powerup.mp3' }
      ];
      
      await audioService.preloadSounds(sounds);
      
      expect(audioService.hasSound('hit')).toBe(true);
      expect(audioService.hasSound('miss')).toBe(true);
      expect(audioService.hasSound('powerup')).toBe(true);
    });
    
    it('should handle preload errors', async () => {
      mockAudio.addEventListener.mockImplementation((event, handler) => {
        if (event === 'error') {
          setTimeout(() => handler(new Error('Load failed')), 0);
        }
      });
      
      const result = await audioService.loadSound('broken', '/invalid.mp3');
      expect(result).toBe(false);
    });
    
    it('should cache loaded audio', async () => {
      await audioService.loadSound('cached', '/sounds/cached.mp3');
      
      // Second load should use cache
      const spy = vi.spyOn(global, 'Audio');
      await audioService.loadSound('cached', '/sounds/cached.mp3');
      
      expect(spy).not.toHaveBeenCalled();
    });
    
    it('should clear cache', async () => {
      await audioService.loadSound('temp', '/sounds/temp.mp3');
      audioService.clearCache();
      
      expect(audioService.hasSound('temp')).toBe(false);
    });
  });
  
  describe('Performance', () => {
    it('should limit concurrent sounds', async () => {
      audioService.setMaxConcurrentSounds(3);
      
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(audioService.playOneShot(`/sound${i}.mp3`));
      }
      
      await Promise.all(promises);
      
      const activeSounds = audioService.getActiveSoundCount();
      expect(activeSounds).toBeLessThanOrEqual(3);
    });
    
    it('should compress dynamic range', () => {
      audioService.enableCompression({
        threshold: -24,
        ratio: 12,
        attack: 0.003,
        release: 0.25
      });
      
      expect(mockAudioContext.createDynamicsCompressor).toHaveBeenCalled();
    });
    
    it('should optimize memory usage', () => {
      audioService.enableMemoryOptimization();
      
      // Should release unused audio buffers
      const memoryUsage = audioService.getMemoryUsage();
      expect(memoryUsage).toBeLessThan(50 * 1024 * 1024); // 50MB limit
    });
  });
  
  describe('Error Handling', () => {
    it('should handle audio context suspension', async () => {
      mockAudioContext.state = 'suspended';
      
      await audioService.resume();
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });
    
    it('should handle playback errors gracefully', async () => {
      mockAudio.play.mockRejectedValueOnce(new Error('Playback failed'));
      
      await audioService.loadSound('error', '/sounds/error.mp3');
      const result = await audioService.playSound('error');
      
      expect(result).toBe(false);
    });
    
    it('should recover from audio context crash', () => {
      mockAudioContext.state = 'closed';
      
      audioService.reinitialize();
      expect(global.AudioContext).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('Cleanup', () => {
    it('should dispose all resources', () => {
      audioService.dispose();
      
      expect(audioService.isEnabled()).toBe(false);
      expect(audioService.getActiveSoundCount()).toBe(0);
    });
    
    it('should stop all sounds on dispose', async () => {
      await audioService.loadSound('test', '/sounds/test.mp3');
      await audioService.playSound('test');
      
      audioService.dispose();
      expect(mockAudio.pause).toHaveBeenCalled();
    });
  });
});