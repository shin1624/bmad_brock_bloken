/**
 * Integration tests for Block System
 * Tests complete block destruction scenarios with particles, scoring, and events
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlockManager, LevelDefinition } from '../BlockManager';
import { ParticleSystem } from '../ParticleSystem';
import { ScoreManager } from '../ScoreManager';
import { CollisionDetector } from '../../physics/CollisionDetector';
import { EventBus } from '../../core/EventBus';
import { BlockType, Vector2D } from '../../../types/game.types';

describe('Block System Integration', () => {
  let blockManager: BlockManager;
  let particleSystem: ParticleSystem;
  let scoreManager: ScoreManager;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    blockManager = new BlockManager(eventBus);
    particleSystem = new ParticleSystem(eventBus, {
      maxParticles: 100,
      preFillCount: 10,
      enableDebugMode: false
    });
    scoreManager = new ScoreManager(eventBus);
  });

  describe('Complete Block Destruction Scenario', () => {
    const testLevel: LevelDefinition = {
      name: 'Test Integration Level',
      blocks: [
        { row: 0, column: 0, type: BlockType.Normal },
        { row: 0, column: 1, type: BlockType.Hard },
        { row: 0, column: 2, type: BlockType.Normal },
        { row: 1, column: 0, type: BlockType.Indestructible }
      ]
    };

    beforeEach(() => {
      blockManager.loadLevel(testLevel);
    });

    it('should handle complete block destruction workflow', () => {
      const initialBlocks = blockManager.getBlocks();
      const initialScore = scoreManager.getCurrentScore();
      const initialParticles = particleSystem.getParticleCount();

      expect(initialBlocks).toHaveLength(4);
      expect(initialScore).toBe(0);
      expect(initialParticles).toBe(0);

      // Destroy first normal block
      const normalBlock1 = initialBlocks.find(b => b.type === BlockType.Normal)!;
      const result1 = blockManager.handleBlockHit(normalBlock1.id);

      expect(result1.destroyed).toBe(true);
      expect(result1.score).toBe(100);
      expect(result1.combo).toBe(1);

      // Check particles were created
      particleSystem.update(0.001); // Small update to process particle creation
      expect(particleSystem.getParticleCount()).toBeGreaterThan(0);

      // Check score was updated
      expect(scoreManager.getCurrentScore()).toBeGreaterThan(initialScore);
      expect(scoreManager.getCombo()).toBe(1);
    });

    it('should handle hard block destruction with multiple hits', () => {
      const blocks = blockManager.getBlocks();
      const hardBlock = blocks.find(b => b.type === BlockType.Hard)!;
      const initialScore = scoreManager.getCurrentScore();

      // First hit - damage but don't destroy
      const result1 = blockManager.handleBlockHit(hardBlock.id);
      expect(result1.destroyed).toBe(false);
      expect(result1.score).toBe(0);

      // Score should not change for non-destructive hits
      expect(scoreManager.getCurrentScore()).toBe(initialScore);

      // Second hit - destroy
      const result2 = blockManager.handleBlockHit(hardBlock.id);
      expect(result2.destroyed).toBe(true);
      expect(result2.score).toBe(200);

      // Score should increase after destruction
      expect(scoreManager.getCurrentScore()).toBeGreaterThan(initialScore);
    });

    it('should handle combo system across multiple block destructions', () => {
      const blocks = blockManager.getBlocks();
      const normalBlocks = blocks.filter(b => b.type === BlockType.Normal);
      
      expect(normalBlocks).toHaveLength(2);

      // Destroy first normal block
      const result1 = blockManager.handleBlockHit(normalBlocks[0].id);
      expect(result1.combo).toBe(1);
      expect(result1.score).toBe(100); // Base score

      // Destroy second normal block quickly (combo should increase)
      const result2 = blockManager.handleBlockHit(normalBlocks[1].id);
      expect(result2.combo).toBe(2);
      expect(result2.score).toBeGreaterThan(100); // Base + combo bonus

      // Check final score includes combo bonuses
      const finalScore = scoreManager.getCurrentScore();
      expect(finalScore).toBe(result1.score + result2.score);
    });

    it('should not affect indestructible blocks', () => {
      const blocks = blockManager.getBlocks();
      const indestructibleBlock = blocks.find(b => b.type === BlockType.Indestructible)!;
      const initialScore = scoreManager.getCurrentScore();
      const initialParticles = particleSystem.getParticleCount();

      const result = blockManager.handleBlockHit(indestructibleBlock.id);

      expect(result.destroyed).toBe(false);
      expect(result.score).toBe(0);
      expect(result.combo).toBe(0);

      // No changes should occur
      expect(scoreManager.getCurrentScore()).toBe(initialScore);
      particleSystem.update(0.001);
      expect(particleSystem.getParticleCount()).toBe(initialParticles);
    });

    it('should detect level completion', () => {
      const blocks = blockManager.getBlocks();
      const destructibleBlocks = blocks.filter(b => b.type !== BlockType.Indestructible);
      
      let levelCleared = false;
      eventBus.on('level:cleared', () => {
        levelCleared = true;
      });

      // Destroy all destructible blocks
      destructibleBlocks.forEach(block => {
        if (block.type === BlockType.Hard) {
          blockManager.handleBlockHit(block.id); // First hit
          blockManager.handleBlockHit(block.id); // Second hit
        } else {
          blockManager.handleBlockHit(block.id); // Single hit
        }
      });

      expect(levelCleared).toBe(true);
      expect(blockManager.getRemainingDestructibleBlocks()).toBe(0);
    });
  });

  describe('Ball-Block Collision Integration', () => {
    beforeEach(() => {
      blockManager.loadDefaultLevel();
    });

    it('should detect ball-block collisions correctly', () => {
      const blocks = blockManager.getBlocks();
      const testBlock = blocks[0];
      const blockBounds = testBlock.getBounds();

      // Simulate ball approaching block
      const ballPosition: Vector2D = { 
        x: blockBounds.x - 20, 
        y: blockBounds.y + blockBounds.height / 2 
      };
      const ballVelocity: Vector2D = { x: 100, y: 0 };
      const ballRadius = 8;

      const collision = CollisionDetector.checkBallBlockCollision(
        ballPosition,
        ballRadius,
        ballVelocity,
        blockBounds,
        0.016
      );

      expect(collision.collided).toBe(true);
      expect(collision.contactPoint).toBeDefined();
      expect(collision.blockHit).toBe(true);
    });

    it('should handle multiple block collisions', () => {
      const blocks = blockManager.getBlocks();
      const blockBounds = blocks.slice(0, 3).map(block => ({
        id: block.id,
        bounds: block.getBounds(),
        active: true
      }));

      // Ball position that could hit multiple blocks
      const ballPosition: Vector2D = { x: 60, y: 120 };
      const ballVelocity: Vector2D = { x: 50, y: 50 };
      const ballRadius = 8;

      const collision = CollisionDetector.checkBallBlocksCollision(
        ballPosition,
        ballRadius,
        ballVelocity,
        blockBounds,
        0.016
      );

      if (collision) {
        expect(collision.blockId).toBeDefined();
        expect(collision.collision.collided).toBe(true);
        expect(collision.collision.contactPoint).toBeDefined();
      }
    });
  });

  describe('Particle System Integration', () => {
    it('should create particles on block destruction', () => {
      blockManager.loadLevel({
        name: 'Particle Test',
        blocks: [{ row: 2, column: 2, type: BlockType.Normal }]
      });

      const initialParticles = particleSystem.getParticleCount();
      const blocks = blockManager.getBlocks();
      
      // Destroy block to trigger particle effect
      blockManager.handleBlockHit(blocks[0].id);
      
      // Update particle system to process new particles
      particleSystem.update(0.001);
      
      expect(particleSystem.getParticleCount()).toBeGreaterThan(initialParticles);
    });

    it('should create different particle effects for different block types', () => {
      blockManager.loadLevel({
        name: 'Multi-Type Test',
        blocks: [
          { row: 0, column: 0, type: BlockType.Normal },
          { row: 0, column: 1, type: BlockType.Hard }
        ]
      });

      const blocks = blockManager.getBlocks();
      
      // Destroy normal block
      blockManager.handleBlockHit(blocks[0].id);
      particleSystem.update(0.001);
      const particlesAfterNormal = particleSystem.getParticleCount();

      // Hit hard block (should create hit effect, not destruction)
      const hardBlock = blocks[1];
      blockManager.handleBlockHit(hardBlock.id);
      particleSystem.update(0.001);
      const particlesAfterHardHit = particleSystem.getParticleCount();

      expect(particlesAfterHardHit).toBeGreaterThan(particlesAfterNormal);

      // Destroy hard block (should create destruction effect)
      blockManager.handleBlockHit(hardBlock.id);
      particleSystem.update(0.001);
      const particlesAfterHardDestroy = particleSystem.getParticleCount();

      expect(particlesAfterHardDestroy).toBeGreaterThan(particlesAfterHardHit);
    });

    it('should manage particle lifecycle correctly', () => {
      blockManager.loadLevel({
        name: 'Lifecycle Test',
        blocks: [{ row: 1, column: 1, type: BlockType.Normal }]
      });

      const blocks = blockManager.getBlocks();
      blockManager.handleBlockHit(blocks[0].id);
      
      // Particles should be created
      particleSystem.update(0.001);
      const initialCount = particleSystem.getParticleCount();
      expect(initialCount).toBeGreaterThan(0);

      // After their lifespan, particles should be removed
      particleSystem.update(1.0); // 1 second (longer than typical particle lifespan)
      const finalCount = particleSystem.getParticleCount();
      expect(finalCount).toBeLessThan(initialCount);
    });
  });

  describe('Score System Integration', () => {
    it('should track session statistics correctly', () => {
      blockManager.loadLevel({
        name: 'Stats Test',
        blocks: [
          { row: 0, column: 0, type: BlockType.Normal },
          { row: 0, column: 1, type: BlockType.Hard }
        ]
      });

      const blocks = blockManager.getBlocks();
      
      // Destroy blocks
      blockManager.handleBlockHit(blocks[0].id); // Normal
      blockManager.handleBlockHit(blocks[1].id); // Hard - first hit
      blockManager.handleBlockHit(blocks[1].id); // Hard - destroy

      const stats = scoreManager.getStatistics();
      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.sessionDuration).toBeGreaterThanOrEqual(0); // Allow 0 for very fast tests
    });

    it('should handle combo timeout correctly', () => {
      blockManager.loadLevel({
        name: 'Combo Timeout Test',
        blocks: [
          { row: 0, column: 0, type: BlockType.Normal },
          { row: 0, column: 1, type: BlockType.Normal }
        ]
      });

      const blocks = blockManager.getBlocks();
      
      // First destruction
      blockManager.handleBlockHit(blocks[0].id);
      expect(scoreManager.getCombo()).toBe(1);

      // Simulate time passing beyond combo timeout
      blockManager.update(3.0); // 3 seconds
      scoreManager.update(3000); // 3000ms
      
      expect(scoreManager.getCombo()).toBe(0);

      // Second destruction should reset combo to 1
      blockManager.handleBlockHit(blocks[1].id);
      expect(scoreManager.getCombo()).toBe(1);
    });

    it('should persist high scores', () => {
      const initialHighScore = scoreManager.getHighScore();
      
      blockManager.loadLevel({
        name: 'High Score Test',
        blocks: [
          { row: 0, column: 0, type: BlockType.Hard },
          { row: 0, column: 1, type: BlockType.Hard }
        ]
      });

      const blocks = blockManager.getBlocks();
      
      // Create high score by destroying blocks with combo
      blocks.forEach(block => {
        blockManager.handleBlockHit(block.id); // First hit
        blockManager.handleBlockHit(block.id); // Destroy
      });

      const newScore = scoreManager.getCurrentScore();
      if (newScore > initialHighScore) {
        expect(scoreManager.getHighScore()).toBe(newScore);
      }
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large numbers of particles efficiently', () => {
      // Create level with many blocks
      const manyBlocks: LevelDefinition = {
        name: 'Performance Test',
        blocks: Array.from({ length: 20 }, (_, i) => ({
          row: Math.floor(i / 10),
          column: i % 10,
          type: BlockType.Normal
        }))
      };

      blockManager.loadLevel(manyBlocks);
      const blocks = blockManager.getBlocks();

      const startTime = performance.now();
      
      // Destroy many blocks quickly
      blocks.forEach(block => {
        blockManager.handleBlockHit(block.id);
      });

      // Update systems
      particleSystem.update(0.016);
      scoreManager.update(16);
      blockManager.update(0.016);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time (less than 100ms)
      expect(processingTime).toBeLessThan(100);

      // Particle system should manage memory efficiently
      const stats = particleSystem.getStats();
      expect(stats.poolStats.utilizationRate).toBeLessThanOrEqual(1);
    });

    it('should clean up resources properly', () => {
      blockManager.loadDefaultLevel();
      const initialBlocks = blockManager.getBlocks().length;
      
      particleSystem.clear();
      scoreManager.resetScore();
      blockManager.clearAllBlocks();

      expect(blockManager.getBlocks()).toHaveLength(0);
      expect(particleSystem.getParticleCount()).toBe(0);
      expect(scoreManager.getCurrentScore()).toBe(0);
      expect(scoreManager.getCombo()).toBe(0);
    });
  });

  afterEach(() => {
    // Cleanup
    particleSystem.destroy();
    scoreManager.destroy();
    blockManager.clearAllBlocks();
  });
});