import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventBus, GameEventType, eventBus } from "./EventBus";

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus({ recordHistory: true });
  });

  describe("basic event handling", () => {
    it("should emit and receive events", () => {
      const listener = vi.fn();
      bus.on(GameEventType.GAME_START, listener);

      bus.emit(GameEventType.GAME_START, undefined);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should pass payload to listeners", () => {
      const listener = vi.fn();
      const payload = { score: 100, level: 2 };

      bus.on(GameEventType.GAME_OVER, listener);
      bus.emit(GameEventType.GAME_OVER, payload);

      expect(listener).toHaveBeenCalledWith(payload);
    });

    it("should handle multiple listeners for same event", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      bus.on(GameEventType.SCORE_UPDATE, listener1);
      bus.on(GameEventType.SCORE_UPDATE, listener2);

      const payload = { score: 50, delta: 10 };
      bus.emit(GameEventType.SCORE_UPDATE, payload);

      expect(listener1).toHaveBeenCalledWith(payload);
      expect(listener2).toHaveBeenCalledWith(payload);
    });

    it("should not call listeners for different events", () => {
      const listener = vi.fn();

      bus.on(GameEventType.GAME_PAUSE, listener);
      bus.emit(GameEventType.GAME_RESUME, undefined);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("subscription management", () => {
    it("should unsubscribe via returned handle", () => {
      const listener = vi.fn();
      const subscription = bus.on(GameEventType.BALL_LAUNCHED, listener);

      const payload = { id: "ball1", velocity: { dx: 1, dy: -1 } };
      bus.emit(GameEventType.BALL_LAUNCHED, payload);
      expect(listener).toHaveBeenCalledTimes(1);

      subscription.unsubscribe();
      bus.emit(GameEventType.BALL_LAUNCHED, payload);
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it("should unsubscribe via off method", () => {
      const listener = vi.fn();
      bus.on(GameEventType.BLOCK_DESTROYED, listener);

      const payload = { id: "block1", points: 10, position: { x: 100, y: 50 } };
      bus.emit(GameEventType.BLOCK_DESTROYED, payload);
      expect(listener).toHaveBeenCalledTimes(1);

      bus.off(GameEventType.BLOCK_DESTROYED, listener);
      bus.emit(GameEventType.BLOCK_DESTROYED, payload);
      expect(listener).toHaveBeenCalledTimes(1); // Still 1
    });

    it("should handle once subscriptions", () => {
      const listener = vi.fn();
      bus.once(GameEventType.LEVEL_COMPLETE, listener);

      const payload = { level: 1, score: 1000 };
      bus.emit(GameEventType.LEVEL_COMPLETE, payload);
      bus.emit(GameEventType.LEVEL_COMPLETE, payload);
      bus.emit(GameEventType.LEVEL_COMPLETE, payload);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(payload);
    });

    it("should remove all listeners for specific event", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      bus.on(GameEventType.COMBO_UPDATE, listener1);
      bus.on(GameEventType.COMBO_UPDATE, listener2);
      bus.on(GameEventType.LIVES_UPDATE, listener1);

      bus.removeAllListeners(GameEventType.COMBO_UPDATE);

      bus.emit(GameEventType.COMBO_UPDATE, { combo: 5 });
      bus.emit(GameEventType.LIVES_UPDATE, { lives: 2, delta: -1 });

      expect(listener1).toHaveBeenCalledTimes(1); // Only LIVES_UPDATE
      expect(listener2).toHaveBeenCalledTimes(0);
    });

    it("should remove all listeners when no event specified", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      bus.on(GameEventType.UI_STATE_CHANGE, listener1);
      bus.on(GameEventType.THEME_CHANGE, listener2);

      bus.removeAllListeners();

      bus.emit(GameEventType.UI_STATE_CHANGE, {
        screen: "game",
        previousScreen: "menu",
      });
      bus.emit(GameEventType.THEME_CHANGE, { theme: "dark" });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe("listener count", () => {
    it("should return correct listener count for event", () => {
      expect(bus.listenerCount(GameEventType.BALL_PADDLE_COLLISION)).toBe(0);

      const listener1 = vi.fn();
      const listener2 = vi.fn();

      bus.on(GameEventType.BALL_PADDLE_COLLISION, listener1);
      expect(bus.listenerCount(GameEventType.BALL_PADDLE_COLLISION)).toBe(1);

      bus.on(GameEventType.BALL_PADDLE_COLLISION, listener2);
      expect(bus.listenerCount(GameEventType.BALL_PADDLE_COLLISION)).toBe(2);

      bus.off(GameEventType.BALL_PADDLE_COLLISION, listener1);
      expect(bus.listenerCount(GameEventType.BALL_PADDLE_COLLISION)).toBe(1);
    });

    it("should return total listener count", () => {
      expect(bus.getTotalListenerCount()).toBe(0);

      bus.on(GameEventType.BALL_WALL_COLLISION, vi.fn());
      bus.on(GameEventType.BALL_WALL_COLLISION, vi.fn());
      bus.on(GameEventType.BALL_BLOCK_COLLISION, vi.fn());

      expect(bus.getTotalListenerCount()).toBe(3);
    });
  });

  describe("event history", () => {
    it("should record event history", () => {
      const payload1 = { type: "speed", id: "powerup1" };
      const payload2 = { volume: 0.5 };

      bus.emit(GameEventType.POWERUP_COLLECTED, payload1);
      bus.emit(GameEventType.VOLUME_CHANGE, payload2);

      const history = bus.getEventHistory();
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe(GameEventType.POWERUP_COLLECTED);
      expect(history[0].payload).toEqual(payload1);
      expect(history[1].type).toBe(GameEventType.VOLUME_CHANGE);
      expect(history[1].payload).toEqual(payload2);
    });

    it("should respect max history size", () => {
      const smallBus = new EventBus({ maxHistorySize: 3 });

      smallBus.emit(GameEventType.GAME_START, undefined);
      smallBus.emit(GameEventType.GAME_PAUSE, undefined);
      smallBus.emit(GameEventType.GAME_RESUME, undefined);
      smallBus.emit(GameEventType.GAME_OVER, { score: 100, level: 1 });

      const history = smallBus.getEventHistory();
      expect(history).toHaveLength(3);
      expect(history[0].type).toBe(GameEventType.GAME_PAUSE); // First one removed
    });

    it("should not record history when disabled", () => {
      const noBus = new EventBus({ recordHistory: false });

      noBus.emit(GameEventType.GAME_START, undefined);
      noBus.emit(GameEventType.GAME_PAUSE, undefined);

      const history = noBus.getEventHistory();
      expect(history).toHaveLength(0);
    });

    it("should clear history", () => {
      bus.emit(GameEventType.GAME_START, undefined);
      bus.emit(GameEventType.GAME_PAUSE, undefined);

      expect(bus.getEventHistory()).toHaveLength(2);

      bus.clearHistory();
      expect(bus.getEventHistory()).toHaveLength(0);
    });

    it("should include timestamp in history", () => {
      const beforeTime = Date.now();
      bus.emit(GameEventType.GAME_START, undefined);
      const afterTime = Date.now();

      const history = bus.getEventHistory();
      expect(history[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(history[0].timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("enable/disable", () => {
    it("should not emit events when disabled", () => {
      const listener = vi.fn();
      bus.on(GameEventType.GAME_START, listener);

      bus.setEnabled(false);
      bus.emit(GameEventType.GAME_START, undefined);

      expect(listener).not.toHaveBeenCalled();
    });

    it("should emit events when re-enabled", () => {
      const listener = vi.fn();
      bus.on(GameEventType.GAME_START, listener);

      bus.setEnabled(false);
      bus.emit(GameEventType.GAME_START, undefined);
      expect(listener).not.toHaveBeenCalled();

      bus.setEnabled(true);
      bus.emit(GameEventType.GAME_START, undefined);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should return enabled status", () => {
      expect(bus.getEnabled()).toBe(true);

      bus.setEnabled(false);
      expect(bus.getEnabled()).toBe(false);

      bus.setEnabled(true);
      expect(bus.getEnabled()).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should handle listener errors gracefully", () => {
      const errorListener = vi.fn(() => {
        throw new Error("Listener error");
      });
      const normalListener = vi.fn();

      bus.on(GameEventType.GAME_START, errorListener);
      bus.on(GameEventType.GAME_START, normalListener);

      // Should not throw
      expect(() => bus.emit(GameEventType.GAME_START, undefined)).not.toThrow();

      // Normal listener should still be called
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("should reset event bus to initial state", () => {
      const listener = vi.fn();

      bus.on(GameEventType.GAME_START, listener);
      bus.emit(GameEventType.GAME_PAUSE, undefined);
      bus.setEnabled(false);

      bus.reset();

      expect(bus.getTotalListenerCount()).toBe(0);
      expect(bus.getEventHistory()).toHaveLength(0);
      expect(bus.getEnabled()).toBe(true);

      // Listener should not be called after reset
      bus.emit(GameEventType.GAME_START, undefined);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("singleton instance", () => {
    it("should export singleton instance", () => {
      expect(eventBus).toBeInstanceOf(EventBus);

      // Should have history enabled by default
      eventBus.emit(GameEventType.GAME_START, undefined);
      expect(eventBus.getEventHistory().length).toBeGreaterThan(0);

      // Clean up for other tests
      eventBus.reset();
    });
  });
});
