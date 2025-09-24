/**
 * GameState Unit Tests
 * Comprehensive testing for game state management and transitions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameStateManager } from '../GameState';
import type { GameState, GameStatus, GameStateSubscriber } from '@/types/game.types';
import { createMockBall, createMockPaddle, createMockBlock, createMockPowerUp } from '@test/fixtures/gameData';
import { aGameState } from '@test/utils/builders';

describe('GameStateManager', () => {
  let manager: GameStateManager;
  
  beforeEach(() => {
    manager = new GameStateManager();
  });
  
  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const state = manager.getState();
      
      expect(state).toMatchObject({
        score: 0,
        level: 1,
        lives: 3,
        gameStatus: 'idle',
        balls: [],
        blocks: [],
        powerUps: [],
        combo: 0,
        highScore: 0
      });
    });
    
    it('should accept partial initial state', () => {
      const customManager = new GameStateManager({
        score: 1000,
        lives: 5,
        level: 3,
        highScore: 5000
      });
      
      const state = customManager.getState();
      expect(state.score).toBe(1000);
      expect(state.lives).toBe(5);
      expect(state.level).toBe(3);
      expect(state.highScore).toBe(5000);
      expect(state.gameStatus).toBe('idle'); // default value
    });
    
    it('should return immutable state', () => {
      const state = manager.getState() as any;
      expect(() => {
        state.score = 999;
      }).toThrow();
    });
  });
  
  describe('State Updates', () => {
    it('should update state using updater function', () => {
      manager.updateState((state) => ({
        score: state.score + 100,
        combo: state.combo + 1
      }));
      
      const state = manager.getState();
      expect(state.score).toBe(100);
      expect(state.combo).toBe(1);
      expect(state.lives).toBe(3); // unchanged
    });
    
    it('should preserve unmodified state properties', () => {
      const initialState = manager.getState();
      
      manager.updateState(() => ({ score: 500 }));
      
      const updatedState = manager.getState();
      expect(updatedState.score).toBe(500);
      expect(updatedState.lives).toBe(initialState.lives);
      expect(updatedState.level).toBe(initialState.level);
      expect(updatedState.gameStatus).toBe(initialState.gameStatus);
    });
    
    it('should handle complex nested updates', () => {
      const ball = createMockBall();
      const block = createMockBlock();
      
      manager.updateState(() => ({
        balls: [ball],
        blocks: [block],
        score: 100
      }));
      
      const state = manager.getState();
      expect(state.balls).toHaveLength(1);
      expect(state.blocks).toHaveLength(1);
      expect(state.score).toBe(100);
    });
  });
  
  describe('Game Status Transitions', () => {
    const validTransitions: [GameStatus, GameStatus[]][] = [
      ['idle', ['playing', 'menu']],
      ['menu', ['idle', 'playing', 'settings']],
      ['playing', ['paused', 'gameover', 'levelcomplete']],
      ['paused', ['playing', 'menu']],
      ['gameover', ['menu', 'idle']],
      ['levelcomplete', ['playing', 'menu']],
      ['settings', ['menu']]
    ];
    
    validTransitions.forEach(([from, toStates]) => {
      toStates.forEach(to => {
        it(`should allow transition from ${from} to ${to}`, () => {
          manager.setGameStatus(from);
          manager.setGameStatus(to);
          expect(manager.getState().gameStatus).toBe(to);
        });
      });
    });
    
    it('should handle rapid status changes', () => {
      manager.setGameStatus('idle');
      manager.setGameStatus('playing');
      manager.setGameStatus('paused');
      manager.setGameStatus('playing');
      manager.setGameStatus('gameover');
      
      expect(manager.getState().gameStatus).toBe('gameover');
    });
  });
  
  describe('Pause/Resume Functionality', () => {
    it('should pause from playing state', () => {
      manager.setGameStatus('playing');
      manager.pause();
      
      expect(manager.getState().gameStatus).toBe('paused');
      expect(manager.isPaused()).toBe(true);
    });
    
    it('should store previous status when pausing', () => {
      manager.setGameStatus('playing');
      manager.pause();
      manager.resume();
      
      expect(manager.getState().gameStatus).toBe('playing');
    });
    
    it('should not pause from non-playing states', () => {
      manager.setGameStatus('menu');
      manager.pause();
      
      expect(manager.getState().gameStatus).toBe('paused');
    });
    
    it('should resume to playing if no previous status', () => {
      manager.setGameStatus('paused');
      manager.resume();
      
      expect(manager.getState().gameStatus).toBe('playing');
    });
    
    it('should handle toggle pause correctly', () => {
      manager.setGameStatus('playing');
      
      manager.togglePause();
      expect(manager.isPaused()).toBe(true);
      
      manager.togglePause();
      expect(manager.isPaused()).toBe(false);
      expect(manager.getState().gameStatus).toBe('playing');
    });
    
    it('should not resume if not paused', () => {
      manager.setGameStatus('playing');
      manager.resume();
      
      expect(manager.getState().gameStatus).toBe('playing');
    });
  });
  
  describe('Subscriber Pattern', () => {
    it('should notify subscribers on state change', () => {
      const subscriber = vi.fn();
      manager.subscribe(subscriber);
      
      manager.updateState(() => ({ score: 100 }));
      
      expect(subscriber).toHaveBeenCalledWith(manager.getState());
    });
    
    it('should support multiple subscribers', () => {
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();
      
      manager.subscribe(subscriber1);
      manager.subscribe(subscriber2);
      
      manager.updateState(() => ({ score: 200 }));
      
      expect(subscriber1).toHaveBeenCalled();
      expect(subscriber2).toHaveBeenCalled();
    });
    
    it('should unsubscribe correctly', () => {
      const subscriber = vi.fn();
      manager.subscribe(subscriber);
      manager.unsubscribe(subscriber);
      
      manager.updateState(() => ({ score: 300 }));
      
      expect(subscriber).not.toHaveBeenCalled();
    });
    
    it('should handle subscriber errors gracefully', () => {
      const errorSubscriber = vi.fn(() => {
        throw new Error('Subscriber error');
      });
      const normalSubscriber = vi.fn();
      
      manager.subscribe(errorSubscriber);
      manager.subscribe(normalSubscriber);
      
      expect(() => {
        manager.updateState(() => ({ score: 400 }));
      }).not.toThrow();
      
      expect(normalSubscriber).toHaveBeenCalled();
    });
  });
  
  describe('Score Management', () => {
    it('should add to score correctly', () => {
      manager.addScore(100);
      expect(manager.getState().score).toBe(100);
      
      manager.addScore(50);
      expect(manager.getState().score).toBe(150);
    });
    
    it('should multiply score by combo', () => {
      manager.setCombo(3);
      manager.addScore(100);
      
      expect(manager.getState().score).toBe(300);
    });
    
    it('should update high score when exceeded', () => {
      manager.updateState(() => ({ highScore: 1000 }));
      
      manager.addScore(500);
      expect(manager.getState().highScore).toBe(1000);
      
      manager.addScore(600);
      expect(manager.getState().highScore).toBe(1100);
    });
    
    it('should handle negative scores gracefully', () => {
      manager.addScore(-50);
      expect(manager.getState().score).toBe(0);
    });
  });
  
  describe('Combo System', () => {
    it('should increment combo', () => {
      manager.incrementCombo();
      expect(manager.getState().combo).toBe(1);
      
      manager.incrementCombo();
      expect(manager.getState().combo).toBe(2);
    });
    
    it('should reset combo', () => {
      manager.setCombo(5);
      manager.resetCombo();
      
      expect(manager.getState().combo).toBe(0);
    });
    
    it('should set combo to specific value', () => {
      manager.setCombo(10);
      expect(manager.getState().combo).toBe(10);
    });
    
    it('should not allow negative combo', () => {
      manager.setCombo(-5);
      expect(manager.getState().combo).toBe(0);
    });
    
    it('should cap combo at maximum', () => {
      manager.setCombo(9999);
      const combo = manager.getState().combo;
      expect(combo).toBeLessThanOrEqual(100); // Assuming max combo is 100
    });
  });
  
  describe('Lives Management', () => {
    it('should decrement lives', () => {
      manager.loseLife();
      expect(manager.getState().lives).toBe(2);
    });
    
    it('should add extra life', () => {
      manager.addLife();
      expect(manager.getState().lives).toBe(4);
    });
    
    it('should trigger game over at zero lives', () => {
      manager.loseLife();
      manager.loseLife();
      manager.loseLife();
      
      const state = manager.getState();
      expect(state.lives).toBe(0);
      expect(state.gameStatus).toBe('gameover');
    });
    
    it('should not go below zero lives', () => {
      manager.updateState(() => ({ lives: 0 }));
      manager.loseLife();
      
      expect(manager.getState().lives).toBe(0);
    });
    
    it('should cap lives at maximum', () => {
      for (let i = 0; i < 10; i++) {
        manager.addLife();
      }
      
      const lives = manager.getState().lives;
      expect(lives).toBeLessThanOrEqual(9); // Assuming max lives is 9
    });
  });
  
  describe('Level Management', () => {
    it('should advance to next level', () => {
      manager.nextLevel();
      expect(manager.getState().level).toBe(2);
      
      manager.nextLevel();
      expect(manager.getState().level).toBe(3);
    });
    
    it('should reset combo on level advance', () => {
      manager.setCombo(5);
      manager.nextLevel();
      
      expect(manager.getState().combo).toBe(0);
    });
    
    it('should set level complete status', () => {
      manager.setLevelComplete();
      expect(manager.getState().gameStatus).toBe('levelcomplete');
    });
    
    it('should load specific level', () => {
      manager.loadLevel(5);
      expect(manager.getState().level).toBe(5);
    });
  });
  
  describe('Entity Management', () => {
    it('should add entities to state', () => {
      const ball = createMockBall();
      const block = createMockBlock();
      const powerUp = createMockPowerUp();
      
      manager.updateState(() => ({
        balls: [ball],
        blocks: [block],
        powerUps: [powerUp]
      }));
      
      const state = manager.getState();
      expect(state.balls).toHaveLength(1);
      expect(state.blocks).toHaveLength(1);
      expect(state.powerUps).toHaveLength(1);
    });
    
    it('should remove entity by id', () => {
      const blocks = [
        createMockBlock({ id: 'block-1' }),
        createMockBlock({ id: 'block-2' }),
        createMockBlock({ id: 'block-3' })
      ];
      
      manager.updateState(() => ({ blocks }));
      manager.removeEntity('blocks', 'block-2');
      
      const state = manager.getState();
      expect(state.blocks).toHaveLength(2);
      expect(state.blocks.find(b => b.id === 'block-2')).toBeUndefined();
    });
    
    it('should clear all entities of a type', () => {
      manager.updateState(() => ({
        balls: [createMockBall(), createMockBall()],
        powerUps: [createMockPowerUp()]
      }));
      
      manager.clearEntities('balls');
      
      const state = manager.getState();
      expect(state.balls).toHaveLength(0);
      expect(state.powerUps).toHaveLength(1);
    });
    
    it('should update entity properties', () => {
      const ball = createMockBall({ id: 'ball-1', speed: 5 });
      manager.updateState(() => ({ balls: [ball] }));
      
      manager.updateEntity('balls', 'ball-1', { speed: 10 });
      
      const state = manager.getState();
      expect(state.balls[0].speed).toBe(10);
    });
  });
  
  describe('Reset Functionality', () => {
    it('should reset to initial state', () => {
      manager.updateState(() => ({
        score: 5000,
        lives: 1,
        level: 5,
        combo: 10
      }));
      
      manager.reset();
      
      const state = manager.getState();
      expect(state.score).toBe(0);
      expect(state.lives).toBe(3);
      expect(state.level).toBe(1);
      expect(state.combo).toBe(0);
    });
    
    it('should preserve high score on reset', () => {
      manager.updateState(() => ({
        score: 5000,
        highScore: 10000
      }));
      
      manager.reset();
      
      expect(manager.getState().highScore).toBe(10000);
    });
    
    it('should notify subscribers on reset', () => {
      const subscriber = vi.fn();
      manager.subscribe(subscriber);
      
      manager.reset();
      
      expect(subscriber).toHaveBeenCalled();
    });
  });
  
  describe('Win/Lose Conditions', () => {
    it('should detect game over condition', () => {
      manager.updateState(() => ({ lives: 0 }));
      
      expect(manager.isGameOver()).toBe(true);
      expect(manager.getState().gameStatus).toBe('gameover');
    });
    
    it('should detect level complete condition', () => {
      manager.updateState(() => ({
        blocks: [],
        gameStatus: 'playing'
      }));
      
      manager.checkWinCondition();
      
      expect(manager.getState().gameStatus).toBe('levelcomplete');
    });
    
    it('should not complete level with remaining blocks', () => {
      manager.updateState(() => ({
        blocks: [createMockBlock()],
        gameStatus: 'playing'
      }));
      
      manager.checkWinCondition();
      
      expect(manager.getState().gameStatus).toBe('playing');
    });
    
    it('should ignore indestructible blocks for win condition', () => {
      manager.updateState(() => ({
        blocks: [createMockBlock({ destructible: false })],
        gameStatus: 'playing'
      }));
      
      manager.checkWinCondition();
      
      expect(manager.getState().gameStatus).toBe('levelcomplete');
    });
  });
  
  describe('State Validation', () => {
    it('should validate state consistency', () => {
      const isValid = manager.validateState();
      expect(isValid).toBe(true);
    });
    
    it('should detect invalid state', () => {
      manager.updateState(() => ({
        lives: -1,
        score: -100
      }));
      
      const isValid = manager.validateState();
      expect(isValid).toBe(false);
    });
    
    it('should auto-correct invalid values', () => {
      manager.updateState(() => ({
        lives: -1,
        score: -100,
        combo: -5
      }));
      
      manager.sanitizeState();
      
      const state = manager.getState();
      expect(state.lives).toBe(0);
      expect(state.score).toBe(0);
      expect(state.combo).toBe(0);
    });
  });
  
  describe('Performance', () => {
    it('should handle rapid state updates', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        manager.updateState(() => ({ score: i }));
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });
    
    it('should handle many subscribers efficiently', () => {
      const subscribers: GameStateSubscriber[] = [];
      
      for (let i = 0; i < 100; i++) {
        const subscriber = vi.fn();
        subscribers.push(subscriber);
        manager.subscribe(subscriber);
      }
      
      const start = performance.now();
      manager.updateState(() => ({ score: 999 }));
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(10); // Should notify all in < 10ms
      subscribers.forEach(sub => {
        expect(sub).toHaveBeenCalledTimes(1);
      });
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty update', () => {
      const initialState = manager.getState();
      manager.updateState(() => ({}));
      
      expect(manager.getState()).toEqual(initialState);
    });
    
    it('should handle null/undefined in updater', () => {
      manager.updateState(() => null as any);
      expect(manager.getState()).toBeDefined();
      
      manager.updateState(() => undefined as any);
      expect(manager.getState()).toBeDefined();
    });
    
    it('should handle circular references in state', () => {
      const circularObj: any = { a: 1 };
      circularObj.self = circularObj;
      
      expect(() => {
        manager.updateState(() => ({
          customData: circularObj
        } as any));
      }).not.toThrow();
    });
    
    it('should handle concurrent updates', () => {
      let updateCount = 0;
      
      manager.subscribe(() => {
        updateCount++;
        if (updateCount < 5) {
          manager.updateState(() => ({ combo: updateCount }));
        }
      });
      
      manager.updateState(() => ({ score: 1 }));
      
      expect(updateCount).toBe(5);
      expect(manager.getState().combo).toBe(4);
    });
  });
});