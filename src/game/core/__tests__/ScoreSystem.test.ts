import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScoreSystem } from '../ScoreSystem';
import { GameEvents } from '../GameEvents';
import { BlockType } from '../../entities/Block';
import type { GameEvent } from '../../types/Events';

describe('ScoreSystem', () => {
  let scoreSystem: ScoreSystem;
  let mockEventBus: GameEvents;

  beforeEach(() => {
    mockEventBus = new GameEvents();
    scoreSystem = new ScoreSystem(mockEventBus);
  });

  describe('Basic Scoring', () => {
    it('should initialize with zero score', () => {
      expect(scoreSystem.getScore()).toBe(0);
    });

    it('should add basic block score', () => {
      scoreSystem.addScore(10);
      expect(scoreSystem.getScore()).toBe(10);
    });

    it('should track high score', () => {
      scoreSystem.addScore(100);
      expect(scoreSystem.getHighScore()).toBe(100);
      
      scoreSystem.reset();
      scoreSystem.addScore(50);
      expect(scoreSystem.getHighScore()).toBe(100);
      
      scoreSystem.addScore(60);
      expect(scoreSystem.getHighScore()).toBe(110);
    });

    it('should reset score but maintain high score', () => {
      scoreSystem.addScore(200);
      const highScore = scoreSystem.getHighScore();
      
      scoreSystem.reset();
      expect(scoreSystem.getScore()).toBe(0);
      expect(scoreSystem.getHighScore()).toBe(highScore);
    });
  });

  describe('Block Type Scoring', () => {
    const blockScores = {
      [BlockType.NORMAL]: 10,
      [BlockType.HARD]: 20,
      [BlockType.METAL]: 30,
      [BlockType.GOLD]: 50,
      [BlockType.EXPLOSIVE]: 40,
      [BlockType.POWER_UP]: 25,
      [BlockType.UNBREAKABLE]: 0
    };

    Object.entries(blockScores).forEach(([type, score]) => {
      it(`should award ${score} points for ${type} block`, () => {
        scoreSystem.onBlockDestroyed(type as BlockType);
        expect(scoreSystem.getScore()).toBe(score);
      });
    });

    it('should not award points for unbreakable blocks', () => {
      scoreSystem.onBlockDestroyed(BlockType.UNBREAKABLE);
      expect(scoreSystem.getScore()).toBe(0);
    });
  });

  describe('Combo System', () => {
    it('should track consecutive hits', () => {
      expect(scoreSystem.getCombo()).toBe(0);
      
      scoreSystem.incrementCombo();
      expect(scoreSystem.getCombo()).toBe(1);
      
      scoreSystem.incrementCombo();
      expect(scoreSystem.getCombo()).toBe(2);
    });

    it('should reset combo on miss', () => {
      scoreSystem.incrementCombo();
      scoreSystem.incrementCombo();
      scoreSystem.incrementCombo();
      expect(scoreSystem.getCombo()).toBe(3);
      
      scoreSystem.resetCombo();
      expect(scoreSystem.getCombo()).toBe(0);
    });

    it('should track max combo', () => {
      scoreSystem.incrementCombo();
      scoreSystem.incrementCombo();
      scoreSystem.incrementCombo();
      expect(scoreSystem.getMaxCombo()).toBe(3);
      
      scoreSystem.resetCombo();
      scoreSystem.incrementCombo();
      expect(scoreSystem.getMaxCombo()).toBe(3);
      
      scoreSystem.incrementCombo();
      scoreSystem.incrementCombo();
      scoreSystem.incrementCombo();
      scoreSystem.incrementCombo();
      expect(scoreSystem.getMaxCombo()).toBe(5);
    });
  });

  describe('Score Multipliers', () => {
    it('should apply combo multiplier', () => {
      // No combo = 1x
      scoreSystem.addScore(10);
      expect(scoreSystem.getScore()).toBe(10);
      
      // 5 combo = 1.5x
      for (let i = 0; i < 5; i++) {
        scoreSystem.incrementCombo();
      }
      scoreSystem.addScore(10);
      expect(scoreSystem.getScore()).toBe(25); // 10 + (10 * 1.5)
      
      // 10 combo = 2x
      for (let i = 0; i < 5; i++) {
        scoreSystem.incrementCombo();
      }
      scoreSystem.addScore(10);
      expect(scoreSystem.getScore()).toBe(45); // 25 + (10 * 2)
    });

    it('should apply power-up multipliers', () => {
      scoreSystem.setMultiplier(2);
      scoreSystem.addScore(10);
      expect(scoreSystem.getScore()).toBe(20);
      
      scoreSystem.setMultiplier(3);
      scoreSystem.addScore(10);
      expect(scoreSystem.getScore()).toBe(50); // 20 + (10 * 3)
    });

    it('should stack combo and power-up multipliers', () => {
      // Set 2x power-up multiplier
      scoreSystem.setMultiplier(2);
      
      // Build 5 hit combo (1.5x)
      for (let i = 0; i < 5; i++) {
        scoreSystem.incrementCombo();
      }
      
      // Total multiplier should be 2 * 1.5 = 3x
      scoreSystem.addScore(10);
      expect(scoreSystem.getScore()).toBe(30);
    });

    it('should cap multiplier at maximum value', () => {
      scoreSystem.setMultiplier(10); // Exceeds max
      scoreSystem.addScore(10);
      expect(scoreSystem.getScore()).toBe(50); // Capped at 5x
    });

    it('should handle multiplier expiration', () => {
      scoreSystem.setMultiplier(2, 1000); // 1 second duration
      scoreSystem.addScore(10);
      expect(scoreSystem.getScore()).toBe(20);
      
      // Fast-forward time
      vi.advanceTimersByTime(1100);
      scoreSystem.update(1100);
      
      scoreSystem.addScore(10);
      expect(scoreSystem.getScore()).toBe(30); // Back to 1x
    });
  });

  describe('Special Scoring Events', () => {
    it('should award perfect clear bonus', () => {
      scoreSystem.onPerfectClear();
      expect(scoreSystem.getScore()).toBe(1000);
    });

    it('should award speed bonus', () => {
      scoreSystem.onSpeedBonus(30); // 30 seconds
      expect(scoreSystem.getScore()).toBe(500); // Base speed bonus
      
      scoreSystem.reset();
      scoreSystem.onSpeedBonus(15); // 15 seconds
      expect(scoreSystem.getScore()).toBe(1000); // Double speed bonus
    });

    it('should award no-miss bonus', () => {
      scoreSystem.onLevelComplete(true); // No misses
      expect(scoreSystem.getScore()).toBe(500);
      
      scoreSystem.reset();
      scoreSystem.onLevelComplete(false); // Had misses
      expect(scoreSystem.getScore()).toBe(0);
    });

    it('should award chain reaction bonus', () => {
      scoreSystem.onChainReaction(5); // 5 blocks
      expect(scoreSystem.getScore()).toBe(250); // 5 * 50
      
      scoreSystem.onChainReaction(10); // 10 blocks
      expect(scoreSystem.getScore()).toBe(750); // 250 + (10 * 50)
    });
  });

  describe('Score Events', () => {
    it('should emit score change events', () => {
      const scoreSpy = vi.fn();
      mockEventBus.on('score:changed', scoreSpy);
      
      scoreSystem.addScore(100);
      
      expect(scoreSpy).toHaveBeenCalledWith({
        type: 'score:changed',
        score: 100,
        delta: 100,
        multiplier: 1
      });
    });

    it('should emit combo events', () => {
      const comboSpy = vi.fn();
      mockEventBus.on('combo:changed', comboSpy);
      
      scoreSystem.incrementCombo();
      
      expect(comboSpy).toHaveBeenCalledWith({
        type: 'combo:changed',
        combo: 1,
        multiplier: 1
      });
    });

    it('should emit milestone events', () => {
      const milestoneSpy = vi.fn();
      mockEventBus.on('score:milestone', milestoneSpy);
      
      scoreSystem.addScore(1000);
      
      expect(milestoneSpy).toHaveBeenCalledWith({
        type: 'score:milestone',
        score: 1000,
        milestone: 1000
      });
      
      scoreSystem.addScore(4000);
      
      expect(milestoneSpy).toHaveBeenCalledWith({
        type: 'score:milestone',
        score: 5000,
        milestone: 5000
      });
    });

    it('should emit high score events', () => {
      const highScoreSpy = vi.fn();
      mockEventBus.on('score:highscore', highScoreSpy);
      
      scoreSystem.addScore(100);
      
      expect(highScoreSpy).toHaveBeenCalledWith({
        type: 'score:highscore',
        score: 100,
        previousHighScore: 0
      });
    });
  });

  describe('Score Calculation Formulas', () => {
    it('should calculate score with correct formula', () => {
      const baseScore = 10;
      const combo = 5;
      const multiplier = 2;
      
      // Formula: baseScore * comboMultiplier * powerUpMultiplier
      // comboMultiplier = 1 + (combo / 10)
      // Expected: 10 * 1.5 * 2 = 30
      
      scoreSystem.setMultiplier(multiplier);
      for (let i = 0; i < combo; i++) {
        scoreSystem.incrementCombo();
      }
      
      scoreSystem.addScore(baseScore);
      expect(scoreSystem.getScore()).toBe(30);
    });

    it('should calculate level completion score', () => {
      const blocksDestroyed = 50;
      const timeBonus = 500;
      const comboBonus = 200;
      const noMissBonus = 500;
      
      const totalScore = scoreSystem.calculateLevelScore({
        blocksDestroyed,
        timeBonus,
        maxCombo: 10,
        perfectClear: false,
        noMisses: true
      });
      
      expect(totalScore).toBe(
        blocksDestroyed * 10 + timeBonus + comboBonus + noMissBonus
      );
    });
  });

  describe('Score Persistence', () => {
    it('should save score to storage', () => {
      const saveSpy = vi.fn();
      scoreSystem.onSave = saveSpy;
      
      scoreSystem.addScore(100);
      scoreSystem.save();
      
      expect(saveSpy).toHaveBeenCalledWith({
        score: 100,
        highScore: 100,
        combo: 0,
        maxCombo: 0
      });
    });

    it('should load score from storage', () => {
      const savedData = {
        score: 500,
        highScore: 1000,
        combo: 5,
        maxCombo: 10
      };
      
      scoreSystem.load(savedData);
      
      expect(scoreSystem.getScore()).toBe(500);
      expect(scoreSystem.getHighScore()).toBe(1000);
      expect(scoreSystem.getCombo()).toBe(5);
      expect(scoreSystem.getMaxCombo()).toBe(10);
    });
  });

  describe('Performance', () => {
    it('should handle rapid score updates', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        scoreSystem.addScore(1);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10); // Should be very fast
      expect(scoreSystem.getScore()).toBe(1000);
    });

    it('should efficiently calculate complex multipliers', () => {
      scoreSystem.setMultiplier(3);
      for (let i = 0; i < 20; i++) {
        scoreSystem.incrementCombo();
      }
      
      const startTime = performance.now();
      scoreSystem.addScore(100);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1);
    });
  });
});