import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameStateManager } from "./GameState";
import type { GameState, GameStateSubscriber } from "../../types/game.types";

describe("GameStateManager", () => {
  let manager: GameStateManager;

  beforeEach(() => {
    manager = new GameStateManager();
  });

  describe("initialization", () => {
    it("should initialize with default state", () => {
      const state = manager.getState();
      expect(state.score).toBe(0);
      expect(state.level).toBe(1);
      expect(state.lives).toBe(3);
      expect(state.gameStatus).toBe("idle");
      expect(state.balls).toEqual([]);
      expect(state.blocks).toEqual([]);
      expect(state.powerUps).toEqual([]);
      expect(state.combo).toBe(0);
      expect(state.highScore).toBe(0);
    });

    it("should accept partial initial state", () => {
      const customManager = new GameStateManager({
        score: 100,
        lives: 5,
        level: 2,
      });
      const state = customManager.getState();
      expect(state.score).toBe(100);
      expect(state.lives).toBe(5);
      expect(state.level).toBe(2);
      expect(state.gameStatus).toBe("idle"); // default value
    });
  });

  describe("pause functionality", () => {
    it("should pause the game from playing state", () => {
      manager.setGameStatus("playing");
      manager.pause();
      
      const state = manager.getState();
      expect(state.gameStatus).toBe("paused");
    });

    it("should store previous game status when pausing", () => {
      manager.setGameStatus("playing");
      manager.pause();
      
      // Resume should restore previous status
      manager.resume();
      const state = manager.getState();
      expect(state.gameStatus).toBe("playing");
    });

    it("should resume to playing state when no previous status", () => {
      manager.setGameStatus("paused");
      manager.resume();
      
      const state = manager.getState();
      expect(state.gameStatus).toBe("playing");
    });

    it("should not change status when pausing already paused game", () => {
      manager.setGameStatus("playing");
      manager.pause();
      manager.pause(); // Second pause should not change anything
      
      const state = manager.getState();
      expect(state.gameStatus).toBe("paused");
      
      // Resume should still work
      manager.resume();
      const resumedState = manager.getState();
      expect(resumedState.gameStatus).toBe("playing");
    });

    it("should correctly report pause status", () => {
      expect(manager.isPaused()).toBe(false);
      
      manager.pause();
      expect(manager.isPaused()).toBe(true);
      
      manager.resume();
      expect(manager.isPaused()).toBe(false);
    });

    it("should toggle pause state correctly", () => {
      manager.setGameStatus("playing");
      
      manager.togglePause();
      expect(manager.isPaused()).toBe(true);
      expect(manager.getState().gameStatus).toBe("paused");
      
      manager.togglePause();
      expect(manager.isPaused()).toBe(false);
      expect(manager.getState().gameStatus).toBe("playing");
    });

    it("should handle pause from different game statuses", () => {
      // Test pausing from "idle"
      manager.setGameStatus("idle");
      manager.pause();
      expect(manager.getState().gameStatus).toBe("paused");
      
      manager.resume();
      expect(manager.getState().gameStatus).toBe("idle");
      
      // Test pausing from "victory"
      manager.setGameStatus("victory");
      manager.pause();
      expect(manager.getState().gameStatus).toBe("paused");
      
      manager.resume();
      expect(manager.getState().gameStatus).toBe("victory");
    });

    it("should notify subscribers when pause state changes", () => {
      const subscriber = vi.fn();
      manager.subscribe(subscriber);
      
      // Set to playing state first
      manager.setGameStatus("playing");
      vi.clearAllMocks();
      
      manager.pause();
      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({ gameStatus: "paused" })
      );
      
      vi.clearAllMocks();
      
      manager.resume();
      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({ gameStatus: "playing" })
      );
    });
  });

  describe("state immutability", () => {
    it("should return immutable state", () => {
      const state = manager.getState();
      expect(() => {
        (state as unknown).score = 999;
      }).toThrow();
    });

    it("should not modify state directly", () => {
      const state1 = manager.getState();
      manager.addScore(100);
      const state2 = manager.getState();
      expect(state1).not.toBe(state2);
      expect(state1.score).toBe(0);
      expect(state2.score).toBe(100);
    });
  });

  describe("state updates", () => {
    it("should update game status", () => {
      manager.setGameStatus("playing");
      expect(manager.getState().gameStatus).toBe("playing");

      manager.setGameStatus("paused");
      expect(manager.getState().gameStatus).toBe("paused");
    });

    it("should add score with combo multiplier", () => {
      manager.addScore(100);
      expect(manager.getState().score).toBe(100);

      manager.incrementCombo();
      manager.incrementCombo();
      manager.addScore(100); // 100 * 2 combo = 200
      expect(manager.getState().score).toBe(300);
      expect(manager.getState().combo).toBe(2);
    });

    it("should update high score", () => {
      manager.addScore(100);
      expect(manager.getState().highScore).toBe(100);

      manager.addScore(50);
      expect(manager.getState().highScore).toBe(150);

      manager.reset();
      manager.addScore(50);
      expect(manager.getState().highScore).toBe(50); // Reset should reset highScore
    });

    it("should manage combo counter", () => {
      expect(manager.getState().combo).toBe(0);

      manager.incrementCombo();
      manager.incrementCombo();
      expect(manager.getState().combo).toBe(2);

      manager.resetCombo();
      expect(manager.getState().combo).toBe(0);
    });

    it("should update lives", () => {
      manager.updateLives(-1);
      expect(manager.getState().lives).toBe(2);

      manager.updateLives(2);
      expect(manager.getState().lives).toBe(4);

      manager.updateLives(-10);
      expect(manager.getState().lives).toBe(0); // Should not go below 0
    });

    it("should advance to next level", () => {
      manager.incrementCombo();
      manager.incrementCombo();
      expect(manager.getState().combo).toBe(2);

      manager.nextLevel();
      expect(manager.getState().level).toBe(2);
      expect(manager.getState().combo).toBe(0); // Combo should reset
    });

    it("should update entities", () => {
      const balls = [
        { id: "ball1", position: { x: 100, y: 100 }, active: true },
      ];
      const blocks = [
        { id: "block1", position: { x: 50, y: 50 }, active: true },
        { id: "block2", position: { x: 100, y: 50 }, active: true },
      ];

      manager.updateEntities({ balls, blocks });

      const state = manager.getState();
      expect(state.balls).toEqual(balls);
      expect(state.blocks).toEqual(blocks);
      expect(state.powerUps).toEqual([]); // Unchanged
    });
  });

  describe("subscription system", () => {
    it("should subscribe and notify subscribers", () => {
      const subscriber = vi.fn();
      manager.subscribe(subscriber);

      manager.addScore(100);
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 100,
        }),
      );
    });

    it("should handle multiple subscribers", () => {
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();

      manager.subscribe(subscriber1);
      manager.subscribe(subscriber2);

      manager.setGameStatus("playing");

      expect(subscriber1).toHaveBeenCalledTimes(1);
      expect(subscriber2).toHaveBeenCalledTimes(1);
      expect(manager.getSubscriberCount()).toBe(2);
    });

    it("should unsubscribe correctly", () => {
      const subscriber = vi.fn();
      const unsubscribe = manager.subscribe(subscriber);

      manager.addScore(100);
      expect(subscriber).toHaveBeenCalledTimes(1);

      unsubscribe();
      manager.addScore(100);
      expect(subscriber).toHaveBeenCalledTimes(1); // Not called again
      expect(manager.getSubscriberCount()).toBe(0);
    });

    it("should handle subscriber errors gracefully", () => {
      const errorSubscriber = vi.fn(() => {
        throw new Error("Subscriber error");
      });
      const normalSubscriber = vi.fn();

      manager.subscribe(errorSubscriber);
      manager.subscribe(normalSubscriber);

      // Should not throw and continue notifying other subscribers
      expect(() => manager.addScore(100)).not.toThrow();
      expect(normalSubscriber).toHaveBeenCalled();
    });

    it("should clear all subscribers", () => {
      manager.subscribe(vi.fn());
      manager.subscribe(vi.fn());
      manager.subscribe(vi.fn());

      expect(manager.getSubscriberCount()).toBe(3);

      manager.clearSubscribers();
      expect(manager.getSubscriberCount()).toBe(0);
    });
  });

  describe("reset functionality", () => {
    it("should reset to initial state", () => {
      manager.addScore(500);
      manager.updateLives(-1);
      manager.nextLevel();
      manager.setGameStatus("playing");

      manager.reset();

      const state = manager.getState();
      expect(state.score).toBe(0);
      expect(state.level).toBe(1);
      expect(state.lives).toBe(3);
      expect(state.gameStatus).toBe("idle");
    });

    it("should notify subscribers on reset", () => {
      const subscriber = vi.fn();
      manager.subscribe(subscriber);

      manager.reset();
      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 0,
          level: 1,
          lives: 3,
          gameStatus: "idle",
        }),
      );
    });
  });
});
