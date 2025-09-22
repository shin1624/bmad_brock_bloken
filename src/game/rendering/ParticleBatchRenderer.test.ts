import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParticleBatchRenderer } from './ParticleBatchRenderer';
import { Particle } from '../entities/Particle';
import { ParticleState } from '../../types/particle.types';

describe('ParticleBatchRenderer', () => {
  let renderer: ParticleBatchRenderer;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    renderer = new ParticleBatchRenderer({
      maxBatchSize: 10,
      enableBlending: true
    });

    // Create mock canvas context
    const canvas = document.createElement('canvas');
    mockCtx = canvas.getContext('2d')!;
    
    // Add missing drawImage method for test
    if (!mockCtx.drawImage) {
      (mockCtx as unknown).drawImage = vi.fn();
    }
  });

  describe('Particle Batching', () => {
    it('should batch particles by color and properties', () => {
      const particles = new Set<Particle>();
      
      // Add particles with same color
      for (let i = 0; i < 5; i++) {
        const particle = new Particle({
          position: { x: i * 10, y: i * 10 },
          velocity: { x: 0, y: 0 },
          color: '#FF0000',
          size: 2,
          lifespan: 1
        });
        particles.add(particle);
      }
      
      // Add particles with different color
      for (let i = 0; i < 3; i++) {
        const particle = new Particle({
          position: { x: i * 10, y: i * 10 },
          velocity: { x: 0, y: 0 },
          color: '#00FF00',
          size: 2,
          lifespan: 1
        });
        particles.add(particle);
      }
      
      const batches = renderer.batchParticles(particles);
      
      // Should create 2 batches (one per color)
      expect(batches.length).toBe(2);
      expect(batches[0].particles.length).toBe(5);
      expect(batches[1].particles.length).toBe(3);
    });

    it('should respect max batch size', () => {
      const particles = new Set<Particle>();
      
      // Add 15 particles with same properties
      for (let i = 0; i < 15; i++) {
        const particle = new Particle({
          position: { x: i * 10, y: i * 10 },
          velocity: { x: 0, y: 0 },
          color: '#FF0000',
          size: 2,
          lifespan: 1
        });
        particles.add(particle);
      }
      
      const batches = renderer.batchParticles(particles);
      
      // Should split into 2 batches (10 + 5) due to maxBatchSize
      expect(batches.length).toBe(2);
      expect(batches[0].particles.length).toBe(10);
      expect(batches[1].particles.length).toBe(5);
    });

    it('should skip inactive and dead particles', () => {
      const particles = new Set<Particle>();
      
      // Active particle
      const activeParticle = new Particle({
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        color: '#FF0000',
        size: 2,
        lifespan: 1
      });
      particles.add(activeParticle);
      
      // Inactive particle
      const inactiveParticle = new Particle({
        position: { x: 10, y: 10 },
        velocity: { x: 0, y: 0 },
        color: '#FF0000',
        size: 2,
        lifespan: 1
      });
      inactiveParticle.active = false;
      particles.add(inactiveParticle);
      
      // Dead particle
      const deadParticle = new Particle({
        position: { x: 20, y: 20 },
        velocity: { x: 0, y: 0 },
        color: '#FF0000',
        size: 2,
        lifespan: 0
      });
      deadParticle.state = ParticleState.Dead;
      particles.add(deadParticle);
      
      const batches = renderer.batchParticles(particles);
      
      // Should only include active particle
      expect(batches.length).toBe(1);
      expect(batches[0].particles.length).toBe(1);
    });
  });

  describe('Batch Rendering', () => {
    it('should minimize state changes when rendering', () => {
      const particles = new Set<Particle>();
      
      // Add particles with different colors
      const colors = ['#FF0000', '#00FF00', '#0000FF'];
      colors.forEach(color => {
        for (let i = 0; i < 3; i++) {
          const particle = new Particle({
            position: { x: i * 10, y: i * 10 },
            velocity: { x: 0, y: 0 },
            color,
            size: 2,
            lifespan: 1
          });
          particles.add(particle);
        }
      });
      
      const batches = renderer.batchParticles(particles);
      renderer.renderBatches(mockCtx, batches);
      
      const stats = renderer.getRenderStats();
      
      // Should have 3 draw calls (one per color)
      expect(stats.drawCalls).toBe(3);
      // State changes should be minimized
      expect(stats.stateChanges).toBeLessThanOrEqual(6); // Max 2 per batch
    });

    it('should render particles with correct alpha blending', () => {
      const particles = new Set<Particle>();
      
      const particle = new Particle({
        position: { x: 50, y: 50 },
        velocity: { x: 0, y: 0 },
        color: '#FF0000',
        size: 5,
        lifespan: 0.5,
        fadeOut: true
      });
      particle.maxLifespan = 1.0;
      particles.add(particle);
      
      const saveSpy = vi.spyOn(mockCtx, 'save');
      const restoreSpy = vi.spyOn(mockCtx, 'restore');
      
      const batches = renderer.batchParticles(particles);
      renderer.renderBatches(mockCtx, batches);
      
      expect(saveSpy).toHaveBeenCalled();
      expect(restoreSpy).toHaveBeenCalled();
    });
  });

  describe('OffscreenCanvas Support', () => {
    it('should detect OffscreenCanvas support', () => {
      const stats = renderer.getRenderStats();
      
      // Check if OffscreenCanvas is supported in test environment
      const isSupported = typeof OffscreenCanvas !== 'undefined';
      expect(stats.offscreenSupported).toBe(isSupported);
    });

    it('should update canvas size', () => {
      renderer.updateCanvasSize(1920, 1080);
      
      // Should not throw error
      expect(() => {
        renderer.updateCanvasSize(1280, 720);
      }).not.toThrow();
    });
  });

  describe('Point Sprite Rendering', () => {
    it('should render particles as point sprites', () => {
      const particles = new Set<Particle>();
      
      for (let i = 0; i < 5; i++) {
        const particle = new Particle({
          position: { x: i * 20, y: i * 20 },
          velocity: { x: 0, y: 0 },
          color: '#FFFFFF',
          size: 3,
          lifespan: 1
        });
        particles.add(particle);
      }
      
      const drawImageSpy = vi.spyOn(mockCtx, 'drawImage');
      
      renderer.renderAsPointSprites(mockCtx, particles);
      
      // Should call drawImage for each active particle
      expect(drawImageSpy).toHaveBeenCalledTimes(5);
    });
  });

  describe('Blend Mode Selection', () => {
    it('should use additive blending for glowing particles', () => {
      const particles = new Set<Particle>();
      
      const glowParticle = new Particle({
        position: { x: 50, y: 50 },
        velocity: { x: 0, y: 0 },
        color: '#FF0000',
        size: 5,
        lifespan: 1
      });
      glowParticle.glow = { intensity: 1, radius: 2 };
      particles.add(glowParticle);
      
      const batches = renderer.batchParticles(particles);
      
      expect(batches[0].blendMode).toBe('lighter');
    });

    it('should use normal blending for regular particles', () => {
      const particles = new Set<Particle>();
      
      const normalParticle = new Particle({
        position: { x: 50, y: 50 },
        velocity: { x: 0, y: 0 },
        color: '#00FF00',
        size: 3,
        lifespan: 1
      });
      particles.add(normalParticle);
      
      const batches = renderer.batchParticles(particles);
      
      expect(batches[0].blendMode).toBe('source-over');
    });
  });

  describe('Statistics', () => {
    it('should track draw calls and state changes', () => {
      const particles = new Set<Particle>();
      
      for (let i = 0; i < 10; i++) {
        const particle = new Particle({
          position: { x: i * 10, y: i * 10 },
          velocity: { x: 0, y: 0 },
          color: i % 2 === 0 ? '#FF0000' : '#00FF00',
          size: 2,
          lifespan: 1
        });
        particles.add(particle);
      }
      
      const batches = renderer.batchParticles(particles);
      renderer.renderBatches(mockCtx, batches);
      
      const stats = renderer.getRenderStats();
      
      expect(stats.drawCalls).toBeGreaterThan(0);
      expect(stats.stateChanges).toBeGreaterThan(0);
    });

    it('should clear statistics', () => {
      const particles = new Set<Particle>();
      
      const particle = new Particle({
        position: { x: 50, y: 50 },
        velocity: { x: 0, y: 0 },
        color: '#FF0000',
        size: 5,
        lifespan: 1
      });
      particles.add(particle);
      
      const batches = renderer.batchParticles(particles);
      renderer.renderBatches(mockCtx, batches);
      
      renderer.clearStats();
      
      const stats = renderer.getRenderStats();
      expect(stats.drawCalls).toBe(0);
      expect(stats.stateChanges).toBe(0);
    });
  });
});