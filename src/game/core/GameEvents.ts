export type GameEventType = 
  | 'score:changed'
  | 'score:milestone'
  | 'score:highscore'
  | 'combo:changed'
  | 'level:start'
  | 'level:complete'
  | 'level:progress'
  | 'game:complete'
  | 'game:win'
  | 'game:lose'
  | 'game:initialized'
  | 'game:pause'
  | 'game:resume'
  | 'input:move'
  | 'input:action'
  | 'powerup:collected'
  | 'assets:progress';

export interface GameEvent {
  type: GameEventType;
  [key: string]: any;
}

type EventListener = (event: any) => void;

export class GameEvents {
  private listeners: Map<string, Set<EventListener>> = new Map();

  on(event: string, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: EventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });

    // Handle wildcard listeners
    this.listeners.get('*')?.forEach(listener => {
      try {
        listener({ ...data, type: event });
      } catch (error) {
        console.error(`Error in wildcard listener:`, error);
      }
    });
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.size || 0;
  }
}