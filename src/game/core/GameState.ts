import type {
  GameState,
  GameStateSubscriber,
  GameStatus,
  EntityState,
} from "../../types/game.types";

/**
 * Game state management system using Observer pattern
 * Handles game-specific state independent from UI state
 */
export class GameStateManager {
  private state: GameState;
  private subscribers: Set<GameStateSubscriber> = new Set();
  private readonly initialState: GameState;

  constructor(initialState?: Partial<GameState>) {
    this.initialState = {
      score: 0,
      level: 1,
      lives: 3,
      gameStatus: "idle",
      balls: [],
      blocks: [],
      powerUps: [],
      combo: 0,
      highScore: 0,
      ...initialState,
    };

    this.state = { ...this.initialState };
  }

  /**
   * Get current game state (immutable)
   */
  getState(): Readonly<GameState> {
    return Object.freeze({ ...this.state });
  }

  /**
   * Update state using updater function
   * Ensures immutability and notifies subscribers
   */
  updateState(updater: (state: GameState) => Partial<GameState>): void {
    const updates = updater(this.getState());
    this.state = {
      ...this.state,
      ...updates,
    };
    this.notifySubscribers();
  }

  /**
   * Set game status
   */
  setGameStatus(status: GameStatus): void {
    this.updateState(() => ({ gameStatus: status }));
  }

  /**
   * Update score with combo multiplier
   */
  addScore(points: number): void {
    this.updateState((state) => {
      const multipliedPoints = points * Math.max(1, state.combo);
      const newScore = state.score + multipliedPoints;
      return {
        score: newScore,
        highScore: Math.max(newScore, state.highScore),
      };
    });
  }

  /**
   * Increment combo counter
   */
  incrementCombo(): void {
    this.updateState((state) => ({ combo: state.combo + 1 }));
  }

  /**
   * Reset combo counter
   */
  resetCombo(): void {
    this.updateState(() => ({ combo: 0 }));
  }

  /**
   * Update lives count
   */
  updateLives(delta: number): void {
    this.updateState((state) => ({
      lives: Math.max(0, state.lives + delta),
    }));
  }

  /**
   * Advance to next level
   */
  nextLevel(): void {
    this.updateState((state) => ({
      level: state.level + 1,
      combo: 0, // Reset combo on level change
    }));
  }

  /**
   * Update entity states (balls, blocks, powerUps)
   */
  updateEntities(entities: {
    balls?: EntityState[];
    blocks?: EntityState[];
    powerUps?: EntityState[];
  }): void {
    this.updateState(() => entities);
  }

  /**
   * Reset game state to initial values
   */
  reset(): void {
    this.state = { ...this.initialState };
    this.notifySubscribers();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(subscriber: GameStateSubscriber): () => void {
    this.subscribers.add(subscriber);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscriber);
    };
  }

  /**
   * Unsubscribe from state changes
   */
  unsubscribe(subscriber: GameStateSubscriber): void {
    this.subscribers.delete(subscriber);
  }

  /**
   * Notify all subscribers of state changes
   */
  private notifySubscribers(): void {
    const currentState = this.getState();
    this.subscribers.forEach((subscriber) => {
      try {
        subscriber(currentState);
      } catch (error) {
        console.error("Error in GameState subscriber:", error);
      }
    });
  }

  /**
   * Get subscriber count (for debugging/testing)
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Clear all subscribers (for cleanup)
   */
  clearSubscribers(): void {
    this.subscribers.clear();
  }
}

// Export singleton instance for global access
export const gameStateManager = new GameStateManager();
