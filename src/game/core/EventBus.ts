/**
 * Type-safe Event Bus implementation for game events
 * Provides pub/sub pattern with automatic cleanup
 */

// Event type definitions
export enum GameEventType {
  // Game state events
  GAME_START = "GAME_START",
  GAME_PAUSE = "GAME_PAUSE",
  GAME_RESUME = "GAME_RESUME",
  GAME_OVER = "GAME_OVER",
  LEVEL_COMPLETE = "LEVEL_COMPLETE",

  // Game mechanics events
  SCORE_UPDATE = "SCORE_UPDATE",
  LIVES_UPDATE = "LIVES_UPDATE",
  COMBO_UPDATE = "COMBO_UPDATE",

  // Entity events
  BALL_LAUNCHED = "BALL_LAUNCHED",
  BLOCK_DESTROYED = "BLOCK_DESTROYED",
  POWERUP_COLLECTED = "POWERUP_COLLECTED",

  // Collision events
  BALL_PADDLE_COLLISION = "BALL_PADDLE_COLLISION",
  BALL_WALL_COLLISION = "BALL_WALL_COLLISION",
  BALL_BLOCK_COLLISION = "BALL_BLOCK_COLLISION",

  // UI events
  UI_STATE_CHANGE = "UI_STATE_CHANGE",
  THEME_CHANGE = "THEME_CHANGE",
  VOLUME_CHANGE = "VOLUME_CHANGE",
}

// Event payload interfaces
export interface GameEventPayloads {
  [GameEventType.GAME_START]: void;
  [GameEventType.GAME_PAUSE]: void;
  [GameEventType.GAME_RESUME]: void;
  [GameEventType.GAME_OVER]: { score: number; level: number };
  [GameEventType.LEVEL_COMPLETE]: { level: number; score: number };

  [GameEventType.SCORE_UPDATE]: { score: number; delta: number };
  [GameEventType.LIVES_UPDATE]: { lives: number; delta: number };
  [GameEventType.COMBO_UPDATE]: { combo: number };

  [GameEventType.BALL_LAUNCHED]: {
    id: string;
    velocity: { dx: number; dy: number };
  };
  [GameEventType.BLOCK_DESTROYED]: {
    id: string;
    points: number;
    position: { x: number; y: number };
  };
  [GameEventType.POWERUP_COLLECTED]: { type: string; id: string };

  [GameEventType.BALL_PADDLE_COLLISION]: {
    ballId: string;
    paddlePosition: number;
  };
  [GameEventType.BALL_WALL_COLLISION]: {
    ballId: string;
    wall: "left" | "right" | "top";
  };
  [GameEventType.BALL_BLOCK_COLLISION]: { ballId: string; blockId: string };

  [GameEventType.UI_STATE_CHANGE]: { screen: string; previousScreen: string };
  [GameEventType.THEME_CHANGE]: { theme: string };
  [GameEventType.VOLUME_CHANGE]: { volume: number };
}

// Event listener type
export type EventListener<T extends GameEventType> = (
  payload: GameEventPayloads[T],
) => void;

// Subscription handle for cleanup
export interface EventSubscription {
  unsubscribe: () => void;
}

/**
 * EventBus class for managing game events
 */
export class EventBus {
  private listeners: Map<GameEventType, Set<EventListener<any>>> = new Map();
  private eventHistory: Array<{
    type: GameEventType;
    payload: any;
    timestamp: number;
  }> = [];
  private maxHistorySize = 100;
  private isEnabled = true;

  constructor(options?: { maxHistorySize?: number; recordHistory?: boolean }) {
    if (options?.maxHistorySize) {
      this.maxHistorySize = options.maxHistorySize;
    }
    if (options?.recordHistory === false) {
      this.maxHistorySize = 0;
    }
  }

  /**
   * Subscribe to an event
   */
  on<T extends GameEventType>(
    eventType: T,
    listener: EventListener<T>,
  ): EventSubscription {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const listeners = this.listeners.get(eventType)!;
    listeners.add(listener);

    // Return subscription handle
    return {
      unsubscribe: () => this.off(eventType, listener),
    };
  }

  /**
   * Subscribe to an event (once only)
   */
  once<T extends GameEventType>(
    eventType: T,
    listener: EventListener<T>,
  ): EventSubscription {
    const wrappedListener: EventListener<T> = (payload) => {
      listener(payload);
      this.off(eventType, wrappedListener);
    };

    return this.on(eventType, wrappedListener);
  }

  /**
   * Unsubscribe from an event
   */
  off<T extends GameEventType>(eventType: T, listener: EventListener<T>): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * Emit an event
   */
  emit<T extends GameEventType>(
    eventType: T,
    payload: GameEventPayloads[T],
  ): void {
    if (!this.isEnabled) return;

    // Record in history
    if (this.maxHistorySize > 0) {
      this.eventHistory.push({
        type: eventType,
        payload,
        timestamp: Date.now(),
      });

      // Trim history if needed
      if (this.eventHistory.length > this.maxHistorySize) {
        this.eventHistory.shift();
      }
    }

    // Notify listeners
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for a specific event
   */
  removeAllListeners(eventType?: GameEventType): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(eventType: GameEventType): number {
    const listeners = this.listeners.get(eventType);
    return listeners ? listeners.size : 0;
  }

  /**
   * Get total listener count
   */
  getTotalListenerCount(): number {
    let total = 0;
    this.listeners.forEach((listeners) => {
      total += listeners.size;
    });
    return total;
  }

  /**
   * Get event history
   */
  getEventHistory(): ReadonlyArray<{
    type: GameEventType;
    payload: any;
    timestamp: number;
  }> {
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Enable/disable event bus
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if event bus is enabled
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Reset the event bus
   */
  reset(): void {
    this.removeAllListeners();
    this.clearHistory();
    this.isEnabled = true;
  }
}

// Export singleton instance
export const eventBus = new EventBus({ recordHistory: true });
