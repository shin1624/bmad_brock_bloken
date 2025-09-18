/**
 * Unit Tests for AudioSystem
 * Story 4.2, Task 6: Test power-up audio feedback functionality
 */
import { AudioSystem, AudioEvent } from '../AudioSystem';
import { PowerUpType } from '../../entities/PowerUp';

// Mock Web Audio API
class MockAudioContext {
  public state = 'running';
  public currentTime = 0;
  public destination = {};

  async resume() {
    this.state = 'running';
  }

  async close() {
    this.state = 'closed';
  }

  createOscillator() {
    return new MockOscillator();
  }

  createGain() {
    return new MockGainNode();
  }

  createStereoPanner() {
    return new MockStereoPanner();
  }
}

class MockOscillator {
  public type = 'sine';
  public frequency = { setValueAtTime: jest.fn() };
  public onended: (() => void) | null = null;

  connect() {}
  start() {}
  stop() {
    // Simulate async completion
    setTimeout(() => {
      if (this.onended) this.onended();
    }, 0);
  }
}

class MockGainNode {
  public gain = {
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn()
  };

  connect() {}
}

class MockStereoPanner {
  public pan = { setValueAtTime: jest.fn() };
  connect() {}
}

// Mock global AudioContext
(global as any).AudioContext = MockAudioContext;
(global as any).webkitAudioContext = MockAudioContext;

describe('AudioSystem', () => {
  let audioSystem: AudioSystem;
  let mockContext: MockAudioContext;

  beforeEach(async () => {
    mockContext = new MockAudioContext();
    audioSystem = new AudioSystem({ audioContext: mockContext as any });
    await audioSystem.initialize();
  });

  afterEach(() => {
    audioSystem.dispose();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const newSystem = new AudioSystem();
      await newSystem.initialize();

      const status = newSystem.getStatus();
      expect(status.isInitialized).toBe(true);
      
      newSystem.dispose();
    });

    it('should handle suspended audio context', async () => {
      const suspendedContext = new MockAudioContext();
      suspendedContext.state = 'suspended';
      const resumeSpy = jest.spyOn(suspendedContext, 'resume');

      const system = new AudioSystem({ audioContext: suspendedContext as any });
      await system.initialize();

      expect(resumeSpy).toHaveBeenCalled();
      system.dispose();
    });

    it('should handle initialization errors gracefully', async () => {
      const errorContext = {
        ...new MockAudioContext(),
        resume: jest.fn().mockRejectedValue(new Error('Audio context error'))
      };

      const system = new AudioSystem({ audioContext: errorContext as any });
      
      await expect(system.initialize()).rejects.toThrow('Audio context error');
    });
  });

  describe('Power-Up Sound Effects', () => {
    it('should play collection sound', () => {
      const createOscillatorSpy = jest.spyOn(mockContext, 'createOscillator');
      const createGainSpy = jest.spyOn(mockContext, 'createGain');

      audioSystem.playPowerUpSound(AudioEvent.PowerUpCollect);

      expect(createOscillatorSpy).toHaveBeenCalled();
      expect(createGainSpy).toHaveBeenCalled();
    });

    it('should play activation sound with power-up type', () => {
      const createOscillatorSpy = jest.spyOn(mockContext, 'createOscillator');

      audioSystem.playPowerUpSound(
        AudioEvent.PowerUpActivate,
        PowerUpType.MultiBall
      );

      expect(createOscillatorSpy).toHaveBeenCalled();
    });

    it('should play variant-specific sounds', () => {
      const createOscillatorSpy = jest.spyOn(mockContext, 'createOscillator');

      audioSystem.playPowerUpSound(
        AudioEvent.PowerUpActivate,
        PowerUpType.PaddleSize,
        'large'
      );

      audioSystem.playPowerUpSound(
        AudioEvent.PowerUpActivate,
        PowerUpType.PaddleSize,
        'small'
      );

      expect(createOscillatorSpy).toHaveBeenCalledTimes(2);
    });

    it('should apply power-up specific audio modifications', () => {
      const mockOscillator = new MockOscillator();
      jest.spyOn(mockContext, 'createOscillator').mockReturnValue(mockOscillator as any);

      audioSystem.playPowerUpSound(
        AudioEvent.PowerUpActivate,
        PowerUpType.MultiBall
      );

      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(
        1200, // MultiBall frequency
        expect.any(Number)
      );
    });

    it('should handle ball speed variants correctly', () => {
      const mockOscillator = new MockOscillator();
      jest.spyOn(mockContext, 'createOscillator').mockReturnValue(mockOscillator as any);

      // Fast variant
      audioSystem.playPowerUpSound(
        AudioEvent.SpeedChange,
        PowerUpType.BallSpeed,
        'fast'
      );

      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(
        800, // Fast ball frequency
        expect.any(Number)
      );

      // Slow variant
      audioSystem.playPowerUpSound(
        AudioEvent.SpeedChange,
        PowerUpType.BallSpeed,
        'slow'
      );

      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(
        300, // Slow ball frequency
        expect.any(Number)
      );
    });
  });

  describe('Volume and Configuration', () => {
    it('should apply master and SFX volume settings', () => {
      const mockGain = new MockGainNode();
      jest.spyOn(mockContext, 'createGain').mockReturnValue(mockGain as any);

      audioSystem.updateConfig({ masterVolume: 0.5, sfxVolume: 0.6 });
      audioSystem.playPowerUpSound(AudioEvent.PowerUpCollect);

      // Should apply combined volume (0.5 * 0.6 * original = 0.3 * original)
      expect(mockGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
        expect.any(Number), // The calculated volume
        expect.any(Number)
      );
    });

    it('should update configuration correctly', () => {
      const newConfig = {
        masterVolume: 0.8,
        sfxVolume: 0.9,
        maxSimultaneousSounds: 12
      };

      audioSystem.updateConfig(newConfig);

      const status = audioSystem.getStatus();
      expect(status.masterVolume).toBe(0.8);
      expect(status.sfxVolume).toBe(0.9);
      expect(status.maxSounds).toBe(12);
    });
  });

  describe('Spatial Audio', () => {
    it('should apply spatial audio when enabled', () => {
      const mockPanner = new MockStereoPanner();
      jest.spyOn(mockContext, 'createStereoPanner').mockReturnValue(mockPanner as any);

      audioSystem.updateConfig({ enableSpatialAudio: true });
      audioSystem.playPowerUpSound(
        AudioEvent.PowerUpCollect,
        undefined,
        undefined,
        { x: 600, y: 300 } // Right side of screen
      );

      expect(mockPanner.pan.setValueAtTime).toHaveBeenCalledWith(
        0.5, // Panned to the right
        expect.any(Number)
      );
    });

    it('should handle left side positioning', () => {
      const mockPanner = new MockStereoPanner();
      jest.spyOn(mockContext, 'createStereoPanner').mockReturnValue(mockPanner as any);

      audioSystem.updateConfig({ enableSpatialAudio: true });
      audioSystem.playPowerUpSound(
        AudioEvent.PowerUpCollect,
        undefined,
        undefined,
        { x: 200, y: 300 } // Left side of screen
      );

      expect(mockPanner.pan.setValueAtTime).toHaveBeenCalledWith(
        -0.5, // Panned to the left
        expect.any(Number)
      );
    });

    it('should not apply spatial audio when disabled', () => {
      const createPannerSpy = jest.spyOn(mockContext, 'createStereoPanner');

      audioSystem.updateConfig({ enableSpatialAudio: false });
      audioSystem.playPowerUpSound(
        AudioEvent.PowerUpCollect,
        undefined,
        undefined,
        { x: 600, y: 300 }
      );

      expect(createPannerSpy).not.toHaveBeenCalled();
    });
  });

  describe('Sound Management', () => {
    it('should limit simultaneous sounds', () => {
      audioSystem.updateConfig({ maxSimultaneousSounds: 2 });

      // Play 3 sounds (should limit to 2)
      audioSystem.playPowerUpSound(AudioEvent.PowerUpCollect);
      audioSystem.playPowerUpSound(AudioEvent.PowerUpActivate);
      audioSystem.playPowerUpSound(AudioEvent.PowerUpExpire);

      const status = audioSystem.getStatus();
      expect(status.activeSounds).toBeLessThanOrEqual(2);
    });

    it('should stop all sounds', () => {
      // Play some sounds
      audioSystem.playPowerUpSound(AudioEvent.PowerUpCollect);
      audioSystem.playPowerUpSound(AudioEvent.PowerUpActivate);

      audioSystem.stopAllSounds();

      const status = audioSystem.getStatus();
      expect(status.activeSounds).toBe(0);
    });

    it('should clean up finished sounds automatically', (done) => {
      audioSystem.playPowerUpSound(AudioEvent.PowerUpCollect);

      // Wait for sound to finish and clean up
      setTimeout(() => {
        const status = audioSystem.getStatus();
        expect(status.activeSounds).toBe(0);
        done();
      }, 10);
    });
  });

  describe('Error Handling', () => {
    it('should handle playback errors gracefully', () => {
      // Mock error in oscillator creation
      jest.spyOn(mockContext, 'createOscillator').mockImplementation(() => {
        throw new Error('Oscillator creation failed');
      });

      expect(() => {
        audioSystem.playPowerUpSound(AudioEvent.PowerUpCollect);
      }).not.toThrow();
    });

    it('should not play sounds when not initialized', () => {
      const uninitializedSystem = new AudioSystem();
      const createOscillatorSpy = jest.spyOn(mockContext, 'createOscillator');

      uninitializedSystem.playPowerUpSound(AudioEvent.PowerUpCollect);

      expect(createOscillatorSpy).not.toHaveBeenCalled();
    });

    it('should handle missing spatial audio support', () => {
      // Remove createStereoPanner method
      delete (mockContext as any).createStereoPanner;

      audioSystem.updateConfig({ enableSpatialAudio: true });

      expect(() => {
        audioSystem.playPowerUpSound(
          AudioEvent.PowerUpCollect,
          undefined,
          undefined,
          { x: 400, y: 300 }
        );
      }).not.toThrow();
    });
  });

  describe('Factory Method', () => {
    it('should create and initialize audio system', async () => {
      const system = await AudioSystem.create({
        masterVolume: 0.8,
        sfxVolume: 0.7
      });

      const status = system.getStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.masterVolume).toBe(0.8);
      expect(status.sfxVolume).toBe(0.7);

      system.dispose();
    });
  });

  describe('Disposal', () => {
    it('should dispose resources properly', () => {
      const closeSpy = jest.spyOn(mockContext, 'close');

      audioSystem.dispose();

      expect(closeSpy).toHaveBeenCalled();

      const status = audioSystem.getStatus();
      expect(status.isInitialized).toBe(false);
      expect(status.activeSounds).toBe(0);
    });
  });
});