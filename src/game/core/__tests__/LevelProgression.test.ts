import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LevelProgression } from '../LevelProgression';
import { GameEvents } from '../GameEvents';
import type { Level } from '../../types/Level';

describe('LevelProgression', () => {
  let levelProgression: LevelProgression;
  let mockEventBus: GameEvents;

  beforeEach(() => {
    mockEventBus = new GameEvents();
    levelProgression = new LevelProgression(mockEventBus);
  });

  describe('Level Initialization', () => {
    it('should start at level 1', () => {
      expect(levelProgression.getCurrentLevel()).toBe(1);
    });

    it('should load first level configuration', () => {
      const levelConfig = levelProgression.getCurrentLevelConfig();
      expect(levelConfig).toBeDefined();
      expect(levelConfig.number).toBe(1);
      expect(levelConfig.blocks).toBeDefined();
    });

    it('should track total levels available', () => {
      expect(levelProgression.getTotalLevels()).toBeGreaterThan(0);
    });

    it('should initialize level state', () => {
      const state = levelProgression.getLevelState();
      expect(state.blocksRemaining).toBeGreaterThan(0);
      expect(state.blocksDestroyed).toBe(0);
      expect(state.powerUpsCollected).toBe(0);
      expect(state.startTime).toBeDefined();
    });
  });

  describe('Level Completion', () => {
    it('should detect level completion', () => {
      const state = levelProgression.getLevelState();
      const totalBlocks = state.blocksRemaining;
      
      // Destroy all blocks
      for (let i = 0; i < totalBlocks; i++) {
        levelProgression.onBlockDestroyed();
      }
      
      expect(levelProgression.isLevelComplete()).toBe(true);
    });

    it('should calculate completion percentage', () => {
      const state = levelProgression.getLevelState();
      const totalBlocks = state.blocksRemaining;
      
      expect(levelProgression.getCompletionPercentage()).toBe(0);
      
      // Destroy half the blocks
      for (let i = 0; i < totalBlocks / 2; i++) {
        levelProgression.onBlockDestroyed();
      }
      
      expect(levelProgression.getCompletionPercentage()).toBeCloseTo(50, 0);
    });

    it('should track level completion time', () => {
      vi.useFakeTimers();
      const startTime = Date.now();
      vi.setSystemTime(startTime);
      
      levelProgression.startLevel();
      
      // Fast forward 30 seconds
      vi.advanceTimersByTime(30000);
      
      const completionTime = levelProgression.completeLevel();
      expect(completionTime).toBeCloseTo(30, 0);
      
      vi.useRealTimers();
    });

    it('should award stars based on performance', () => {
      const state = levelProgression.getLevelState();
      const totalBlocks = state.blocksRemaining;
      
      // Perfect run - 3 stars
      for (let i = 0; i < totalBlocks; i++) {
        levelProgression.onBlockDestroyed();
      }
      const stars = levelProgression.calculateStars({
        timeSeconds: 20,
        accuracy: 100,
        combosUsed: true
      });
      expect(stars).toBe(3);
      
      // Good run - 2 stars
      const stars2 = levelProgression.calculateStars({
        timeSeconds: 60,
        accuracy: 80,
        combosUsed: false
      });
      expect(stars2).toBe(2);
      
      // Poor run - 1 star
      const stars1 = levelProgression.calculateStars({
        timeSeconds: 120,
        accuracy: 50,
        combosUsed: false
      });
      expect(stars1).toBe(1);
    });
  });

  describe('Level Progression', () => {
    it('should advance to next level', () => {
      expect(levelProgression.getCurrentLevel()).toBe(1);
      
      levelProgression.nextLevel();
      expect(levelProgression.getCurrentLevel()).toBe(2);
      
      levelProgression.nextLevel();
      expect(levelProgression.getCurrentLevel()).toBe(3);
    });

    it('should not advance beyond max level', () => {
      const totalLevels = levelProgression.getTotalLevels();
      
      // Advance to last level
      for (let i = 1; i < totalLevels; i++) {
        levelProgression.nextLevel();
      }
      
      expect(levelProgression.getCurrentLevel()).toBe(totalLevels);
      
      // Try to advance beyond
      levelProgression.nextLevel();
      expect(levelProgression.getCurrentLevel()).toBe(totalLevels);
      expect(levelProgression.isGameComplete()).toBe(true);
    });

    it('should unlock levels progressively', () => {
      expect(levelProgression.isLevelUnlocked(1)).toBe(true);
      expect(levelProgression.isLevelUnlocked(2)).toBe(false);
      expect(levelProgression.isLevelUnlocked(3)).toBe(false);
      
      levelProgression.completeLevel();
      levelProgression.nextLevel();
      
      expect(levelProgression.isLevelUnlocked(2)).toBe(true);
      expect(levelProgression.isLevelUnlocked(3)).toBe(false);
    });

    it('should allow replay of completed levels', () => {
      levelProgression.completeLevel();
      levelProgression.nextLevel();
      
      expect(levelProgression.getCurrentLevel()).toBe(2);
      
      levelProgression.selectLevel(1);
      expect(levelProgression.getCurrentLevel()).toBe(1);
      expect(levelProgression.isLevelUnlocked(1)).toBe(true);
    });
  });

  describe('Difficulty Scaling', () => {
    it('should increase difficulty with level', () => {
      const level1 = levelProgression.getCurrentLevelConfig();
      
      levelProgression.nextLevel();
      const level2 = levelProgression.getCurrentLevelConfig();
      
      levelProgression.nextLevel();
      const level3 = levelProgression.getCurrentLevelConfig();
      
      // Ball speed increases
      expect(level2.ballSpeed).toBeGreaterThan(level1.ballSpeed);
      expect(level3.ballSpeed).toBeGreaterThan(level2.ballSpeed);
      
      // Paddle size may decrease
      expect(level2.paddleWidth).toBeLessThanOrEqual(level1.paddleWidth);
      expect(level3.paddleWidth).toBeLessThanOrEqual(level2.paddleWidth);
    });

    it('should add more challenging block types', () => {
      const level1 = levelProgression.getCurrentLevelConfig();
      const level1HardBlocks = level1.blocks.filter(b => b.type === 'hard').length;
      
      // Advance to level 5
      for (let i = 0; i < 4; i++) {
        levelProgression.nextLevel();
      }
      
      const level5 = levelProgression.getCurrentLevelConfig();
      const level5HardBlocks = level5.blocks.filter(b => b.type === 'hard').length;
      
      expect(level5HardBlocks).toBeGreaterThan(level1HardBlocks);
    });

    it('should introduce special blocks at higher levels', () => {
      // Level 1 - mostly normal blocks
      const level1 = levelProgression.getCurrentLevelConfig();
      const level1Specials = level1.blocks.filter(
        b => ['explosive', 'powerup', 'metal'].includes(b.type)
      ).length;
      
      // Level 10
      for (let i = 0; i < 9; i++) {
        levelProgression.nextLevel();
      }
      
      const level10 = levelProgression.getCurrentLevelConfig();
      const level10Specials = level10.blocks.filter(
        b => ['explosive', 'powerup', 'metal'].includes(b.type)
      ).length;
      
      expect(level10Specials).toBeGreaterThan(level1Specials);
    });
  });

  describe('Level Requirements', () => {
    it('should enforce minimum score requirements', () => {
      const requirements = levelProgression.getLevelRequirements(2);
      expect(requirements.minScore).toBeDefined();
      expect(requirements.minScore).toBeGreaterThan(0);
      
      const canProgress = levelProgression.canProgressToLevel(2, {
        score: requirements.minScore - 1,
        stars: 1
      });
      expect(canProgress).toBe(false);
      
      const canProgress2 = levelProgression.canProgressToLevel(2, {
        score: requirements.minScore,
        stars: 1
      });
      expect(canProgress2).toBe(true);
    });

    it('should require star ratings for bonus levels', () => {
      const bonusLevelRequirements = levelProgression.getLevelRequirements(10);
      expect(bonusLevelRequirements.minStars).toBeGreaterThanOrEqual(2);
    });

    it('should track cumulative requirements', () => {
      const totalStarsRequired = levelProgression.getTotalStarsRequired(5);
      expect(totalStarsRequired).toBeGreaterThan(0);
      
      const totalScoreRequired = levelProgression.getTotalScoreRequired(5);
      expect(totalScoreRequired).toBeGreaterThan(0);
    });
  });

  describe('Level State Management', () => {
    it('should reset level state on restart', () => {
      // Destroy some blocks
      levelProgression.onBlockDestroyed();
      levelProgression.onBlockDestroyed();
      
      const state = levelProgression.getLevelState();
      expect(state.blocksDestroyed).toBe(2);
      
      levelProgression.restartLevel();
      
      const newState = levelProgression.getLevelState();
      expect(newState.blocksDestroyed).toBe(0);
      expect(newState.blocksRemaining).toBe(
        levelProgression.getCurrentLevelConfig().blocks.length
      );
    });

    it('should save level progress', () => {
      levelProgression.onBlockDestroyed();
      levelProgression.onPowerUpCollected();
      
      const saveData = levelProgression.save();
      expect(saveData.currentLevel).toBe(1);
      expect(saveData.levelState.blocksDestroyed).toBe(1);
      expect(saveData.levelState.powerUpsCollected).toBe(1);
      expect(saveData.unlockedLevels).toContain(1);
    });

    it('should load level progress', () => {
      const saveData = {
        currentLevel: 3,
        unlockedLevels: [1, 2, 3],
        levelScores: { 1: 1000, 2: 2000 },
        levelStars: { 1: 3, 2: 2 },
        levelState: {
          blocksRemaining: 10,
          blocksDestroyed: 5,
          powerUpsCollected: 2,
          startTime: Date.now()
        }
      };
      
      levelProgression.load(saveData);
      
      expect(levelProgression.getCurrentLevel()).toBe(3);
      expect(levelProgression.isLevelUnlocked(3)).toBe(true);
      expect(levelProgression.getLevelScore(1)).toBe(1000);
      expect(levelProgression.getLevelStars(2)).toBe(2);
    });
  });

  describe('Level Events', () => {
    it('should emit level start event', () => {
      const startSpy = vi.fn();
      mockEventBus.on('level:start', startSpy);
      
      levelProgression.startLevel();
      
      expect(startSpy).toHaveBeenCalledWith({
        type: 'level:start',
        level: 1,
        config: expect.any(Object)
      });
    });

    it('should emit level complete event', () => {
      const completeSpy = vi.fn();
      mockEventBus.on('level:complete', completeSpy);
      
      const state = levelProgression.getLevelState();
      for (let i = 0; i < state.blocksRemaining; i++) {
        levelProgression.onBlockDestroyed();
      }
      
      levelProgression.completeLevel();
      
      expect(completeSpy).toHaveBeenCalledWith({
        type: 'level:complete',
        level: 1,
        score: expect.any(Number),
        stars: expect.any(Number),
        time: expect.any(Number)
      });
    });

    it('should emit progress update events', () => {
      const progressSpy = vi.fn();
      mockEventBus.on('level:progress', progressSpy);
      
      levelProgression.onBlockDestroyed();
      
      expect(progressSpy).toHaveBeenCalledWith({
        type: 'level:progress',
        percentage: expect.any(Number),
        blocksRemaining: expect.any(Number),
        blocksDestroyed: 1
      });
    });

    it('should emit game complete event', () => {
      const gameCompleteSpy = vi.fn();
      mockEventBus.on('game:complete', gameCompleteSpy);
      
      const totalLevels = levelProgression.getTotalLevels();
      
      // Complete all levels
      for (let i = 1; i <= totalLevels; i++) {
        levelProgression.completeLevel();
        if (i < totalLevels) {
          levelProgression.nextLevel();
        }
      }
      
      expect(gameCompleteSpy).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle rapid block destruction', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        levelProgression.onBlockDestroyed();
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(10);
    });

    it('should efficiently calculate level requirements', () => {
      const startTime = performance.now();
      
      for (let level = 1; level <= 20; level++) {
        levelProgression.getLevelRequirements(level);
        levelProgression.canProgressToLevel(level, { score: 1000, stars: 2 });
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(5);
    });
  });
});