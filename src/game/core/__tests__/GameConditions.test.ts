import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameConditions } from '../GameConditions';
import { GameState } from '../GameState';
import { GameEvents } from '../GameEvents';
import { GameInitializer } from '../GameInitializer';
import type { GameConfig } from '../../types/GameConfig';

describe('GameConditions', () => {
  let gameConditions: GameConditions;
  let gameState: GameState;
  let mockEventBus: GameEvents;

  beforeEach(() => {
    mockEventBus = new GameEvents();
    gameState = new GameState();
    gameConditions = new GameConditions(gameState, mockEventBus);
  });

  describe('Win Conditions', () => {
    it('should detect win when all blocks destroyed', () => {
      gameState.setBlocks([
        { id: '1', type: 'normal', destroyed: true },
        { id: '2', type: 'normal', destroyed: true },
        { id: '3', type: 'normal', destroyed: true }
      ]);
      
      expect(gameConditions.checkWinCondition()).toBe(true);
    });

    it('should not count unbreakable blocks for win', () => {
      gameState.setBlocks([
        { id: '1', type: 'normal', destroyed: true },
        { id: '2', type: 'unbreakable', destroyed: false }
      ]);
      
      expect(gameConditions.checkWinCondition()).toBe(true);
    });

    it('should not win if destroyable blocks remain', () => {
      gameState.setBlocks([
        { id: '1', type: 'normal', destroyed: true },
        { id: '2', type: 'normal', destroyed: false },
        { id: '3', type: 'hard', destroyed: false }
      ]);
      
      expect(gameConditions.checkWinCondition()).toBe(false);
    });

    it('should emit win event when condition met', () => {
      const winSpy = vi.fn();
      mockEventBus.on('game:win', winSpy);
      
      gameState.setBlocks([
        { id: '1', type: 'normal', destroyed: true }
      ]);
      
      gameConditions.evaluate();
      
      expect(winSpy).toHaveBeenCalledWith({
        type: 'game:win',
        score: expect.any(Number),
        time: expect.any(Number),
        level: expect.any(Number)
      });
    });

    it('should handle special win conditions', () => {
      // Time trial mode - win if score reached
      gameConditions.setMode('timeTrial');
      gameConditions.setTargetScore(1000);
      
      gameState.setScore(1001);
      expect(gameConditions.checkWinCondition()).toBe(true);
      
      // Survival mode - win if time survived
      gameConditions.setMode('survival');
      gameConditions.setTargetTime(60);
      
      gameState.setElapsedTime(61);
      expect(gameConditions.checkWinCondition()).toBe(true);
    });
  });

  describe('Lose Conditions', () => {
    it('should detect lose when no lives remain', () => {
      gameState.setLives(0);
      expect(gameConditions.checkLoseCondition()).toBe(true);
    });

    it('should not lose if lives remain', () => {
      gameState.setLives(1);
      expect(gameConditions.checkLoseCondition()).toBe(false);
    });

    it('should detect lose on time limit expiration', () => {
      gameConditions.setTimeLimit(30);
      gameState.setElapsedTime(31);
      
      expect(gameConditions.checkLoseCondition()).toBe(true);
    });

    it('should emit lose event when condition met', () => {
      const loseSpy = vi.fn();
      mockEventBus.on('game:lose', loseSpy);
      
      gameState.setLives(0);
      gameConditions.evaluate();
      
      expect(loseSpy).toHaveBeenCalledWith({
        type: 'game:lose',
        reason: 'noLives',
        score: expect.any(Number),
        level: expect.any(Number)
      });
    });

    it('should handle special lose conditions', () => {
      // Challenge mode - lose if combo broken
      gameConditions.setMode('challenge');
      gameConditions.setMinCombo(5);
      
      gameState.setCombo(3);
      gameConditions.onBallMissed();
      expect(gameConditions.checkLoseCondition()).toBe(true);
      
      // Hardcore mode - lose on any miss
      gameConditions.setMode('hardcore');
      gameConditions.onBallMissed();
      expect(gameConditions.checkLoseCondition()).toBe(true);
    });
  });

  describe('Draw Conditions', () => {
    it('should detect draw in specific scenarios', () => {
      // Ball stuck in infinite loop
      gameConditions.onBallPositionUnchanged(10); // 10 seconds
      expect(gameConditions.checkDrawCondition()).toBe(true);
      
      // No possible moves remaining
      gameState.setBlocks([
        { id: '1', type: 'unbreakable', destroyed: false }
      ]);
      gameState.setPowerUps([]);
      expect(gameConditions.checkDrawCondition()).toBe(true);
    });
  });

  describe('Condition Priority', () => {
    it('should check conditions in correct order', () => {
      // Win takes priority over lose
      gameState.setBlocks([]); // Win condition
      gameState.setLives(0); // Lose condition
      
      const result = gameConditions.evaluate();
      expect(result).toBe('win');
    });

    it('should not evaluate after game ends', () => {
      gameState.setLives(0);
      gameConditions.evaluate(); // Game ends
      
      // Reset for win but should not trigger
      gameState.setLives(3);
      gameState.setBlocks([]);
      
      const result = gameConditions.evaluate();
      expect(result).toBe('ended');
    });
  });

  describe('Condition Modifiers', () => {
    it('should apply difficulty modifiers', () => {
      gameConditions.setDifficulty('easy');
      expect(gameConditions.getLifeBonus()).toBe(2); // Extra lives
      
      gameConditions.setDifficulty('hard');
      expect(gameConditions.getLifeBonus()).toBe(-1); // Fewer lives
      
      gameConditions.setDifficulty('expert');
      expect(gameConditions.getTimeLimit()).toBeLessThan(60); // Strict time limit
    });

    it('should apply game mode modifiers', () => {
      gameConditions.setMode('zen');
      expect(gameConditions.hasLoseCondition()).toBe(false); // Can't lose
      
      gameConditions.setMode('arcade');
      expect(gameConditions.getScoreMultiplier()).toBeGreaterThan(1);
      
      gameConditions.setMode('puzzle');
      expect(gameConditions.hasMoveLimit()).toBe(true);
    });
  });
});

describe('GameInitializer', () => {
  let initializer: GameInitializer;
  let gameState: GameState;
  let mockEventBus: GameEvents;
  let config: GameConfig;

  beforeEach(() => {
    mockEventBus = new GameEvents();
    gameState = new GameState();
    config = {
      difficulty: 'normal',
      lives: 3,
      level: 1,
      soundEnabled: true,
      musicEnabled: true
    };
    initializer = new GameInitializer(gameState, mockEventBus);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Game Initialization', () => {
    it('should initialize with default configuration', () => {
      initializer.initialize();
      
      expect(gameState.getLives()).toBe(3);
      expect(gameState.getScore()).toBe(0);
      expect(gameState.getLevel()).toBe(1);
      expect(gameState.getStatus()).toBe('ready');
    });

    it('should apply custom configuration', () => {
      initializer.initialize({
        lives: 5,
        level: 3,
        difficulty: 'hard'
      });
      
      expect(gameState.getLives()).toBe(5);
      expect(gameState.getLevel()).toBe(3);
      expect(initializer.getDifficulty()).toBe('hard');
    });

    it('should load level data', async () => {
      await initializer.loadLevel(1);
      
      const levelData = gameState.getLevelData();
      expect(levelData).toBeDefined();
      expect(levelData.blocks).toBeInstanceOf(Array);
      expect(levelData.blocks.length).toBeGreaterThan(0);
    });

    it('should initialize game entities', () => {
      initializer.initializeEntities();
      
      expect(gameState.getBall()).toBeDefined();
      expect(gameState.getPaddle()).toBeDefined();
      expect(gameState.getBlocks()).toBeInstanceOf(Array);
    });

    it('should set up event listeners', () => {
      const eventSpy = vi.spyOn(mockEventBus, 'on');
      
      initializer.setupEventListeners();
      
      expect(eventSpy).toHaveBeenCalledWith('input:move', expect.any(Function));
      expect(eventSpy).toHaveBeenCalledWith('input:action', expect.any(Function));
      expect(eventSpy).toHaveBeenCalledWith('game:pause', expect.any(Function));
      expect(eventSpy).toHaveBeenCalledWith('game:resume', expect.any(Function));
    });

    it('should emit initialization events', () => {
      const initSpy = vi.fn();
      mockEventBus.on('game:initialized', initSpy);
      
      initializer.initialize();
      
      expect(initSpy).toHaveBeenCalledWith({
        type: 'game:initialized',
        config: expect.any(Object),
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Asset Loading', () => {
    it('should preload game assets', async () => {
      const assets = await initializer.preloadAssets();
      
      expect(assets.sprites).toBeDefined();
      expect(assets.sounds).toBeDefined();
      expect(assets.fonts).toBeDefined();
      expect(assets.loaded).toBe(true);
    });

    it('should handle asset loading errors', async () => {
      initializer.setAssetPath('/invalid/path');
      
      const assets = await initializer.preloadAssets();
      expect(assets.loaded).toBe(false);
      expect(assets.errors).toBeInstanceOf(Array);
      expect(assets.errors.length).toBeGreaterThan(0);
    });

    it('should emit loading progress events', async () => {
      const progressSpy = vi.fn();
      mockEventBus.on('assets:progress', progressSpy);
      
      await initializer.preloadAssets();
      
      expect(progressSpy).toHaveBeenCalled();
      expect(progressSpy).toHaveBeenCalledWith({
        type: 'assets:progress',
        loaded: expect.any(Number),
        total: expect.any(Number),
        percentage: expect.any(Number)
      });
    });
  });

  describe('Game Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      initializer.initialize();
      initializer.setupEventListeners();
      
      const removeSpy = vi.spyOn(mockEventBus, 'removeAllListeners');
      
      initializer.cleanup();
      
      expect(removeSpy).toHaveBeenCalled();
      expect(gameState.getStatus()).toBe('destroyed');
    });

    it('should cancel pending operations', () => {
      const cancelSpy = vi.fn();
      initializer.onCancel = cancelSpy;
      
      initializer.cleanup();
      
      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should save state before cleanup', () => {
      const saveSpy = vi.fn();
      initializer.onSave = saveSpy;
      
      gameState.setScore(100);
      gameState.setLevel(2);
      
      initializer.cleanup(true); // Save on cleanup
      
      expect(saveSpy).toHaveBeenCalledWith({
        score: 100,
        level: 2,
        lives: expect.any(Number)
      });
    });
  });

  describe('Reset and Restart', () => {
    it('should reset game to initial state', () => {
      gameState.setScore(1000);
      gameState.setLives(1);
      gameState.setLevel(5);
      
      initializer.reset();
      
      expect(gameState.getScore()).toBe(0);
      expect(gameState.getLives()).toBe(3);
      expect(gameState.getLevel()).toBe(1);
    });

    it('should restart with current level', () => {
      gameState.setLevel(3);
      gameState.setScore(500);
      gameState.setLives(1);
      
      initializer.restart();
      
      expect(gameState.getLevel()).toBe(3); // Same level
      expect(gameState.getScore()).toBe(0); // Reset score
      expect(gameState.getLives()).toBe(3); // Reset lives
    });

    it('should maintain configuration on restart', () => {
      initializer.initialize({ difficulty: 'hard', soundEnabled: false });
      
      initializer.restart();
      
      expect(initializer.getDifficulty()).toBe('hard');
      expect(initializer.isSoundEnabled()).toBe(false);
    });
  });

  describe('State Validation', () => {
    it('should validate game state integrity', () => {
      initializer.initialize();
      
      expect(initializer.validateState()).toBe(true);
      
      // Corrupt state
      gameState.setLives(-1);
      expect(initializer.validateState()).toBe(false);
      
      // Auto-fix on validation
      initializer.validateAndFix();
      expect(gameState.getLives()).toBe(0);
      expect(initializer.validateState()).toBe(true);
    });

    it('should detect initialization errors', () => {
      const errors = initializer.checkInitialization();
      
      expect(errors).toContain('notInitialized');
      
      initializer.initialize();
      const errors2 = initializer.checkInitialization();
      
      expect(errors2).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    it('should initialize quickly', () => {
      const startTime = performance.now();
      
      initializer.initialize();
      initializer.initializeEntities();
      initializer.setupEventListeners();
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle rapid reset cycles', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        initializer.reset();
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});