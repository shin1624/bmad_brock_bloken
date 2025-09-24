/**
 * GameStore Tests - Zustand State Management
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useGameStore } from '../gameStore';
import { createMockBall, createMockPaddle, createMockBlock, createMockPowerUp } from '@test/fixtures/gameData';

describe('GameStore - State Management', () => {
  beforeEach(() => {
    // Reset store to initial state
    useGameStore.setState({
      gameStatus: 'idle',
      score: 0,
      lives: 3,
      level: 1,
      balls: [],
      paddle: null,
      blocks: [],
      powerUps: [],
      activePowerUps: [],
      combo: 0,
      highScore: 0,
      isPaused: false,
      difficulty: 'normal',
      soundEnabled: true,
      musicEnabled: true,
      particlesEnabled: true
    });
  });
  
  describe('Game Status Management', () => {
    it('should initialize with idle status', () => {
      const { result } = renderHook(() => useGameStore());
      expect(result.current.gameStatus).toBe('idle');
    });
    
    it('should transition game status correctly', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setGameStatus('playing');
      });
      expect(result.current.gameStatus).toBe('playing');
      
      act(() => {
        result.current.setGameStatus('paused');
      });
      expect(result.current.gameStatus).toBe('paused');
    });
    
    it('should handle pause/resume correctly', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setGameStatus('playing');
        result.current.pauseGame();
      });
      
      expect(result.current.isPaused).toBe(true);
      expect(result.current.gameStatus).toBe('paused');
      
      act(() => {
        result.current.resumeGame();
      });
      
      expect(result.current.isPaused).toBe(false);
      expect(result.current.gameStatus).toBe('playing');
    });
    
    it('should start new game correctly', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.startNewGame();
      });
      
      expect(result.current.gameStatus).toBe('playing');
      expect(result.current.score).toBe(0);
      expect(result.current.lives).toBe(3);
      expect(result.current.level).toBe(1);
      expect(result.current.combo).toBe(0);
    });
    
    it('should handle game over', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setScore(1000);
        result.current.setLives(0);
        result.current.endGame();
      });
      
      expect(result.current.gameStatus).toBe('gameover');
      expect(result.current.highScore).toBe(1000);
    });
  });
  
  describe('Score Management', () => {
    it('should update score', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.addScore(100);
      });
      expect(result.current.score).toBe(100);
      
      act(() => {
        result.current.addScore(50);
      });
      expect(result.current.score).toBe(150);
    });
    
    it('should apply combo multiplier', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setCombo(3);
        result.current.addScoreWithCombo(100);
      });
      
      expect(result.current.score).toBe(300);
    });
    
    it('should update high score when exceeded', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setHighScore(500);
        result.current.setScore(600);
        result.current.updateHighScore();
      });
      
      expect(result.current.highScore).toBe(600);
    });
    
    it('should track score history', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.addScore(100);
        result.current.addScore(200);
        result.current.addScore(300);
      });
      
      const history = result.current.getScoreHistory();
      expect(history).toHaveLength(3);
      expect(history[2]).toBe(600);
    });
  });
  
  describe('Entity Management', () => {
    it('should manage balls', () => {
      const { result } = renderHook(() => useGameStore());
      const ball = createMockBall();
      
      act(() => {
        result.current.addBall(ball);
      });
      expect(result.current.balls).toHaveLength(1);
      
      act(() => {
        result.current.removeBall(ball.id);
      });
      expect(result.current.balls).toHaveLength(0);
    });
    
    it('should manage paddle', () => {
      const { result } = renderHook(() => useGameStore());
      const paddle = createMockPaddle();
      
      act(() => {
        result.current.setPaddle(paddle);
      });
      expect(result.current.paddle).toBe(paddle);
      
      act(() => {
        result.current.updatePaddle({ width: 150 });
      });
      expect(result.current.paddle?.width).toBe(150);
    });
    
    it('should manage blocks', () => {
      const { result } = renderHook(() => useGameStore());
      const blocks = [
        createMockBlock({ id: 'block-1' }),
        createMockBlock({ id: 'block-2' })
      ];
      
      act(() => {
        result.current.setBlocks(blocks);
      });
      expect(result.current.blocks).toHaveLength(2);
      
      act(() => {
        result.current.destroyBlock('block-1');
      });
      expect(result.current.blocks).toHaveLength(1);
      expect(result.current.blocks[0].id).toBe('block-2');
    });
    
    it('should manage power-ups', () => {
      const { result } = renderHook(() => useGameStore());
      const powerUp = createMockPowerUp();
      
      act(() => {
        result.current.spawnPowerUp(powerUp);
      });
      expect(result.current.powerUps).toHaveLength(1);
      
      act(() => {
        result.current.collectPowerUp(powerUp.id);
      });
      expect(result.current.powerUps).toHaveLength(0);
      expect(result.current.activePowerUps).toHaveLength(1);
    });
  });
  
  describe('Level Management', () => {
    it('should advance levels', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.nextLevel();
      });
      expect(result.current.level).toBe(2);
      
      act(() => {
        result.current.nextLevel();
      });
      expect(result.current.level).toBe(3);
    });
    
    it('should load level data', () => {
      const { result } = renderHook(() => useGameStore());
      const levelData = {
        blocks: [createMockBlock(), createMockBlock()],
        powerUps: ['multiball', 'expand'],
        ballSpeed: 250
      };
      
      act(() => {
        result.current.loadLevel(2, levelData);
      });
      
      expect(result.current.level).toBe(2);
      expect(result.current.blocks).toHaveLength(2);
    });
    
    it('should reset combo on level change', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setCombo(5);
        result.current.nextLevel();
      });
      
      expect(result.current.combo).toBe(0);
    });
  });
  
  describe('Settings Management', () => {
    it('should toggle sound', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.toggleSound();
      });
      expect(result.current.soundEnabled).toBe(false);
      
      act(() => {
        result.current.toggleSound();
      });
      expect(result.current.soundEnabled).toBe(true);
    });
    
    it('should toggle music', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.toggleMusic();
      });
      expect(result.current.musicEnabled).toBe(false);
    });
    
    it('should toggle particles', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.toggleParticles();
      });
      expect(result.current.particlesEnabled).toBe(false);
    });
    
    it('should set difficulty', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setDifficulty('hard');
      });
      expect(result.current.difficulty).toBe('hard');
      
      // Should affect game parameters
      expect(result.current.getGameSpeed()).toBeGreaterThan(1);
    });
  });
  
  describe('Selectors', () => {
    it('should calculate if game is active', () => {
      const { result } = renderHook(() => useGameStore());
      
      expect(result.current.isGameActive()).toBe(false);
      
      act(() => {
        result.current.setGameStatus('playing');
      });
      expect(result.current.isGameActive()).toBe(true);
      
      act(() => {
        result.current.setGameStatus('paused');
      });
      expect(result.current.isGameActive()).toBe(false);
    });
    
    it('should calculate remaining blocks', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setBlocks([
          createMockBlock({ destructible: true }),
          createMockBlock({ destructible: true }),
          createMockBlock({ destructible: false })
        ]);
      });
      
      expect(result.current.getRemainingBlocks()).toBe(2);
    });
    
    it('should check win condition', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setBlocks([
          createMockBlock({ destructible: false })
        ]);
      });
      
      expect(result.current.hasWon()).toBe(true);
    });
    
    it('should get active power-up types', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.activatePowerUp('multiball', 5000);
        result.current.activatePowerUp('expand', 3000);
      });
      
      const types = result.current.getActivePowerUpTypes();
      expect(types).toContain('multiball');
      expect(types).toContain('expand');
    });
  });
  
  describe('Computed Properties', () => {
    it('should calculate score multiplier', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setCombo(5);
        result.current.setDifficulty('hard');
      });
      
      const multiplier = result.current.getScoreMultiplier();
      expect(multiplier).toBeGreaterThan(5);
    });
    
    it('should calculate ball speed modifier', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setLevel(5);
        result.current.setDifficulty('easy');
      });
      
      const modifier = result.current.getBallSpeedModifier();
      expect(modifier).toBeLessThan(1);
    });
    
    it('should calculate paddle size modifier', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.activatePowerUp('expand', 5000);
        result.current.setDifficulty('easy');
      });
      
      const modifier = result.current.getPaddleSizeModifier();
      expect(modifier).toBeGreaterThan(1);
    });
  });
  
  describe('Persistence', () => {
    it('should save game state', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setScore(1500);
        result.current.setLevel(3);
        result.current.saveGameState();
      });
      
      const saved = localStorage.getItem('gameState');
      expect(saved).toBeTruthy();
      
      const parsed = JSON.parse(saved!);
      expect(parsed.score).toBe(1500);
      expect(parsed.level).toBe(3);
    });
    
    it('should load game state', () => {
      const savedState = {
        score: 2000,
        level: 4,
        lives: 2,
        highScore: 5000
      };
      localStorage.setItem('gameState', JSON.stringify(savedState));
      
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.loadGameState();
      });
      
      expect(result.current.score).toBe(2000);
      expect(result.current.level).toBe(4);
      expect(result.current.lives).toBe(2);
    });
    
    it('should handle corrupted save data', () => {
      localStorage.setItem('gameState', 'invalid json');
      
      const { result } = renderHook(() => useGameStore());
      
      expect(() => {
        act(() => {
          result.current.loadGameState();
        });
      }).not.toThrow();
      
      // Should remain at defaults
      expect(result.current.score).toBe(0);
    });
  });
  
  describe('Subscriptions', () => {
    it('should notify subscribers on state change', () => {
      const listener = vi.fn();
      const unsubscribe = useGameStore.subscribe(listener);
      
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setScore(100);
      });
      
      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });
    
    it('should support selective subscriptions', () => {
      const scoreListener = vi.fn();
      
      const unsubscribe = useGameStore.subscribe(
        (state) => state.score,
        scoreListener
      );
      
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setLives(2); // Should not trigger
      });
      expect(scoreListener).not.toHaveBeenCalled();
      
      act(() => {
        result.current.setScore(200); // Should trigger
      });
      expect(scoreListener).toHaveBeenCalled();
      
      unsubscribe();
    });
  });
});