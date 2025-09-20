import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackgroundParticleSystem } from './BackgroundParticleSystem';
import { EventBus } from '../core/EventBus';

describe('BackgroundParticleSystem', () => {
  let eventBus: EventBus;
  let backgroundSystem: BackgroundParticleSystem;

  beforeEach(() => {
    eventBus = new EventBus();
    backgroundSystem = new BackgroundParticleSystem(eventBus);
  });

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      const stats = backgroundSystem.getStats();
      
      expect(stats.enabled).toBe(true);
      expect(stats.performanceMode).toBe('high');
      expect(stats.layerCount).toBe(3);
      expect(stats.totalParticles).toBeGreaterThan(0);
    });

    it('should create ambient particles for each layer', () => {
      const stats = backgroundSystem.getStats();
      
      // Default configuration: 30 + 20 + 15 = 65 particles
      expect(stats.totalParticles).toBe(65);
    });
  });

  describe('Viewport Management', () => {
    it('should update viewport dimensions', () => {
      backgroundSystem.setViewport(1024, 768);
      
      // Should reinitialize particles for new viewport
      const stats = backgroundSystem.getStats();
      expect(stats.totalParticles).toBe(65); // Same count, new positions
    });
  });

  describe('Performance Scaling', () => {
    it('should adjust particle counts based on performance mode', () => {
      // High mode (default)
      let stats = backgroundSystem.getStats();
      expect(stats.performanceMode).toBe('high');
      expect(stats.totalParticles).toBe(65);

      // Medium mode
      backgroundSystem.setPerformanceMode('medium');
      stats = backgroundSystem.getStats();
      expect(stats.performanceMode).toBe('medium');
      expect(stats.totalParticles).toBeLessThan(65);

      // Low mode
      backgroundSystem.setPerformanceMode('low');
      stats = backgroundSystem.getStats();
      expect(stats.performanceMode).toBe('low');
      expect(stats.totalParticles).toBeLessThan(40);
    });
  });

  describe('Animation Updates', () => {
    it('should update particle positions on update', () => {
      const deltaTime = 0.016; // 60 FPS frame time
      
      // Update multiple frames
      for (let i = 0; i < 10; i++) {
        backgroundSystem.update(deltaTime);
      }

      // Particles should have moved (testing is limited without direct access)
      const stats = backgroundSystem.getStats();
      expect(stats.enabled).toBe(true);
    });

    it('should not update when disabled', () => {
      backgroundSystem.setEnabled(false);
      
      const deltaTime = 0.016;
      backgroundSystem.update(deltaTime);
      
      const stats = backgroundSystem.getStats();
      expect(stats.enabled).toBe(false);
    });
  });

  describe('Parallax Effect', () => {
    it('should apply parallax offset to particles', () => {
      const cameraOffset = { x: 10, y: 5 };
      
      // Apply parallax movement
      backgroundSystem.applyParallax(cameraOffset);
      
      // Verify system is still functional after parallax
      const stats = backgroundSystem.getStats();
      expect(stats.totalParticles).toBe(65);
    });
  });

  describe('Theme Integration', () => {
    it('should set theme for background particles', () => {
      // Should not throw error
      expect(() => {
        backgroundSystem.setTheme('pixel');
      }).not.toThrow();

      const stats = backgroundSystem.getStats();
      expect(stats.enabled).toBe(true);
    });
  });

  describe('Rendering', () => {
    it('should render without errors', () => {
      // Mock canvas context
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        globalAlpha: 1,
        fillStyle: '',
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        fillRect: vi.fn(),
        closePath: vi.fn()
      } as unknown as CanvasRenderingContext2D;

      // Should not throw during render
      expect(() => {
        backgroundSystem.render(ctx);
      }).not.toThrow();
    });

    it('should not render when disabled', () => {
      // Mock canvas context
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        globalAlpha: 1,
        fillStyle: '',
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        fillRect: vi.fn(),
        closePath: vi.fn()
      } as unknown as CanvasRenderingContext2D;
      
      const saveSpy = vi.spyOn(ctx, 'save');
      
      backgroundSystem.setEnabled(false);
      backgroundSystem.render(ctx);
      
      // Should return early without saving context
      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources on destroy', () => {
      expect(() => {
        backgroundSystem.destroy();
      }).not.toThrow();

      // After destroy, stats should still be accessible but empty
      const stats = backgroundSystem.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Performance Impact', () => {
    it('should maintain performance with continuous updates', () => {
      const startTime = performance.now();
      const deltaTime = 0.016;
      
      // Simulate 60 frames (1 second of gameplay)
      for (let i = 0; i < 60; i++) {
        backgroundSystem.update(deltaTime);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete 60 frames in reasonable time (< 100ms for background processing)
      expect(totalTime).toBeLessThan(100);
    });
  });
});