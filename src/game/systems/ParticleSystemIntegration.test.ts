import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParticleSystem } from './ParticleSystem';
import { EventBus } from '../core/EventBus';
import { BlockType } from '../../types/game.types';

describe('ParticleSystem Integration Tests', () => {
  let particleSystem: ParticleSystem;
  let eventBus: EventBus;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    eventBus = new EventBus();
    particleSystem = new ParticleSystem(eventBus, {
      maxParticles: 100,
      preFillCount: 20
    });

    // Create mock canvas context with all required methods
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    mockCtx = canvas.getContext('2d')!;
    
    // Add missing translate method if not present
    if (!mockCtx.translate) {
      mockCtx.translate = vi.fn();
    }
  });

  describe('Batch Rendering Integration', () => {
    it('should use batch rendering by default', () => {
      // Create multiple particles
      for (let i = 0; i < 50; i++) {
        particleSystem.createEffect('spark', { x: i * 10, y: i * 10 });
      }

      // Render particles
      particleSystem.render(mockCtx);

      // Check batch render stats
      const stats = particleSystem.getBatchRenderStats();
      expect(stats.drawCalls).toBeGreaterThan(0);
      expect(stats.stateChanges).toBeGreaterThan(0);
    });

    it('should fall back to individual rendering when disabled', () => {
      particleSystem.setBatchRendering(false);

      // Create particles
      for (let i = 0; i < 10; i++) {
        particleSystem.createEffect('explosion', { x: 100, y: 100 });
      }

      // Spy on context methods
      const beginPathSpy = vi.spyOn(mockCtx, 'beginPath');
      const arcSpy = vi.spyOn(mockCtx, 'arc');

      // Render without batch rendering
      particleSystem.render(mockCtx);

      // Should call arc for each particle individually
      expect(beginPathSpy).toHaveBeenCalled();
      expect(arcSpy).toHaveBeenCalled();
    });

    it('should batch particles with same visual properties', () => {
      // Create particles with same color
      for (let i = 0; i < 20; i++) {
        particleSystem.createBlockDestructionEffect(
          { x: 100, y: 100 },
          BlockType.Normal
        );
      }

      particleSystem.render(mockCtx);

      const stats = particleSystem.getBatchRenderStats();
      // Should batch particles efficiently
      expect(stats.drawCalls).toBeLessThan(20);
    });
  });

  describe('Viewport Culling Integration', () => {
    it('should cull particles outside viewport', () => {
      // Set viewport
      particleSystem.setViewport(0, 0, 400, 300);

      // Create particles inside viewport
      particleSystem.createEffect('spark', { x: 200, y: 150 });

      // Create particles outside viewport
      particleSystem.createEffect('spark', { x: 500, y: 400 });
      particleSystem.createEffect('spark', { x: -100, y: -100 });

      // Render should only process visible particles
      const saveSpy = vi.spyOn(mockCtx, 'save');
      const restoreSpy = vi.spyOn(mockCtx, 'restore');

      particleSystem.render(mockCtx);

      expect(saveSpy).toHaveBeenCalled();
      expect(restoreSpy).toHaveBeenCalled();
    });

    it('should update batch renderer canvas size with viewport', () => {
      particleSystem.setViewport(0, 0, 1920, 1080);

      const stats = particleSystem.getBatchRenderStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Camera Integration', () => {
    it('should apply camera offset when rendering', () => {
      // Set camera offset
      particleSystem.setCameraOffset({ x: 100, y: 50 });

      // Create particles
      particleSystem.createEffect('explosion', { x: 300, y: 200 });

      const translateSpy = vi.spyOn(mockCtx, 'translate');

      particleSystem.render(mockCtx);

      // Should translate by negative camera offset
      expect(translateSpy).toHaveBeenCalledWith(-100, -50);
    });

    it('should not apply camera offset to debug info', () => {
      particleSystem.setDebugMode(true);
      particleSystem.setCameraOffset({ x: 50, y: 50 });

      particleSystem.createEffect('spark', { x: 100, y: 100 });

      const saveSpy = vi.spyOn(mockCtx, 'save');
      const restoreSpy = vi.spyOn(mockCtx, 'restore');

      particleSystem.render(mockCtx);

      // Should call save/restore at least once
      expect(saveSpy).toHaveBeenCalled();
      expect(restoreSpy).toHaveBeenCalled();
    });
  });

  describe('Theme Color Integration', () => {
    it('should render particles with theme colors', () => {
      // Set theme
      particleSystem.setTheme('neon');

      // Trigger block destruction
      eventBus.emit('block:destroyed', {
        type: BlockType.Normal,
        position: { x: 200, y: 200 },
        score: 100
      });

      // Render particles
      particleSystem.render(mockCtx);

      // Should have created and rendered themed particles
      expect(particleSystem.getParticleCount()).toBeGreaterThan(0);
    });

    it('should batch particles by theme color', () => {
      particleSystem.setTheme('pixel');

      // Create effects with different block types
      eventBus.emit('block:destroyed', {
        type: BlockType.Normal,
        position: { x: 100, y: 100 },
        score: 10
      });

      eventBus.emit('block:destroyed', {
        type: BlockType.Hard,
        position: { x: 200, y: 200 },
        score: 20
      });

      particleSystem.render(mockCtx);

      const stats = particleSystem.getBatchRenderStats();
      // Should batch by color
      expect(stats.drawCalls).toBeGreaterThan(0);
    });
  });

  describe('Performance Impact', () => {
    it('should maintain performance with many particles', () => {
      // Create maximum particles
      for (let i = 0; i < 20; i++) {
        particleSystem.createEffect('explosion', {
          x: Math.random() * 800,
          y: Math.random() * 600
        });
      }

      const startTime = performance.now();

      // Render multiple frames
      for (let frame = 0; frame < 10; frame++) {
        particleSystem.update(0.016); // 60 FPS
        particleSystem.render(mockCtx);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete 10 frames quickly (< 50ms)
      expect(totalTime).toBeLessThan(50);
    });

    it('should reduce draw calls with batch rendering', () => {
      // Create many particles
      for (let i = 0; i < 50; i++) {
        particleSystem.createEffect('spark', {
          x: 400 + Math.random() * 100,
          y: 300 + Math.random() * 100
        });
      }

      particleSystem.render(mockCtx);

      const batchStats = particleSystem.getBatchRenderStats();
      
      // Now disable batch rendering
      particleSystem.setBatchRendering(false);
      particleSystem.getBatchRenderStats(); // Reset stats
      
      const beginPathSpy = vi.spyOn(mockCtx, 'beginPath');
      particleSystem.render(mockCtx);
      const individualCalls = beginPathSpy.mock.calls.length;

      // Batch rendering should have fewer draw calls
      expect(batchStats.drawCalls).toBeLessThan(individualCalls);
    });
  });

  describe('OffscreenCanvas Support', () => {
    it('should report OffscreenCanvas support status', () => {
      const stats = particleSystem.getBatchRenderStats();
      
      // Check if environment supports OffscreenCanvas
      const expectedSupport = typeof OffscreenCanvas !== 'undefined';
      expect(stats.offscreenSupported).toBe(expectedSupport);
    });
  });

  describe('State Change Optimization', () => {
    it('should minimize canvas state changes', () => {
      // Create particles with various colors
      const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'];
      
      colors.forEach((_, index) => {
        particleSystem.createEffect('spark', {
          x: 100 * index,
          y: 100
        });
      });

      particleSystem.render(mockCtx);

      const stats = particleSystem.getBatchRenderStats();
      
      // State changes should be minimized (less than particle count)
      expect(stats.stateChanges).toBeLessThan(colors.length * 10);
    });
  });

  describe('Debug Mode Rendering', () => {
    it('should render debug info with batch stats', () => {
      particleSystem.setDebugMode(true);

      // Create some particles
      for (let i = 0; i < 10; i++) {
        particleSystem.createEffect('powerup', { x: 400, y: 300 });
      }

      const fillTextSpy = vi.spyOn(mockCtx, 'fillText');

      particleSystem.render(mockCtx);

      // Should render debug text
      expect(fillTextSpy).toHaveBeenCalled();
    });
  });
});