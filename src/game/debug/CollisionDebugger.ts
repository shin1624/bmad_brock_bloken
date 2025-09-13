/**
 * CollisionDebugger for Story 2.4
 * Basic debug system for collision detection visualization
 */
import { EventBus } from "../core/EventBus";

export class CollisionDebugger {
  private enabled = false;

  constructor(private eventBus: EventBus) {}

  isEnabled(): boolean {
    return this.enabled;
  }

  toggle(): void {
    this.enabled = !this.enabled;
  }
}
